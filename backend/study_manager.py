import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Literal

from azure.cosmos import exceptions


StudyGroup = Literal["control", "treatment"]


@dataclass(frozen=True)
class StudyProfileKeys:
    pre_test: str = "pre_test"
    post_test_1: str = "post_test_1"


class StudyManager:
    """Cosmos-backed study profile manager.

    Notes:
    - Uses the existing Cosmos container client passed in (singleton created elsewhere).
    - Stores one item per user with id `profile-{user_id}`.
    - Assumes the container partition key is compatible with `partition_key=user_id`.
      In this repo the chat history container uses `/userId`, so profiles include `userId`.
    """

    def __init__(self, container_client: Any):
        self.container_client = container_client
        self._keys = StudyProfileKeys()

    def _profile_id(self, user_id: str) -> str:
        return f"profile-{user_id}"

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _assign_group(self, user_id: str, username: Optional[str] = None) -> StudyGroup:
        candidate = username or user_id or ""

        # Prefer parsing numbers at the end of the username (e.g. aifast299 or aifast299@domain).
        # Fall back to any trailing digits.
        local_part = candidate.split("@", 1)[0]
        match = re.search(r"(\d+)$", local_part)
        if not match:
            match = re.search(r"(\d+)$", candidate)

        number = 0
        if match:
            try:
                number = int(match.group(1))
            except ValueError:
                number = 0

        return "control" if number < 300 else "treatment"

    async def _read_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            return await self.container_client.read_item(
                item=self._profile_id(user_id), partition_key=user_id
            )
        except exceptions.CosmosResourceNotFoundError:
            return None

    async def _upsert_profile_with_retry(self, profile: Dict[str, Any], attempts: int = 3) -> Dict[str, Any]:
        last_exc: Optional[Exception] = None
        for attempt in range(attempts):
            try:
                resp = await self.container_client.upsert_item(profile)
                return resp
            except exceptions.CosmosHttpResponseError as e:
                last_exc = e
                # 429 handling: respect retry-after header when present.
                if getattr(e, "status_code", None) == 429:
                    retry_after_ms = None
                    try:
                        retry_after_ms = int((getattr(e, "headers", {}) or {}).get("x-ms-retry-after-ms"))
                    except Exception:
                        retry_after_ms = None

                    sleep_s = (retry_after_ms / 1000.0) if retry_after_ms else (0.5 * (attempt + 1))
                    logging.warning("CosmosDB 429 throttled; retrying in %.2fs", sleep_s)
                    await asyncio.sleep(sleep_s)
                    continue

                diagnostics = getattr(e, "diagnostics", None)
                if diagnostics:
                    logging.error("CosmosDB error diagnostics: %s", diagnostics)
                raise

        raise last_exc or RuntimeError("Failed to upsert study profile")

    async def _delete_profile(self, user_id: str) -> bool:
        try:
            await self.container_client.delete_item(
                item=self._profile_id(user_id), partition_key=user_id
            )
            return True
        except exceptions.CosmosResourceNotFoundError:
            return False

    def _new_profile(self, user_id: str, username: Optional[str] = None) -> Dict[str, Any]:
        group = self._assign_group(user_id=user_id, username=username)
        now = self._now_iso()
        return {
            "id": self._profile_id(user_id),
            "type": "study_profile",
            "userId": user_id,  # extra field for existing container partition key patterns
            "group": group,
            "login_count": 0,
            "last_login": None,
            "created_at": now,
            "updated_at": now,
            "surveys": {
                self._keys.pre_test: False,
                self._keys.post_test_1: False,
            },
        }

    async def get_user_state(self, user_id: str, username: Optional[str] = None) -> Dict[str, Any]:
        """Fetch profile; if absent, create it with login_count=0."""
        profile = await self._read_profile(user_id)
        if profile:
            return profile

        profile = self._new_profile(user_id=user_id, username=username)
        return await self._upsert_profile_with_retry(profile)

    async def register_login(self, user_id: str, username: Optional[str] = None) -> Dict[str, Any]:
        """Increment login_count if last_login is older than 30 minutes."""
        profile = await self.get_user_state(user_id=user_id, username=username)

        last_login_str = profile.get("last_login")
        # For a brand-new profile, set last_login but keep login_count at 0.
        # This enables the frontend to gate the pre-test survey on login_count == 0.
        if not last_login_str:
            profile["last_login"] = self._now_iso()
            profile["updated_at"] = self._now_iso()
            return await self._upsert_profile_with_retry(profile)

        try:
            last_login = datetime.fromisoformat(last_login_str)
            if last_login.tzinfo is None:
                last_login = last_login.replace(tzinfo=timezone.utc)
        except Exception:
            last_login = datetime.min.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) - last_login > timedelta(minutes=30):
            profile["login_count"] = int(profile.get("login_count") or 0) + 1
            profile["last_login"] = self._now_iso()
            profile["updated_at"] = self._now_iso()
            profile = await self._upsert_profile_with_retry(profile)

        return profile

    async def set_survey_status(self, user_id: str, survey_key: str, completed: bool) -> Dict[str, Any]:
        profile = await self.get_user_state(user_id=user_id)
        surveys = profile.get("surveys") or {}
        surveys[survey_key] = bool(completed)
        profile["surveys"] = surveys
        profile["updated_at"] = self._now_iso()
        return await self._upsert_profile_with_retry(profile)

    async def debug_reset_user(self, user_id: str, username: Optional[str] = None, hard_delete: bool = True) -> Dict[str, Any]:
        """Reset the profile for development testing.

        If hard_delete is True, deletes the item (if present) then recreates a fresh profile.
        """
        if hard_delete:
            await self._delete_profile(user_id)
            profile = self._new_profile(user_id=user_id, username=username)
            return await self._upsert_profile_with_retry(profile)

        profile = self._new_profile(user_id=user_id, username=username)
        return await self._upsert_profile_with_retry(profile)

    async def debug_set_state(
        self,
        user_id: str,
        login_count: int,
        group: Optional[StudyGroup] = None,
        username: Optional[str] = None,
    ) -> Dict[str, Any]:
        profile = await self.get_user_state(user_id=user_id, username=username)

        profile["login_count"] = int(login_count)
        if group in ("control", "treatment"):
            profile["group"] = group
        elif group is None:
            # keep existing
            pass
        else:
            raise ValueError("group must be 'control' or 'treatment'")

        profile["updated_at"] = self._now_iso()
        return await self._upsert_profile_with_retry(profile)

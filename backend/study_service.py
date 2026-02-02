import logging
from datetime import datetime, timedelta
import azure.cosmos.exceptions as exceptions

class StudyService:
    def __init__(self, container_client):
        self.container_client = container_client

    async def get_or_update_user_status(self, user_id):
        doc_id = f"metadata-{user_id}"
        
        try:
            # Try to fetch existing document
            doc = await self.container_client.read_item(item=doc_id, partition_key=user_id)
            
            # Existing user logic
            # Check last login
            last_login_str = doc.get("lastLogin")
            should_increment = False
            
            if last_login_str:
                last_login = datetime.fromisoformat(last_login_str)
                # If last login was more than 30 minutes ago, count as new session
                if datetime.utcnow() - last_login > timedelta(minutes=30):
                    should_increment = True
            else:
                should_increment = True 
            
            # Always update lastLogin to now on access? Or only on new session?
            # Prompt says: "Increment loginCount only if lastLogin was > 30 mins ago. Update lastLogin."
            # Implicitly, if we don't increment, do we update lastLogin? likely yes, to keep session alive?
            # But the prompt says "Update lastLogin" in the context of the condition.
            # Let's assume we update lastLogin every time they "log in" (hit the endpoint), 
            # but only increment count if 30 mins elapsed.
            # Actually, usually "session" logic implies if active recently, don't increment.
            # I will only update the DB if changes are needed.
            
            updated = False
            if should_increment:
                doc["loginCount"] = doc.get("loginCount", 0) + 1
                doc["lastLogin"] = datetime.utcnow().isoformat()
                updated = True
            elif datetime.utcnow() - datetime.fromisoformat(doc.get("lastLogin")) > timedelta(minutes=5):
                 # Update lastLogin frequently to track activity? 
                 # The prompt says: "Increment loginCount only if lastLogin was > 30 mins ago. Update lastLogin."
                 # This phrasing suggests both happen together. If it's NOT > 30 mins, maybe allow them in without updating?
                 # Assume: "If > 30 mins: Increment Count, Update LastLogin. Else: Do nothing (same session)."
                 pass
            
            if updated:
                await self.container_client.upsert_item(doc)
            
            return doc

        except exceptions.CosmosResourceNotFoundError:
            # New User Logic
            treatment_group = "control"
            try:
                # Parse user_id "aifastXXX"
                # Robust parsing
                import re
                match = re.search(r'(\d+)$', user_id)
                if match:
                    number = int(match.group(1))
                    if number >= 300:
                        treatment_group = "treatment"
                    else:
                        treatment_group = "control"
            except Exception as e:
                logging.warning(f"Failed to parse user_id {user_id} for group assignment. Defaulting to control. Error: {e}")

            new_doc = {
                "id": doc_id,
                "userId": user_id, # Partition Key
                "type": "metadata",
                "treatmentGroup": treatment_group,
                "loginCount": 1,
                "lastLogin": datetime.utcnow().isoformat(),
                "surveys": {
                    "preTest": False,
                    "session1Post": False,
                    "session2Post": False
                }
            }
            
            await self.container_client.create_item(new_doc)
            return new_doc

    async def mark_survey_complete(self, user_id, survey_key):
         doc_id = f"metadata-{user_id}"
         try:
             doc = await self.container_client.read_item(item=doc_id, partition_key=user_id)
             if "surveys" not in doc:
                 doc["surveys"] = {}
             
             doc["surveys"][survey_key] = True
             
             await self.container_client.upsert_item(doc)
             return doc
         except exceptions.CosmosResourceNotFoundError:
             raise ValueError("User not found")

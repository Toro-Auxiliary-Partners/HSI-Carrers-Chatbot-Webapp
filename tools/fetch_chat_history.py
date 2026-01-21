import asyncio
import os
import sys
import json
from azure.identity.aio import DefaultAzureCredential

# Add project root to sys.path to import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.settings import app_settings
from backend.history.cosmosdbservice import CosmosConversationClient

async def fetch_history():
    # 1. Initialize Configuration
    if not app_settings.chat_history:
        print("Chat history is not configured in settings.")
        return

    print(f"Connecting to Cosmos DB: {app_settings.chat_history.account}")

    # 2. Authenticate
    credential = None
    if app_settings.chat_history.account_key:
        credential = app_settings.chat_history.account_key
    else:
        credential = DefaultAzureCredential()

    # 3. Initialize Client
    cosmos_endpoint = f"https://{app_settings.chat_history.account}.documents.azure.com:443/"
    client = CosmosConversationClient(
        cosmosdb_endpoint=cosmos_endpoint,
        credential=credential,
        database_name=app_settings.chat_history.database,
        container_name=app_settings.chat_history.conversations_container
    )
    
    success, msg = await client.ensure()
    if not success:
        print(f"Failed to connect: {msg}")
        return

    print("Connected successfully.")

    # 4. Fetch All Users
    print("Fetching all users...")
    query = "SELECT DISTINCT VALUE c.userId FROM c WHERE c.type = 'conversation'"
    users = []
    
    try:
        # Accessing private/internal container_client if possible, or we rely on the fact that python doesn't strictly enforce private.
        # The class has self.container_client
        items = client.container_client.query_items(
            query=query,
            enable_cross_partition_query=True
        )
        async for item in items:
            users.append(item)
    except Exception as e:
        print(f"Error fetching users: {e}")
        return

    print(f"Found {len(users)} users.")

    # 5. Fetch and Print History per User
    for user_id in users:
        print(f"\n=== History for User: {user_id} ===")
        conversations = await client.get_conversations(user_id, limit=None)
        if not conversations:
            print("  No conversations found.")
            continue

        for conv in conversations:
            print(f"  Conversation ID: {conv['id']}")
            print(f"  Title: {conv.get('title', 'N/A')}")
            print(f"  Created: {conv['createdAt']}")
            
            messages = await client.get_messages(user_id, conv['id'])
            if messages:
                print("    Messages:")
                for msg in messages:
                    role = msg.get('role', 'unknown')
                    content = msg.get('content', '')
                    print(f"      [{role}]: {content[:100]}..." if len(content) > 100 else f"      [{role}]: {content}")
            else:
                print("    (No messages)")
            print("-" * 40)

    # Clean up credential if it's an object
    if not app_settings.chat_history.account_key and hasattr(credential, 'close'):
        await credential.close()

if __name__ == "__main__":
    try:
        asyncio.run(fetch_history())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"An error occurred: {e}")

import asyncio
import os
from dotenv import load_dotenv
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential

# Load environment variables from .env file
load_dotenv()

# -------------------------------------------------------------------------
# CONFIGURATION
# -------------------------------------------------------------------------
# Retrieve settings from Environment Variables
ENDPOINT = os.environ.get("AZURE_COSMOSDB_ENDPOINT")
ACCOUNT = os.environ.get("AZURE_COSMOSDB_ACCOUNT")
if not ENDPOINT and ACCOUNT:
    ENDPOINT = f"https://{ACCOUNT}.documents.azure.com:443/"

KEY = os.environ.get("AZURE_COSMOSDB_KEY") or os.environ.get("AZURE_COSMOSDB_ACCOUNT_KEY")
DATABASE_NAME = os.environ.get("AZURE_COSMOSDB_DATABASE")
CONTAINER_NAME = os.environ.get("AZURE_COSMOSDB_CONVERSATIONS_CONTAINER")

async def main():
    # Validation
    if not ENDPOINT:
        print("Error: Could not determine Cosmos DB Endpoint.")
        print("Please set AZURE_COSMOSDB_ENDPOINT or AZURE_COSMOSDB_ACCOUNT in your .env file or environment variables.")
        return

    # Authentication (Key or Identity)
    if KEY:
        credential = KEY
    else:
        print("No Access Key found (AZURE_COSMOSDB_KEY or AZURE_COSMOSDB_ACCOUNT_KEY). Using DefaultAzureCredential (RBAC)...")
        credential = DefaultAzureCredential()
    
    print(f"Connecting to Cosmos DB: {ENDPOINT} ...")
    async with CosmosClient(ENDPOINT, credential) as client:
        database = client.get_database_client(DATABASE_NAME)
        container = database.get_container_client(CONTAINER_NAME)

        print("Fetching all conversations index (this may take a moment)...")
        
        # 1. Fetch ALL conversations (Cross-partition query)
        # We order by userId to make grouping easier if we were streaming, 
        # but we'll collect them to a dict here.
        query = "SELECT * FROM c WHERE c.type = 'conversation'"
        
        all_conversations = []
        try:
            async for item in container.query_items(query=query):
                all_conversations.append(item)
        except Exception as e:
            print(f"Error fetching conversations: {e}")
            return

        if not all_conversations:
            print("No chat history found in the database.")
            return

        # 2. Group by User ID
        # Structure: { "user_123": [convA, convB], "user_456": [convC] }
        users_map = {}
        for conv in all_conversations:
            uid = conv.get('userId', 'Unknown_User')
            if uid not in users_map:
                users_map[uid] = []
            users_map[uid].append(conv)

        print(f"\nFound {len(all_conversations)} conversations across {len(users_map)} users.\n")
        print("="*60)

        # 3. Iterate per user and print details
        for user_id, conversations in users_map.items():
            print(f"USER ID: {user_id}")
            print("-" * 30)

            for conv in conversations:
                conv_id = conv['id']
                title = conv.get('title', 'No Title')
                date = conv.get('createdAt', 'Unknown Date')
                
                print(f"  Conversation: {title}")
                print(f"  ID:           {conv_id}")
                print(f"  Created:      {date}")
                print(f"  History:")

                # 4. Fetch messages for this specific conversation
                # We use the partition_key=user_id to make this query cheap/fast
                msg_query = "SELECT * FROM c WHERE c.conversationId = @convId AND c.type = 'message' ORDER BY c.timestamp ASC"
                msg_params = [{"name": "@convId", "value": conv_id}]

                messages_found = False
                try:
                    async for msg in container.query_items(
                        query=msg_query, 
                        parameters=msg_params, 
                        partition_key=user_id
                    ):
                        messages_found = True
                        role = msg.get('role', 'unknown').upper()
                        # Indent content for readability
                        content = msg.get('content', '').replace('\n', '\n             ')
                        print(f"    [{role}]: {content}")
                except Exception as e:
                    print(f"    [ERROR reading messages]: {e}")

                if not messages_found:
                    print("    (No messages in this conversation)")
                
                print("") # Spacing between conversations
            
            print("="*60) # Spacing between Users

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

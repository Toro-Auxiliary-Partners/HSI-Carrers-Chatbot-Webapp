import asyncio
import os
import csv
import json
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
OUTPUT_CSV = "conversations_export.csv"

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
    print(f"Exporting to: {os.path.abspath(OUTPUT_CSV)}")

    async with CosmosClient(ENDPOINT, credential) as client:
        database = client.get_database_client(DATABASE_NAME)
        container = database.get_container_client(CONTAINER_NAME)

        print("Fetching all conversations index (this may take a moment)...")
        
        # 1. Fetch ALL conversations
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
        users_map = {}
        for conv in all_conversations:
            uid = conv.get('userId', 'Unknown_User')
            if uid not in users_map:
                users_map[uid] = []
            users_map[uid].append(conv)

        print(f"\nFound {len(all_conversations)} conversations across {len(users_map)} users.")
        
        # Prepare CSV File
        with open(OUTPUT_CSV, mode='w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile)
            # CSV Header - strict schema as requested
            header = ['id', 'type', 'role', 'content', 'createdAt', '_ts']
            writer.writerow(header)

            # 3. Iterate per user and export
            for user_id, conversations in users_map.items():
                print(f"Processing User: {user_id}...")

                for conv in conversations:
                    conv_id = conv['id']
                    
                    # 4. Fetch messages
                    # Explicitly selecting fields including _ts
                    msg_query = "SELECT c.id, c.type, c.role, c.content, c.createdAt, c._ts FROM c WHERE c.conversationId = @convId AND c.type = 'message' ORDER BY c.createdAt ASC"
                    msg_params = [{"name": "@convId", "value": conv_id}]

                    try:
                        async for msg in container.query_items(
                            query=msg_query, 
                            parameters=msg_params, 
                            partition_key=user_id
                        ):
                            # Write Row - direct mapping, handling missing keys with empty strings
                            writer.writerow([
                                msg.get('id', ''),
                                msg.get('type', ''),
                                msg.get('role', ''),
                                msg.get('content', ''), # Will be empty string if missing
                                msg.get('createdAt', ''),
                                msg.get('_ts', '')
                            ])
                            
                    except Exception as e:
                        print(f"    [ERROR reading messages for {conv_id}]: {e}")


        print(f"\nExport complete! File saved to: {OUTPUT_CSV}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
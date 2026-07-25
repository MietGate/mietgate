import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

NO_ID = {"_id": 0}


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.organizations.create_index("id", unique=True)
    await db.properties.create_index("id", unique=True)
    await db.properties.create_index("application_code")
    await db.applications.create_index("id", unique=True)
    await db.documents.create_index("id", unique=True)
    await db.viewings.create_index("id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("expires_at", expireAfterSeconds=0)
    await db.oauth_states.create_index("expires_at", expireAfterSeconds=0)
    await db.leads.create_index("id", unique=True)
    await db.lead_stages.create_index("id", unique=True)
    await db.lead_stages.create_index("key", unique=True)
    await db.lead_activities.create_index("id", unique=True)
    await db.lead_activities.create_index("lead_id")
    await db.lead_tasks.create_index("id", unique=True)
    await db.lead_tasks.create_index("lead_id")

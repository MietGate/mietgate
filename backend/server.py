from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import logging
import asyncio
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import ensure_indexes
from seed import seed_all
import storage
import stripe_service
import maintenance

import routes_auth
import routes_core
import routes_property
import routes_application
import routes_document
import routes_viewing
import routes_message
import routes_payment
import routes_admin

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mietgate")

app = FastAPI(title="MietGate API")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "mietgate"}


for module in (routes_auth, routes_core, routes_property, routes_application,
               routes_document, routes_viewing, routes_message, routes_payment, routes_admin):
    app.include_router(module.router)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await seed_all()
    try:
        storage.init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    asyncio.get_event_loop().run_in_executor(None, stripe_service.setup_catalog)
    asyncio.create_task(maintenance.maintenance_loop())
    logger.info("Maintenance loop scheduled")

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

import os
import logging
import asyncio
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from database import ensure_indexes
from seed import seed_all
import storage
import stripe_service
import maintenance
import email_templates

import routes_auth
import routes_core
import routes_property
import routes_application
import routes_document
import routes_viewing
import routes_message
import routes_payment
import routes_admin
import routes_profile

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mietgate")

app = FastAPI(title="MietGate API")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "mietgate"}


for module in (routes_auth, routes_core, routes_property, routes_application,
               routes_document, routes_viewing, routes_message, routes_payment, routes_admin,
               routes_profile):
    app.include_router(module.router)

cors_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if not cors_origins:
    logger.warning(
        "CORS_ORIGINS is not set — refusing to allow cross-origin requests with credentials. "
        "Set CORS_ORIGINS to a comma-separated list of allowed origins (e.g. https://app.mietgate.de).")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await seed_all()
    await email_templates.seed_defaults()
    try:
        storage.init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    asyncio.get_event_loop().run_in_executor(None, stripe_service.setup_catalog)
    asyncio.create_task(maintenance.maintenance_loop())
    logger.info("Maintenance loop scheduled")

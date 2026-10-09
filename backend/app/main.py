from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uuid
import logging
from app.config import settings

from app.routers import fhir, patients, prescriptions, demo, health

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")
logger = logging.getLogger("uhw")

app = FastAPI(
    title="Unified Health Wallet Backend",
    version="1.0.0",
    description="Phase 1 Backend for Unified Health Wallet"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allowed_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Logging Middleware
@app.middleware("http")
async def add_request_id_and_log(request: Request, call_next):
    req_id = str(uuid.uuid4())
    request.state.req_id = req_id
    
    logger.info(f"Req {req_id}: {request.method} {request.url.path}")
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    
    logger.info(f"Res {req_id}: {response.status_code}")
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "req_id", "unknown")
    logger.error(f"Req {req_id} failed: {exc}", exc_info=False) # Hides stack trace from clients
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An internal server error occurred."}}
    )

app.include_router(health.router, prefix="/api")
app.include_router(fhir.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(prescriptions.router, prefix="/api")
app.include_router(demo.router, prefix="/api")

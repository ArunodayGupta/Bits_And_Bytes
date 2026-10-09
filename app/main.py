"""app/main.py
FastAPI application for Unified Health Wallet (Phase 2).
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import admin, demo, patients, prescriptions, scan
from app.services.savings_service import load_and_validate_catalog


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_and_validate_catalog()
    yield

app = FastAPI(
    title="Unified Health Wallet API",
    description="FastAPI Backend for Phase 2: Care-Gaps v2, Generic Savings Engine, and Scan-to-FHIR",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware allowing frontend local dev & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized error response shape: {error: {code, message}}
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 400:
        code = "BAD_REQUEST"
    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
    elif exc.status_code == 403:
        code = "FORBIDDEN"
    elif exc.status_code == 413:
        code = "FILE_TOO_LARGE"
    elif exc.status_code == 415:
        code = "UNSUPPORTED_MEDIA_TYPE"
    elif exc.status_code == 429:
        code = "RATE_LIMIT_EXCEEDED"
    elif exc.status_code == 503:
        code = "SERVICE_UNAVAILABLE"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": str(detail)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg") if errors else "Validation failed"
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "VALIDATION_ERROR", "message": first_msg}},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": str(exc)}},
    )




# Include Routers
app.include_router(admin.router)
app.include_router(demo.router)
app.include_router(patients.router)
app.include_router(prescriptions.router)
app.include_router(scan.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "2.0.0"}

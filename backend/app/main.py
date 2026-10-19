from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.config import settings
from app.database import engine
from app.routers.link import router as links_router
from app.routers.redirects import router as redirects_router
from app.routers.campaigns import router as campaigns_router
from app.routers.analytics import router as analytics_router
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="LinkPulse URL shortening and analytics API",
    debug=settings.debug,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-User-Id"],
)
app.include_router(links_router)
app.include_router(redirects_router)
app.include_router(campaigns_router)
app.include_router(analytics_router)
@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": settings.app_name}
@app.get("/health/database", tags=["Health"])
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        ) from exc
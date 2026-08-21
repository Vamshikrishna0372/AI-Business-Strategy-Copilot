"""Enterprise FastAPI Application Initialization for AI Business Strategy Copilot."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.database.connection import db_manager
from app.database.indexes import create_database_indexes
from app.middleware.cors import setup_cors_middleware
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown event handling."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} [{settings.ENVIRONMENT.value}]...")
    settings.validate_production_env()
    try:
        await db_manager.connect_to_database()
        await create_database_indexes()
        from app.database.seed import seed_admin_user
        await seed_admin_user()
        from app.services.tavily_service import TavilyService
        tavily = TavilyService()
        await tavily.validate_key()
    except Exception as e:
        logger.warning(f"Startup notice: Database or Tavily initialization pending: {str(e)}")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")
    await db_manager.close_database_connection()
    logger.info("Shutdown complete.")


def create_application() -> FastAPI:
    """FastAPI Application Factory function."""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production-grade AI Business Strategy Copilot Enterprise SaaS API Backend",
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # Trusted Hosts Middleware for Render & reverse proxy support
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"],
    )

    # Register Pure ASGI Logging Middleware (inner)
    app.add_middleware(RequestLoggingMiddleware)

    # Setup GZip compression middleware (middle)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Setup CORS Middleware (OUTERMOST — registered last so it executes FIRST on incoming requests & OPTIONS preflights)
    setup_cors_middleware(app)

    # Register Custom Exception Handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Register API Routers
    app.include_router(api_v1_router)

    @app.get("/", include_in_schema=False)
    async def root():
        """Root status route redirecting to OpenAPI documentation."""
        return JSONResponse(
            status_code=200,
            content={
                "app": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT.value,
                "docs": "/docs",
                "health": "/api/v1/health",
            },
        )

    return app


app = create_application()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

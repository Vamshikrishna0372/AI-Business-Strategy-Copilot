"""CORS Middleware setup utility with full localhost/127.0.0.1 port regex and explicit origin support."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


def setup_cors_middleware(app: FastAPI) -> None:
    """Configures Cross-Origin Resource Sharing (CORS) rules on application.
    Must be registered LAST in app.add_middleware() so it executes FIRST on incoming requests!
    """
    origins = list(settings.CORS_ORIGINS) if settings.CORS_ORIGINS else []
    
    # Ensure standard frontend dev ports are explicitly listed
    default_dev_origins = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    for origin in default_dev_origins:
        if origin not in origins:
            origins.append(origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "User-Agent",
            "X-Startup-ID",
            "X-Request-ID",
            "X-Correlation-ID",
            "X-Requested-With",
        ],
        expose_headers=[
            "Authorization",
            "X-Startup-ID",
            "X-Request-ID",
            "X-Process-Time-MS",
        ],
    )

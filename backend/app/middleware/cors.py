"""CORS Middleware setup utility — allows all local dev origins and production Vercel/Render URLs."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


def setup_cors_middleware(app: FastAPI) -> None:
    """Configures Cross-Origin Resource Sharing (CORS) rules on the FastAPI application.
    Must be registered LAST in app.add_middleware() so it executes FIRST on incoming requests.
    """
    origins = list(settings.CORS_ORIGINS) if settings.CORS_ORIGINS else []

    # Always include all standard local dev origins
    default_origins = [
        # Local development
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        # Production deployments
        "https://ai-business-strategy-copilot.vercel.app",
        "https://ai-business-strategy-copilot.onrender.com",
    ]

    for origin in default_origins:
        if origin not in origins:
            origins.append(origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel preview deployments
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Startup-ID",
            "X-Request-ID",
            "Accept",
            "Origin",
            "Referer",
        ],
        expose_headers=[
            "Authorization",
            "X-Startup-ID",
            "X-Request-ID",
            "X-Process-Time-MS",
        ],
        max_age=3600,
    )

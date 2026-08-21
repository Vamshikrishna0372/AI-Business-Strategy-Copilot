"""CORS Middleware setup utility — allows all local dev origins and production Vercel/Render URLs."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


def setup_cors_middleware(app: FastAPI) -> None:
    """Configures Cross-Origin Resource Sharing (CORS) rules on the FastAPI application.
    Must be registered LAST in app.add_middleware() so it executes FIRST on incoming requests.
    """
    origins = [o.rstrip("/") for o in settings.CORS_ORIGINS] if settings.CORS_ORIGINS else []

    # Include additional environment variable origins if defined
    for extra in [settings.FRONTEND_URL, settings.FRONTEND_ORIGIN, settings.ALLOWED_ORIGINS]:
        if extra and isinstance(extra, str):
            for part in extra.split(","):
                part_clean = part.strip().rstrip("/")
                if part_clean and part_clean not in origins:
                    origins.append(part_clean)

    # Always include all standard local dev origins and production Vercel/Render URLs
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
        clean_origin = origin.rstrip("/")
        if clean_origin not in origins:
            origins.append(clean_origin)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600,
    )

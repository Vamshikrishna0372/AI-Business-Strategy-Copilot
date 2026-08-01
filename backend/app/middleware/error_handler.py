"""Global Error Catching Middleware."""

import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logging import logger


class ExceptionHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware capturing unexpected server exceptions."""

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            logger.exception(f"Unhandled middleware error during request {request.method} {request.url.path}: {str(exc)}")
            raise exc

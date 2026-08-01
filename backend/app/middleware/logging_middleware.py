"""Pure ASGI Request/Response Logging Middleware eliminating BaseHTTPMiddleware task loop issues."""

import time
import uuid
from starlette.datastructures import MutableHeaders
from app.core.logging import logger


class RequestLoggingMiddleware:
    """Pure ASGI middleware for HTTP logging and request tracing."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        method = scope.get("method", "")
        path = scope.get("path", "")

        logger.info(f"[{request_id}] --> {method} {path}")

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                process_time_ms = (time.time() - start_time) * 1000
                headers = MutableHeaders(scope=message)
                headers["X-Request-ID"] = request_id
                headers["X-Process-Time-MS"] = f"{process_time_ms:.2f}"
                logger.info(
                    f"[{request_id}] <-- {method} {path} | status={message['status']} | "
                    f"duration={process_time_ms:.2f}ms"
                )
            await send(message)

        await self.app(scope, receive, send_wrapper)

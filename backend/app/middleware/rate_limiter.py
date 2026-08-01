"""AI Engine Rate Limiting implementation."""

import time
import logging
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIRateLimiter:
    """Sliding-window in-memory rate limiter per User + Startup + Minute."""

    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        # Key: "user_id:startup_id", Value: list of timestamps
        self._history: Dict[str, List[float]] = defaultdict(list)

    def check_rate_limit(self, user_id: str, startup_id: str) -> None:
        """Enforces rate limit for AI operations, raising HTTP 429 if exceeded."""
        key = f"{user_id}:{startup_id}"
        now = time.time()
        window_start = now - 60.0

        # Filter out timestamps older than 60 seconds
        timestamps = [t for t in self._history[key] if t > window_start]
        self._history[key] = timestamps

        if len(timestamps) >= self.requests_per_minute:
            logger.warning(f"[Rate Limit Exceeded] User '{user_id}' in Startup '{startup_id}' exceeded limit.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"AI request limit exceeded ({self.requests_per_minute} requests/min). Please wait before retrying.",
            )

        # Record current request
        self._history[key].append(now)


# Global singleton instance
ai_rate_limiter = AIRateLimiter(requests_per_minute=settings.AI_RATE_LIMIT_PER_MINUTE)

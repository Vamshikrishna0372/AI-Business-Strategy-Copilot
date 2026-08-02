"""Fallback AI Provider wrapper delegating to enterprise AIProviderManager."""

import logging
from typing import Any, Dict, Optional
from app.ai.base import BaseAIProvider
from app.services.provider_manager import AIProviderManager

logger = logging.getLogger(__name__)


class FallbackAIProvider(BaseAIProvider):
    """Delegates AI completions & JSON generation to multi-key AIProviderManager."""

    def __init__(
        self,
        primary_provider: Optional[BaseAIProvider] = None,
        fallback_provider: Optional[BaseAIProvider] = None,
    ):
        self.manager = AIProviderManager()

    @property
    def provider_name(self) -> str:
        return self.manager.provider_name

    @property
    def model_name(self) -> str:
        return self.manager.model_name

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        return await self.manager.generate_completion(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def generate_structured_json(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        return await self.manager.generate_structured_json(
            prompt=prompt,
            schema=schema,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def health_check(self) -> bool:
        return await self.manager.health_check()

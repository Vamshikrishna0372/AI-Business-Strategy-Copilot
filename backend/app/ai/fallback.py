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
        self.primary_provider = primary_provider
        self.fallback_provider = fallback_provider
        self.manager = AIProviderManager()

    @property
    def provider_name(self) -> str:
        if self.primary_provider:
            return self.primary_provider.provider_name
        return self.manager.provider_name

    @property
    def model_name(self) -> str:
        if self.primary_provider:
            return self.primary_provider.model_name
        return self.manager.model_name

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        if self.primary_provider and self.fallback_provider:
            try:
                return await self.primary_provider.generate_completion(
                    prompt=prompt, system_prompt=system_prompt, temperature=temperature, max_tokens=max_tokens
                )
            except Exception as e:
                logger.warning(f"Primary provider failed in FallbackAIProvider: {e}")
                return await self.fallback_provider.generate_completion(
                    prompt=prompt, system_prompt=system_prompt, temperature=temperature, max_tokens=max_tokens
                )
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
        if self.primary_provider and self.fallback_provider:
            try:
                res = await self.primary_provider.generate_structured_json(
                    prompt, schema, system_prompt, temperature, max_tokens
                )
                if isinstance(res, dict):
                    res.setdefault("metadata", {})["provider_used"] = self.primary_provider.provider_name
                    res.setdefault("metadata", {})["fallback_triggered"] = False
                return res
            except Exception as e:
                logger.warning(f"Primary provider failed in FallbackAIProvider: {e}")
                res = await self.fallback_provider.generate_structured_json(
                    prompt, schema, system_prompt, temperature, max_tokens
                )
                if isinstance(res, dict):
                    res.setdefault("metadata", {})["provider_used"] = self.fallback_provider.provider_name
                    res.setdefault("metadata", {})["fallback_triggered"] = True
                return res

        return await self.manager.generate_structured_json(
            prompt=prompt,
            schema=schema,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def health_check(self) -> bool:
        if self.primary_provider:
            return await self.primary_provider.health_check()
        return await self.manager.health_check()

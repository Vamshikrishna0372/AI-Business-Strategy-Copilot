"""Fallback AI Provider wrapper for automatic primary -> secondary failover."""

import logging
import time
from typing import Any, Dict, Optional
from app.ai.base import BaseAIProvider
from app.ai.factory import AIProviderFactory
from app.core.config import settings

logger = logging.getLogger(__name__)


class FallbackAIProvider(BaseAIProvider):
    """Wraps primary (Gemini) and secondary (Groq) providers with transparent failover."""

    def __init__(
        self,
        primary_provider: Optional[BaseAIProvider] = None,
        fallback_provider: Optional[BaseAIProvider] = None,
    ):
        self.primary = primary_provider or AIProviderFactory.get_provider(settings.DEFAULT_AI_PROVIDER)
        self.fallback = fallback_provider or AIProviderFactory.get_provider(settings.FALLBACK_AI_PROVIDER)

    @property
    def provider_name(self) -> str:
        return f"{self.primary.provider_name}_with_{self.fallback.provider_name}_fallback"

    @property
    def model_name(self) -> str:
        return f"{self.primary.model_name} / {self.fallback.model_name}"

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Attempts generation with primary provider, failing over to fallback on error."""
        start_time = time.time()
        try:
            res = await self.primary.generate_completion(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            elapsed = round((time.time() - start_time) * 1000, 2)
            logger.info(
                f"[AI Execution Success] Provider: {self.primary.provider_name} | "
                f"Model: {self.primary.model_name} | Latency: {elapsed}ms | Prompt Length: {len(prompt)}"
            )
            return res
        except Exception as exc:
            logger.warning(
                f"[AI Failover Triggered] Primary provider '{self.primary.provider_name}' failed with error: {exc}. "
                f"Failing over transparently to secondary provider '{self.fallback.provider_name}'."
            )
            try:
                res = await self.fallback.generate_completion(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                elapsed = round((time.time() - start_time) * 1000, 2)
                logger.info(
                    f"[AI Fallback Execution Success] Provider: {self.fallback.provider_name} | "
                    f"Model: {self.fallback.model_name} | Total Latency: {elapsed}ms"
                )
                return res
            except Exception as fallback_exc:
                logger.error(
                    f"[AI Failover Error] Both Primary ({self.primary.provider_name}) and "
                    f"Fallback ({self.fallback.provider_name}) failed: {fallback_exc}"
                )
                raise RuntimeError(
                    f"AI Provider service unavailable: Primary ({self.primary.provider_name}) & "
                    f"Fallback ({self.fallback.provider_name}) both encountered errors."
                ) from fallback_exc

    async def generate_structured_json(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Attempts structured JSON generation with primary provider, failing over on error/invalid output."""
        start_time = time.time()
        fallback_triggered = False
        provider_used = self.primary.provider_name

        try:
            result = await self.primary.generate_structured_json(
                prompt=prompt,
                schema=schema,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:
            logger.warning(
                f"[AI Failover Triggered] Primary provider '{self.primary.provider_name}' JSON generation failed: {exc}. "
                f"Switching transparently to fallback '{self.fallback.provider_name}'."
            )
            fallback_triggered = True
            provider_used = self.fallback.provider_name
            try:
                result = await self.fallback.generate_structured_json(
                    prompt=prompt,
                    schema=schema,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            except Exception as fallback_exc:
                logger.error(
                    f"[AI Failover Error] Primary ({self.primary.provider_name}) & "
                    f"Fallback ({self.fallback.provider_name}) both failed JSON generation: {fallback_exc}"
                )
                raise RuntimeError(
                    f"AI Provider service unavailable for JSON generation."
                ) from fallback_exc

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        
        # Inject standard metadata if missing
        if isinstance(result, dict):
            metadata = result.get("metadata") or {}
            metadata.update({
                "provider_used": provider_used,
                "fallback_triggered": fallback_triggered,
                "execution_time_ms": elapsed_ms,
                "prompt_length": len(prompt),
            })
            result["metadata"] = metadata

        return result

    async def health_check(self) -> bool:
        """Checks if either primary or fallback provider is available."""
        primary_ok = await self.primary.health_check()
        if primary_ok:
            return True
        fallback_ok = await self.fallback.health_check()
        return fallback_ok

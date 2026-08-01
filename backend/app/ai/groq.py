"""Groq AI Provider Integration (Fallback Provider)."""

import json
import logging
from typing import Any, Dict, Optional
import httpx

from app.ai.base import BaseAIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class GroqProvider(BaseAIProvider):
    """Groq AI Provider using llama-3.3-70b-versatile (or configured fallback model)."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.FALLBACK_AI_MODEL
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def provider_name(self) -> str:
        return "groq"

    @property
    def model_name(self) -> str:
        return self.model

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generates raw text completion via Groq OpenAI-compatible API."""
        if not self.api_key:
            raise ValueError("Groq API key is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or settings.AI_TEMPERATURE,
            "max_tokens": max_tokens or settings.AI_MAX_TOKENS,
        }

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)

            if response.status_code != 200:
                logger.error(f"[Groq API Error] HTTP {response.status_code}: {response.text}")
                raise RuntimeError(f"Groq API returned HTTP {response.status_code}: {response.text}")

            res_data = response.json()
            try:
                return res_data["choices"][0]["message"]["content"]
            except (KeyError, IndexError) as exc:
                logger.error(f"[Groq Malformed Response]: {res_data}")
                raise ValueError("Groq response missing message content structure") from exc

    async def generate_structured_json(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generates structured JSON object using Groq JSON mode."""
        if not self.api_key:
            raise ValueError("Groq API key is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        json_sys_prompt = (
            (system_prompt + "\n" if system_prompt else "") +
            "You are an AI JSON engine. You MUST return ONLY valid JSON matching standard format: "
            '{"success": true, "message": "...", "data": {...}, "confidence": 0.95, "suggestions": [...], "metadata": {...}}.'
        )

        messages = [
            {"role": "system", "content": json_sys_prompt},
            {"role": "user", "content": prompt},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature or settings.AI_TEMPERATURE,
            "max_tokens": max_tokens or settings.AI_MAX_TOKENS,
            "response_format": {"type": "json_object"},
        }

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            response = await client.post(self.base_url, headers=headers, json=payload)

            if response.status_code != 200:
                logger.error(f"[Groq API Error] HTTP {response.status_code}: {response.text}")
                raise RuntimeError(f"Groq API returned HTTP {response.status_code}: {response.text}")

            res_data = response.json()
            try:
                raw_text = res_data["choices"][0]["message"]["content"]
                return json.loads(raw_text)
            except (KeyError, IndexError) as exc:
                logger.error(f"[Groq Malformed Response]: {res_data}")
                raise ValueError("Groq response missing message content structure") from exc
            except json.JSONDecodeError as exc:
                logger.warning(f"[Groq Non-JSON output]: {raw_text}")
                raise ValueError("Groq returned invalid JSON string") from exc

    async def health_check(self) -> bool:
        """Performs a lightweight ping check to verify Groq API readiness."""
        if not self.api_key:
            return False
        try:
            res = await self.generate_completion(prompt="Ping test", max_tokens=5)
            return bool(res)
        except Exception as exc:
            logger.warning(f"[Groq Health Check Failed]: {exc}")
            return False

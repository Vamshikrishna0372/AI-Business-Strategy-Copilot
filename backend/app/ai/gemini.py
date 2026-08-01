"""Google Gemini AI Provider Integration (Gemini 2.5 Flash)."""

import json
import logging
from typing import Any, Dict, Optional
import httpx

from app.ai.base import BaseAIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiProvider(BaseAIProvider):
    """Google Gemini AI Provider using Gemini 2.5 Flash (or configured model)."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.DEFAULT_AI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    @property
    def provider_name(self) -> str:
        return "gemini"

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
        """Generates raw text completion via Google Gemini REST API."""
        if not self.api_key:
            raise ValueError("Gemini API key is not configured.")

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": temperature or settings.AI_TEMPERATURE,
                "maxOutputTokens": max_tokens or settings.AI_MAX_TOKENS,
            },
        }

        if system_prompt:
            payload["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code != 200:
                logger.error(f"[Gemini API Error] HTTP {response.status_code}: {response.text}")
                raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {response.text}")

            res_data = response.json()
            try:
                text_content = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return text_content
            except (KeyError, IndexError) as exc:
                logger.error(f"[Gemini Malformed Response]: {res_data}")
                raise ValueError("Gemini response missing text candidate structure") from exc

    async def generate_structured_json(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generates structured JSON object using Gemini JSON response mode."""
        if not self.api_key:
            raise ValueError("Gemini API key is not configured.")

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        # Instruct model explicitly to format output as clean JSON
        json_instruction = (
            "\n\nCRITICAL REQUIRED RESPONSE FORMAT:\n"
            "Return ONLY a valid, parseable JSON object matching standard fields: "
            '{"success": true, "message": "...", "data": {...}, "confidence": 0.95, "suggestions": [...], "metadata": {...}}.'
            " Do NOT include any markdown formatting, backticks, or extra commentary outside the JSON."
        )

        full_prompt = prompt + json_instruction

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": full_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": temperature or settings.AI_TEMPERATURE,
                "maxOutputTokens": max_tokens or settings.AI_MAX_TOKENS,
                "responseMimeType": "application/json",
            },
        }

        if system_prompt:
            payload["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code != 200:
                logger.error(f"[Gemini API Error] HTTP {response.status_code}: {response.text}")
                raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {response.text}")

            res_data = response.json()
            try:
                raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(raw_text)
            except (KeyError, IndexError) as exc:
                logger.error(f"[Gemini Malformed Response]: {res_data}")
                raise ValueError("Gemini response missing text candidate structure") from exc
            except json.JSONDecodeError as exc:
                logger.warning(f"[Gemini Non-JSON output]: {raw_text}")
                raise ValueError("Gemini returned invalid JSON string") from exc

    async def health_check(self) -> bool:
        """Performs a lightweight ping check to verify Gemini API readiness."""
        if not self.api_key:
            return False
        try:
            res = await self.generate_completion(prompt="Ping test", max_tokens=5)
            return bool(res)
        except Exception as exc:
            logger.warning(f"[Gemini Health Check Failed]: {exc}")
            return False

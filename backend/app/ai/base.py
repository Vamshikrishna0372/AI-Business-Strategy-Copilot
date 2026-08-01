"""Abstract Base AI Provider Interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseAIProvider(ABC):
    """Abstract interface for LLM AI model providers (Gemini, Groq, Claude, OpenAI, etc.)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the canonical name of the provider."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Returns the active model name used by the provider."""
        pass

    @abstractmethod
    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Generates raw text completion for a given prompt."""
        pass

    @abstractmethod
    async def generate_structured_json(
        self,
        prompt: str,
        schema: Optional[Dict[str, Any]] = None,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generates structured JSON object matching target schema or standard response format."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Performs a lightweight ping check to ensure provider availability."""
        pass

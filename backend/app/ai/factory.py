"""AI Provider Factory for dynamic LLM initialization."""

from typing import Dict, Type
from app.ai.base import BaseAIProvider
from app.ai.gemini import GeminiProvider
from app.ai.groq import GroqProvider
from app.core.config import settings


class AIProviderFactory:
    """Factory to register, resolve, and instantiate AI providers dynamically."""

    _providers: Dict[str, Type[BaseAIProvider]] = {
        "gemini": GeminiProvider,
        "groq": GroqProvider,
    }

    @classmethod
    def register_provider(cls, name: str, provider_cls: Type[BaseAIProvider]) -> None:
        """Registers a new AI provider class for future extension (e.g., openai, claude)."""
        cls._providers[name.lower()] = provider_cls

    @classmethod
    def get_provider(cls, name: str = "gemini", **kwargs) -> BaseAIProvider:
        """Instantiates and returns requested provider instance."""
        provider_key = name.lower()
        if provider_key not in cls._providers:
            raise ValueError(f"Unsupported AI Provider '{name}'. Available: {list(cls._providers.keys())}")
        
        provider_cls = cls._providers[provider_key]
        return provider_cls(**kwargs)

    @classmethod
    def get_default_provider(self) -> BaseAIProvider:
        """Instantiates default primary provider configured in settings."""
        return self.get_provider(settings.DEFAULT_AI_PROVIDER)

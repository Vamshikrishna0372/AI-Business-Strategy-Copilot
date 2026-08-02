"""Centralized application settings configuration using Pydantic Settings."""

from functools import lru_cache
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.common.enums import Environment


class Settings(BaseSettings):
    """Application Settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # General App Configuration
    APP_NAME: str = Field(default="AI Business Strategy Copilot", description="Application Name")
    APP_VERSION: str = Field(default="1.0.0", description="Application Version")
    ENVIRONMENT: Environment = Field(default=Environment.DEVELOPMENT, description="Execution Environment")
    DEBUG: bool = Field(default=True, description="Debug Mode Flag")
    LOG_LEVEL: str = Field(default="INFO", description="Logging Level")
    TIMEZONE: str = Field(default="UTC", description="Application Timezone")

    # Server Settings
    HOST: str = Field(default="0.0.0.0", description="Server Host IP")
    PORT: int = Field(default=8000, description="Server Port Number")
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:8080",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "https://ai-business-strategy-copilot.vercel.app",
            "https://ai-business-strategy-copilot.onrender.com",
        ],
        description="Allowed CORS Origins"
    )

    # MongoDB Atlas Database Configuration
    MONGODB_URI: str = Field(
        default="mongodb://localhost:27017",
        description="MongoDB Connection String URI"
    )
    DATABASE_NAME: str = Field(
        default="ai_strategy_copilot_dev",
        description="MongoDB Database Name"
    )

    # JWT Authentication Configuration
    JWT_SECRET: str = Field(
        default="super-secret-jwt-key-change-in-production-min-32-chars",
        description="JWT Secret Key"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT Encryption Algorithm")
    JWT_EXPIRE_MINUTES: int = Field(default=1440, description="JWT Access Token Expiration Minutes (24 hours)")
    JWT_REFRESH_EXPIRE_MINUTES: int = Field(default=10080, description="JWT Refresh Token Expiration Minutes (7 days)")


    # Google OAuth Integration Configuration
    GOOGLE_CLIENT_ID: str = Field(default="", description="Google OAuth Client ID")
    GOOGLE_CLIENT_SECRET: str = Field(default="", description="Google OAuth Client Secret")

    # AI Integration & Model Configuration
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    GEMINI_API_KEY_1: str = Field(default="", description="Google Gemini API Key 1")
    GEMINI_API_KEY_2: str = Field(default="", description="Google Gemini API Key 2")
    GEMINI_API_KEY_3: str = Field(default="", description="Google Gemini API Key 3")
    GROQ_API_KEY: str = Field(default="", description="Groq AI API Key")
    TAVILY_API_KEY: str = Field(default="", description="Tavily Business Intelligence Search API Key")
    DEFAULT_AI_PROVIDER: str = Field(default="gemini", description="Default AI Provider (gemini/groq)")
    DEFAULT_AI_MODEL: str = Field(default="gemini-2.5-flash", description="Default Primary AI Model")
    FALLBACK_AI_PROVIDER: str = Field(default="groq", description="Fallback AI Provider (groq)")
    FALLBACK_AI_MODEL: str = Field(default="llama-3.3-70b-versatile", description="Fallback Secondary AI Model")
    AI_MAX_TOKENS: int = Field(default=4096, description="Max Tokens per AI Completion")
    AI_TEMPERATURE: float = Field(default=0.7, description="Sampling Temperature for AI Generation")
    AI_TIMEOUT_SECONDS: int = Field(default=30, description="HTTP Request Timeout Seconds for AI Provider")
    AI_MAX_RETRIES: int = Field(default=2, description="Max Automatic Retries before failover")
    AI_RATE_LIMIT_PER_MINUTE: int = Field(default=30, description="AI Request Limit per User per Startup per Minute")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if not v.strip():
                return []
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                return [i.strip() for i in v.split(",") if i.strip()]
        return v


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton instance of application settings."""
    return Settings()


settings = get_settings()

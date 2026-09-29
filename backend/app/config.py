import os
import tempfile
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    openrouter_api_key: str
    openrouter_model: str = "google/gemma-4-31b-it:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    max_upload_bytes: int = 5_242_880
    upload_dir: str = "uploads"
    cors_origins: str = "http://localhost:3000"

    @property
    def on_vercel(self) -> bool:
        return bool(os.getenv("VERCEL"))

    @property
    def effective_upload_dir(self) -> str:
        # Vercel serverless only allows writes under /tmp
        if self.on_vercel:
            return os.path.join(tempfile.gettempdir(), "cv-uploads")
        return self.upload_dir


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

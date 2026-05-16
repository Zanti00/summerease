from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # App Settings
    SECRET_KEY: str = "your-secret-key-here"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:@localhost/summerease"

    # NexusAuth Settings
    NEXUSAUTH_BASE_URL: str
    NEXUSAUTH_API_KEY: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# @lru_cache()
def get_settings():
    return Settings()

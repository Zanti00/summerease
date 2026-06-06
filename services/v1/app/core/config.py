from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""

    # App Settings
    SECRET_KEY: str = "your-secret-key-here"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:@localhost/summerease"

    # NexusAuth Settings
    NEXUSAUTH_BASE_URL: str
    NEXUSAUTH_API_KEY: str

    # Supabase Settings
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Google GenAI Settings
    GOOGLE_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_BATCH_SIZE: int = 100
    EMBEDDING_RPM_LIMIT: int = 15
    EMBEDDING_RPD_LIMIT: int = 1500

    # RAG Configuration
    RAG_CHUNK_SIZE: int = 1024
    RAG_CHUNK_OVERLAP: int = 128
    RAG_DEFAULT_TOP_K: int = 10
    RAG_SIMILARITY_THRESHOLD: float = 0.0
    RAG_MAX_UPLOAD_SIZE_MB: int = 50

    # ClamAV Configuration
    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310

    # Redis / Cache TTLs (seconds)
    REDIS_URL: str = "redis://localhost:6380"
    RAG_SEARCH_CACHE_TTL: int = 300
    RAG_EMBEDDING_CACHE_TTL: int = 86400
    RAG_CHUNK_CACHE_TTL: int = 3600

    # Ollama / LLM Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    OLLAMA_TIMEOUT_SECONDS: int = 120
    LLM_MAX_CONTEXT_TOKENS: int = 2048
    LLM_MAX_OUTPUT_TOKENS: int = 512
    LLM_TEMPERATURE: float = 0.1
    LLM_TOP_K_CHUNKS: int = 5
    LLM_TOOL_MAX_OUTPUT_TOKENS: int = 2048
    LLM_TOOL_MAX_INPUT_TOKENS: int = 3000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# @lru_cache()
def get_settings():
    return Settings()

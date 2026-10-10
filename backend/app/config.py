from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ROOT_DIR = _BACKEND_DIR.parent

class Settings(BaseSettings):
    supabase_url: str = "http://127.0.0.1:54321"
    supabase_service_role_key: str = ""
    api_ingest_key: str = "demo-api-key"
    allowed_origins: str = "*"
    rx_token_system: str = "https://phr-demo.example.org/rx-token"

    model_config = SettingsConfigDict(
        env_file=[str(_ROOT_DIR / ".env"), str(_BACKEND_DIR / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()

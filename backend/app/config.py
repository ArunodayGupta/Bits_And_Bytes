from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    api_ingest_key: str
    allowed_origins: str
    rx_token_system: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

try:
    settings = Settings()
except Exception as e:
    import sys
    print(f"Configuration Error: {e}", file=sys.stderr)
    print("Please make sure all required variables are set in .env", file=sys.stderr)
    sys.exit(1)

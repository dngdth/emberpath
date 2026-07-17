from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DATABASE_URL = f"sqlite:///{(BACKEND_DIR / 'building_safety.db').as_posix()}"


class Settings(BaseSettings):
    app_name: str = "Building Safety MVP"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = DEFAULT_DATABASE_URL
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    seed_demo_data: bool = True
    simulator_interval_seconds: int = 5

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / '.env', env_file_encoding='utf-8', extra='ignore')

    @model_validator(mode="after")
    def resolve_relative_sqlite_path(self):
        prefix = "sqlite:///./"
        if self.database_url.startswith(prefix):
            relative_path = self.database_url.removeprefix(prefix)
            absolute_path = (BACKEND_DIR / relative_path).resolve().as_posix()
            self.database_url = f"sqlite:///{absolute_path}"
        return self


settings = Settings()

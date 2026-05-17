from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db.sqlite3"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_type: str = "sqlite"
    db_echo: bool = False

    postgres_user: str = "user"
    postgres_password: str = "1234"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "project_db"

    redis_url: str = "redis://localhost:6379/0"
    day_schedule_ttl: int = 5
    week_schedule_ttl: int = 5
    upload_dir: Path = BASE_DIR / "uploads"

    secret_key: str = "very-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 5

    @computed_field
    @property
    def db_url(self) -> str:
        if self.db_type == "postgres":
            return (
                f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
                f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )

        return f"sqlite+aiosqlite:///{DB_PATH}"


settings = Settings()

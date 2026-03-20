from pydantic_settings import BaseSettings
from pathlib import Path
import os

def get_db_url():
    db_type = os.getenv('DB_TYPE', 'sqlite')
    if db_type == 'postgres':
        return f"postgresql+asyncpg://{os.getenv('POSTGRES_USER', 'user')}:{os.getenv('POSTGRES_PASSWORD', '1234')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', 5432)}/{os.getenv('POSTGRES_DB', 'project_db')}"
    else:
        BASE_DIR = Path(__file__).parent.parent
        DB_PATH = BASE_DIR / "db.sqlite3"
        return f"sqlite+aiosqlite:///{DB_PATH}"

class Settings(BaseSettings):
    db_url: str = get_db_url()
    db_type: str = os.getenv('DB_TYPE', 'sqlite')
    db_echo: bool = False

    redis_url: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    secret_key: str = os.getenv('SECRET_KEY', 'very-secret-key')
    algorithm: str = os.getenv('ALGORITHM', 'HS256')
    access_token_expire_minutes: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 5))


settings = Settings()
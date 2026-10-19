from functools import lru_cache
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "LinkPulse API"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False
    database_url: SecretStr = Field(default=SecretStr(
        "mysql+pymysql://root:Pragalp%40123@127.0.0.1:3306/Linkpulse"
    ))
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8",
        case_sensitive=False, extra="ignore"
    )

    @property
    def parsed_cors_origins(self) -> list[str]:
        return [x.strip().rstrip("/") for x in self.cors_origins.split(",") if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.PROJECT_NAME = os.getenv("PROJECT_NAME", "OMEN-LINKPULSE")
        self.project_name = self.PROJECT_NAME

        self.DATABASE_URL = os.getenv(
            "DATABASE_URL",
            "mysql+pymysql://root:password@127.0.0.1:3306/Linkpulse",
        )
        self.database_url = self.DATABASE_URL

        self.BASE_SHORT_URL = os.getenv("BASE_SHORT_URL", "http://127.0.0.1:8000")
        self.base_short_url = self.BASE_SHORT_URL
        self.base_url = self.BASE_SHORT_URL

        self.SECRET_KEY = os.getenv("SECRET_KEY", "omen-linkpulse-super-secret-key-2026")
        self.secret_key = self.SECRET_KEY

        self.ALGORITHM = os.getenv("ALGORITHM", "HS256")
        self.algorithm = self.ALGORITHM

        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
        self.access_token_expire_minutes = self.ACCESS_TOKEN_EXPIRE_MINUTES


settings = Settings()
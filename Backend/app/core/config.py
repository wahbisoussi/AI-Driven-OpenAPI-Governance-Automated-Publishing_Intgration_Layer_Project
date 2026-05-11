import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "biat-jwt-secret-change-in-production-2025")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours
import os
from dotenv import load_dotenv

# Load environment variables from the .env file in the backend directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:sharmila_2004@db.effxoocqzqnsohwqanep.supabase.co:5432/postgres").strip()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-session-secret-key-123456").strip()
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256").strip()
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "sarmiladevig45@gmail.com").strip()
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip()
    SMTP_FROM: str = os.getenv("SMTP_FROM", "sarmiladevig45@gmail.com").strip()

settings = Settings()

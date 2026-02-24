"""
Application Configuration - All settings from environment variables
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Forge"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(64)
    ENCRYPTION_KEY: str = secrets.token_urlsafe(32)  # AES-256

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://your-domain.com"]
    ALLOWED_HOSTS: List[str] = ["*"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/forge_db"
    DATABASE_URL_REPLICA: str = "postgresql+asyncpg://postgres:password@localhost:5433/forge_db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 100
    CACHE_TTL: int = 300  # 5 minutes

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_PIPELINE_EVENTS: str = "pipeline-events"
    KAFKA_TOPIC_AGENT_TASKS: str = "agent-tasks"
    KAFKA_TOPIC_NOTIFICATIONS: str = "notifications"
    KAFKA_CONSUMER_GROUP: str = "forge-workers"

    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OTP
    OTP_EXPIRE_MINUTES: int = 5
    OTP_LENGTH: int = 6

    # AI Agent Configuration (Claude API)
    ANTHROPIC_API_KEY: str = ""
    AGENT_MODEL: str = "claude-opus-4-6"
    AGENT_MAX_TOKENS: int = 8192
    AGENT_TIMEOUT_SECONDS: int = 300

    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 1000
    RATE_LIMIT_BURST: int = 100

    # External Integrations
    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_CHANNEL_APPROVALS: str = "#approvals"
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "forge@company.com"

    # Vault
    VAULT_URL: Optional[str] = None
    VAULT_TOKEN: Optional[str] = None

    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    JAEGER_HOST: Optional[str] = None

    # Feature Flags
    FEATURE_DEPLOYMENT_ENABLED: bool = True
    FEATURE_SECURITY_SCAN_ENABLED: bool = True
    FEATURE_COST_ESTIMATION_ENABLED: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

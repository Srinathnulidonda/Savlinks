# server/app/config.py

"""
Configuration classes for different environments.
Optimized for Railway deployment.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()


def get_database_url():
    """
    Get database URL with Railway compatibility.
    Railway provides DATABASE_URL or individual components.
    """
    # Railway's PostgreSQL URL
    database_url = os.environ.get("DATABASE_URL")
    
    # If using Railway's PostgreSQL, it might use 'postgres://' which SQLAlchemy doesn't support
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    # Alternative: construct from individual vars (Railway PostgreSQL plugin)
    if not database_url:
        pg_host = os.environ.get("PGHOST")
        pg_port = os.environ.get("PGPORT", "5432")
        pg_user = os.environ.get("PGUSER") or os.environ.get("POSTGRES_USER")
        pg_password = os.environ.get("PGPASSWORD") or os.environ.get("POSTGRES_PASSWORD")
        pg_database = os.environ.get("PGDATABASE") or os.environ.get("POSTGRES_DB")
        
        if all([pg_host, pg_user, pg_password, pg_database]):
            database_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
    
    return database_url


def get_redis_url():
    """
    Get Redis URL with Railway/Upstash compatibility.
    """
    # Check for various Redis URL environment variables
    redis_url = (
        os.environ.get("REDIS_URL") or
        os.environ.get("REDIS_PRIVATE_URL") or
        os.environ.get("UPSTASH_REDIS_URL")
    )
    
    # If using Upstash with REST API, construct URL
    if not redis_url:
        upstash_endpoint = os.environ.get("UPSTASH_REDIS_REST_URL")
        upstash_token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
        if upstash_endpoint and upstash_token:
            # For standard Redis client, we need the regular Redis URL
            # Upstash also provides standard Redis URL
            pass
    
    return redis_url


class Config:
    """Base configuration class."""
    
    # Flask core settings
    SECRET_KEY = os.environ.get("SECRET_KEY", os.urandom(32).hex())
    DEBUG = False
    TESTING = False
    FLASK_ENV = os.environ.get("FLASK_ENV", "production")
    
    # Railway environment detection
    RAILWAY_ENVIRONMENT = os.environ.get("RAILWAY_ENVIRONMENT")
    RAILWAY_SERVICE_NAME = os.environ.get("RAILWAY_SERVICE_NAME")
    RAILWAY_PROJECT_NAME = os.environ.get("RAILWAY_PROJECT_NAME")
    IS_RAILWAY = bool(RAILWAY_ENVIRONMENT)
    
    # Database - PostgreSQL
    SQLALCHEMY_DATABASE_URI = get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "max_overflow": 10,
        "pool_timeout": 30,
    }
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", os.urandom(32).hex())
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ["access", "refresh"]
    
    # Redis
    REDIS_URL = get_redis_url()
    
    # Cache TTL settings (in seconds)
    CACHE_TTL_LINK = 3600  # 1 hour
    CACHE_TTL_BLACKLIST = 86400 * 31  # 31 days
    
    # Brevo Email Configuration
    BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
    BREVO_SMTP_SERVER = os.environ.get("BREVO_SMTP_SERVER", "smtp-relay.brevo.com")
    BREVO_SMTP_PORT = int(os.environ.get("BREVO_SMTP_PORT", 587))
    BREVO_SMTP_USERNAME = os.environ.get("BREVO_SMTP_USERNAME")
    BREVO_SMTP_PASSWORD = os.environ.get("BREVO_SMTP_PASSWORD")
    BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@cinbrainlinks.com")
    BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "CinBrainLinks")
    REPLY_TO_EMAIL = os.environ.get("REPLY_TO_EMAIL", os.environ.get("BREVO_SENDER_EMAIL"))
    
    # Application settings
    APP_NAME = "CinBrainLinks"
    
    # URLs - Railway provides RAILWAY_PUBLIC_DOMAIN
    RAILWAY_PUBLIC_DOMAIN = os.environ.get("RAILWAY_PUBLIC_DOMAIN")
    if RAILWAY_PUBLIC_DOMAIN:
        BASE_URL = f"https://{RAILWAY_PUBLIC_DOMAIN}"
    else:
        BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")
    
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    BACKEND_URL = BASE_URL
    
    # Rate limiting
    RATELIMIT_STORAGE_URL = REDIS_URL
    RATELIMIT_DEFAULT = "200 per hour"
    RATELIMIT_HEADERS_ENABLED = True
    RATELIMIT_STRATEGY = "fixed-window"
    
    # If no Redis, use memory storage (not recommended for production with multiple workers)
    if not REDIS_URL:
        RATELIMIT_STORAGE_URL = "memory://"
    
    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
    
    # Password reset
    PASSWORD_RESET_TOKEN_EXPIRES = 3600  # 1 hour
    PASSWORD_RESET_SALT = os.environ.get(
        "PASSWORD_RESET_SALT", 
        "password-reset-salt-cinbrainlinks-2025"
    )
    
    # Reserved slugs
    RESERVED_SLUGS = {
        "admin", "api", "login", "logout", "register", "signup",
        "dashboard", "settings", "profile", "account", "user", "users",
        "link", "links", "health", "status", "static", "assets",
        "auth", "oauth", "callback", "reset", "password", "verify",
        "help", "support", "contact", "about", "terms", "privacy",
        "blog", "docs", "documentation", "app", "www", "mail",
        "unsubscribe", "preferences", "analytics", "stats", "metrics"
    }
    
    # Slug configuration
    SLUG_MIN_LENGTH = 4
    SLUG_MAX_LENGTH = 20
    AUTO_SLUG_LENGTH = 7
    
    # Sentry (optional)
    SENTRY_DSN = os.environ.get("SENTRY_DSN")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    FLASK_ENV = "development"
    SQLALCHEMY_ECHO = True


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    FLASK_ENV = "testing"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(Config):
    """Production configuration for Railway."""
    DEBUG = False
    FLASK_ENV = "production"
    
    # Stricter database settings for production
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "max_overflow": 20,
        "pool_timeout": 30,
    }
    
    # Stricter rate limits
    RATELIMIT_DEFAULT = "100 per hour"
    
    # Session security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


# Configuration mapping
config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": ProductionConfig
}
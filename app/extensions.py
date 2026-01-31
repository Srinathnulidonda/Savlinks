# server/app/extensions.py

"""
Flask extensions initialization.
Extensions are initialized here and imported where needed.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# SQLAlchemy ORM
db = SQLAlchemy()

# JWT Authentication
jwt = JWTManager()

# Database migrations
migrate = Migrate()

# Rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
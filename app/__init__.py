# server/app/__init__.py

"""
CinBrainLinks - Application Factory
Production-grade URL shortener platform optimized for Railway deployment.
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

from app.config import config_by_name
from app.extensions import db, jwt, migrate, limiter


def create_app(config_name: str = None) -> Flask:
    """Application factory pattern for Flask app creation."""
    
    # Auto-detect environment if not specified
    if config_name is None:
        if os.environ.get("RAILWAY_ENVIRONMENT"):
            config_name = "production"
        else:
            config_name = os.environ.get("FLASK_ENV", "production")
    
    app = Flask(__name__)
    
    # Load configuration
    config_class = config_by_name.get(config_name, config_by_name["production"])
    app.config.from_object(config_class)
    
    # Log startup info
    _log_startup_info(app, config_name)
    
    # Initialize extensions
    _init_extensions(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Setup logging
    _setup_logging(app)
    
    # JWT callbacks
    _setup_jwt_callbacks(app)
    
    # Initialize Sentry if configured
    _init_sentry(app)
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get("CORS_ORIGINS", ["*"]),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        },
        r"/*": {"origins": "*"}  # For redirect endpoint
    })
    
    # Health check endpoint
    @app.route("/health")
    def health_check():
        """Health check endpoint for Railway."""
        health_status = {
            "status": "healthy",
            "service": "CinBrainLinks",
            "environment": config_name
        }
        
        # Check database connection
        try:
            db.session.execute(db.text("SELECT 1"))
            health_status["database"] = "connected"
        except Exception as e:
            health_status["database"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
        
        # Check Redis connection
        try:
            from app.services.redis_service import RedisService
            redis = RedisService()
            if redis.client:
                redis.client.ping()
                health_status["redis"] = "connected"
            else:
                health_status["redis"] = "not configured"
        except Exception as e:
            health_status["redis"] = f"error: {str(e)}"
        
        status_code = 200 if health_status["status"] == "healthy" else 503
        return jsonify(health_status), status_code
    
    # Root endpoint
    @app.route("/")
    def root():
        """Root endpoint - API info."""
        return jsonify({
            "name": "CinBrainLinks API",
            "version": "1.0.0",
            "status": "running",
            "docs": "/api/docs" if app.config["DEBUG"] else None,
            "health": "/health"
        }), 200
    
    return app


def _log_startup_info(app: Flask, config_name: str) -> None:
    """Log startup information."""
    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║                       CinBrainLinks                            ║
║              Production-Grade URL Shortener                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Environment: {config_name:<48}║
║  Railway:     {str(app.config.get('IS_RAILWAY', False)):<48}║
║  Base URL:    {app.config.get('BASE_URL', 'Not set')[:48]:<48}║
╚═══════════════════════════════════════════════════════════════╝
    """)


def _init_extensions(app: Flask) -> None:
    """Initialize Flask extensions."""
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # Initialize rate limiter with fallback
    try:
        limiter.init_app(app)
    except Exception as e:
        app.logger.warning(f"Rate limiter initialization warning: {e}")
    
    # Create tables within app context
    with app.app_context():
        try:
            db.create_all()
            app.logger.info("✅ Database tables created/verified")
        except Exception as e:
            app.logger.error(f"❌ Database initialization error: {e}")
            raise


def _register_blueprints(app: Flask) -> None:
    """Register application blueprints."""
    from app.routes.auth import auth_bp
    from app.routes.links import links_bp
    from app.routes.redirect import redirect_bp
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(links_bp, url_prefix="/api/links")
    app.register_blueprint(redirect_bp)  # Root level for short URLs


def _register_error_handlers(app: Flask) -> None:
    """Register global error handlers."""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "error": "Bad Request",
            "message": str(error.description) if hasattr(error, 'description') else "Invalid request"
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            "error": "Unauthorized",
            "message": "Authentication required"
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            "error": "Forbidden",
            "message": "Access denied"
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "error": "Not Found",
            "message": "Resource not found"
        }), 404
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            "error": "Rate Limit Exceeded",
            "message": "Too many requests. Please slow down."
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        }), 500


def _setup_logging(app: Flask) -> None:
    """Configure application logging for Railway."""
    log_level = logging.INFO if not app.config["DEBUG"] else logging.DEBUG
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Reduce noise from some libraries
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def _setup_jwt_callbacks(app: Flask) -> None:
    """Setup JWT-related callbacks."""
    from app.services.redis_service import RedisService
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if JWT token has been revoked."""
        try:
            jti = jwt_payload["jti"]
            redis_service = RedisService()
            return redis_service.is_token_blacklisted(jti)
        except Exception:
            # If Redis is unavailable, don't block valid tokens
            return False
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token Expired",
            "message": "The access token has expired"
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "Invalid Token",
            "message": "Token verification failed"
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Authorization Required",
            "message": "Access token is missing"
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token Revoked",
            "message": "The token has been revoked"
        }), 401


def _init_sentry(app: Flask) -> None:
    """Initialize Sentry error tracking if configured."""
    sentry_dsn = app.config.get("SENTRY_DSN")
    if sentry_dsn:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            
            sentry_sdk.init(
                dsn=sentry_dsn,
                integrations=[FlaskIntegration()],
                traces_sample_rate=0.1,
                environment=app.config.get("FLASK_ENV", "production")
            )
            app.logger.info("✅ Sentry initialized")
        except ImportError:
            app.logger.warning("Sentry SDK not installed")
        except Exception as e:
            app.logger.error(f"Sentry initialization error: {e}")
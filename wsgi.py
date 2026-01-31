"""
WSGI entry point for production deployment.
Used by Gunicorn on Railway.
"""

import os
from app import create_app

# Get environment from Railway or default to production
environment = os.environ.get("RAILWAY_ENVIRONMENT", "production")
if environment == "production":
    config_name = "production"
else:
    config_name = os.environ.get("FLASK_ENV", "production")

# Create the application
app = create_app(config_name)

if __name__ == "__main__":
    app.run()
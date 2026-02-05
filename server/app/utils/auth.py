# server/app/utils/auth.py

import logging
from functools import wraps
from typing import Optional

from flask import request, g, current_app

from app.services.supabase_auth import SupabaseAuthService

logger = logging.getLogger(__name__)


def extract_token_from_header() -> Optional[str]:
    """Extract Bearer token from Authorization header"""
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None


def require_auth(f):
    """Decorator that requires valid Supabase JWT and provisions user"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token
        token = extract_token_from_header()
        
        if not token:
            return current_app.api_response.error(
                "Authentication required", 
                401, 
                "MISSING_TOKEN"
            )
        
        # Verify Supabase JWT
        payload = SupabaseAuthService.verify_token(token)
        
        if not payload:
            return current_app.api_response.error(
                "Invalid or expired token", 
                401, 
                "INVALID_TOKEN"
            )
        
        # Get or create user
        user, error = SupabaseAuthService.get_or_create_user(payload)
        
        if not user:
            logger.error(f"User provisioning failed: {error}")
            return current_app.api_response.error(
                "Authentication failed", 
                500, 
                "AUTH_ERROR"
            )
        
        # Attach to request context
        g.current_user = user
        g.current_user_id = user.id
        g.token_payload = payload
        
        return f(*args, **kwargs)
    
    return decorated_function


# Compatibility alias for existing code
jwt_required = require_auth
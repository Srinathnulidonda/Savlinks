import logging

from flask import Blueprint, request, current_app, g

from app.utils.auth import require_auth

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)


def api_response():
    return current_app.api_response


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user():
    """Get current authenticated user information"""
    user = g.current_user
    
    return api_response().success(data={"user": user.to_dict()})


@auth_bp.route("/verify", methods=["POST"])
def verify_token():
    """
    Verify Supabase JWT token and return user information.
    This endpoint can be used by frontend to validate tokens
    and get user data without making additional requests.
    """
    from app.services.supabase_auth import SupabaseAuthService
    from app.utils.auth import extract_token_from_header
    
    token = extract_token_from_header()
    
    if not token:
        return api_response().error(
            "Authorization token required", 
            401, 
            "MISSING_TOKEN"
        )
    
    # Verify Supabase JWT
    payload = SupabaseAuthService.verify_token(token)
    
    if not payload:
        return api_response().error(
            "Invalid or expired token", 
            401, 
            "INVALID_TOKEN"
        )
    
    # Get or create user in backend database
    user, error = SupabaseAuthService.get_or_create_user(payload)
    
    if not user:
        logger.error(f"User provisioning failed during token verification: {error}")
        return api_response().error(
            "Failed to verify user", 
            500, 
            "USER_PROVISION_ERROR"
        )
    
    return api_response().success(data={
        "user": user.to_dict(),
        "token_info": {
            "expires_at": payload.get("exp"),
            "issued_at": payload.get("iat"),
            "provider": user.auth_provider,
            "audience": payload.get("aud")
        }
    })


@auth_bp.route("/session", methods=["GET"])
@require_auth
def get_session_info():
    """Get detailed session information for the current user"""
    user = g.current_user
    payload = g.token_payload
    
    return api_response().success(data={
        "user": user.to_dict(),
        "session": {
            "expires_at": payload.get("exp"),
            "issued_at": payload.get("iat"),
            "provider": user.auth_provider,
            "last_login": user.last_login_at.isoformat() if user.last_login_at else None,
            "session_id": payload.get("session_id")
        }
    })


@auth_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile():
    """Update user profile information (non-auth related fields only)"""
    from app.extensions import db
    
    user = g.current_user
    data = request.get_json() or {}
    
    # Only allow updating certain profile fields
    # Email and auth provider are managed by Supabase
    allowed_fields = {
        'default_click_tracking': bool,
        'default_privacy_level': str,
        'data_retention_days': int,
    }
    
    updated_fields = []
    
    try:
        for field, field_type in allowed_fields.items():
            if field in data:
                value = data[field]
                
                # Type validation
                if value is not None and not isinstance(value, field_type):
                    if field_type == bool:
                        value = str(value).lower() in ('true', '1', 'yes', 'on')
                    elif field_type == int:
                        try:
                            value = int(value)
                        except (ValueError, TypeError):
                            continue
                    elif field_type == str:
                        value = str(value).strip()
                
                # Validate specific fields
                if field == 'default_privacy_level' and value not in ['private', 'unlisted', 'public']:
                    continue
                
                if field == 'data_retention_days' and value is not None and (value < 1 or value > 3650):
                    continue
                
                # Update if different
                if getattr(user, field) != value:
                    setattr(user, field, value)
                    updated_fields.append(field)
        
        if updated_fields:
            db.session.commit()
            logger.info(f"Profile updated for user {user.id}: {updated_fields}")
        
        return api_response().success(
            data={"user": user.to_dict()},
            message=f"Profile updated" if updated_fields else "No changes made"
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Profile update failed for user {user.id}: {e}")
        return api_response().error("Failed to update profile", 500)


@auth_bp.route("/status", methods=["GET"])
def auth_status():
    """
    Public endpoint to check auth system status.
    Does not require authentication.
    """
    from app.services.supabase_auth import SupabaseAuthService
    
    try:
        project_id = SupabaseAuthService.get_supabase_project_id()
        
        # Try to fetch JWKS to verify connectivity
        jwks = SupabaseAuthService.get_jwks()
        jwks_available = bool(jwks.get("keys"))
        
        return api_response().success(data={
            "auth_provider": "supabase",
            "project_configured": bool(project_id),
            "jwks_available": jwks_available,
            "status": "operational" if project_id and jwks_available else "degraded"
        })
        
    except Exception as e:
        logger.error(f"Auth status check failed: {e}")
        return api_response().success(data={
            "auth_provider": "supabase",
            "project_configured": False,
            "jwks_available": False,
            "status": "error"
        })


# Health check endpoint for auth system
@auth_bp.route("/health", methods=["GET"])
def auth_health():
    """Health check for authentication system"""
    from app.services.supabase_auth import SupabaseAuthService
    
    health_data = {
        "service": "supabase_auth",
        "status": "healthy",
        "timestamp": request.environ.get('REQUEST_START_TIME', 'unknown')
    }
    
    try:
        # Quick JWKS fetch test
        jwks = SupabaseAuthService.get_jwks()
        
        if not jwks or not jwks.get("keys"):
            health_data["status"] = "degraded"
            health_data["issue"] = "JWKS unavailable"
        
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["error"] = str(e)
    
    status_code = 200 if health_data["status"] == "healthy" else 503
    return api_response().success(data=health_data), status_code
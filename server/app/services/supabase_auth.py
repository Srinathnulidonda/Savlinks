# server/app/services/supabase_auth.py

import logging
import time
from datetime import datetime
from typing import Optional, Dict, Tuple
from functools import lru_cache

import jwt
import requests
from cryptography.hazmat.backends import default_backend
from cryptography.x509 import load_pem_x509_certificate

from flask import current_app

from app.extensions import db
from app.models.user import User

logger = logging.getLogger(__name__)


class SupabaseAuthService:
    _jwks_cache: Dict = {}
    _jwks_fetch_time: float = 0
    JWKS_CACHE_TTL = 3600  # 1 hour

    @classmethod
    def get_supabase_project_id(cls) -> str:
        """Extract project ID from Supabase URL or config"""
        supabase_url = current_app.config.get("SUPABASE_URL", "")
        if supabase_url:
            # Extract from URL: https://xxx.supabase.co
            import re
            match = re.match(r'https://([^.]+)\.supabase\.co', supabase_url)
            if match:
                return match.group(1)
        
        # Fallback to explicit config
        return current_app.config.get("SUPABASE_PROJECT_ID", "")

    @classmethod
    def get_jwks(cls) -> Dict:
        """Fetch and cache Supabase JWKS"""
        now = time.time()
        
        # Check cache
        if cls._jwks_cache and (now - cls._jwks_fetch_time) < cls.JWKS_CACHE_TTL:
            return cls._jwks_cache
        
        project_id = cls.get_supabase_project_id()
        if not project_id:
            raise ValueError("SUPABASE_PROJECT_ID not configured")
        
        jwks_url = f"https://{project_id}.supabase.co/auth/v1/keys"
        
        try:
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            
            cls._jwks_cache = response.json()
            cls._jwks_fetch_time = now
            
            return cls._jwks_cache
            
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            # Return cached version if available
            if cls._jwks_cache:
                return cls._jwks_cache
            raise

    @classmethod
    def verify_token(cls, token: str) -> Optional[Dict]:
        """Verify Supabase JWT and return decoded payload"""
        try:
            # Get unverified header to find key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            if not kid:
                logger.warning("JWT missing kid header")
                return None
            
            # Get JWKS
            jwks = cls.get_jwks()
            
            # Find matching key
            key_data = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    key_data = key
                    break
            
            if not key_data:
                logger.warning(f"No matching key for kid: {kid}")
                return None
            
            # Convert JWK to public key
            public_key = cls._jwk_to_public_key(key_data)
            
            # Verify and decode
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience="authenticated",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                    "require": ["exp", "sub", "aud"]
                }
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.debug("JWT expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"JWT validation failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected JWT verification error: {e}")
            return None

    @classmethod
    def _jwk_to_public_key(cls, jwk: Dict):
        """Convert JWK to cryptography public key"""
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from base64 import urlsafe_b64decode
        
        def decode_value(val):
            # Add padding if needed
            missing_padding = len(val) % 4
            if missing_padding:
                val += '=' * (4 - missing_padding)
            return int.from_bytes(urlsafe_b64decode(val), 'big')
        
        e = decode_value(jwk['e'])
        n = decode_value(jwk['n'])
        
        public_numbers = rsa.RSAPublicNumbers(e, n)
        public_key = public_numbers.public_key(default_backend())
        
        return public_key

    @classmethod
    def get_or_create_user(cls, token_payload: Dict) -> Tuple[Optional[User], Optional[str]]:
        """Get existing user or create new one from token payload"""
        user_id = token_payload.get("sub")
        if not user_id:
            return None, "Invalid token: missing user ID"
        
        email = token_payload.get("email")
        if not email:
            return None, "Invalid token: missing email"
        
        # Extract user metadata
        user_metadata = token_payload.get("user_metadata", {})
        app_metadata = token_payload.get("app_metadata", {})
        
        # Determine auth provider
        auth_provider = "email"
        if app_metadata.get("provider") == "google":
            auth_provider = "google"
        elif user_metadata.get("iss") and "google" in user_metadata.get("iss"):
            auth_provider = "google"
        
        # Extract profile info
        name = (
            user_metadata.get("full_name") or 
            user_metadata.get("name") or 
            email.split("@")[0].replace(".", " ").title()
        )
        
        avatar_url = (
            user_metadata.get("avatar_url") or 
            user_metadata.get("picture")
        )
        
        try:
            # Check if user exists
            user = User.query.get(user_id)
            
            if user:
                # Update last login
                user.last_login_at = datetime.utcnow()
                
                # Update profile if changed
                if user.email != email:
                    user.email = email
                if name and user.name != name:
                    user.name = name
                if avatar_url and user.avatar_url != avatar_url:
                    user.avatar_url = avatar_url
                if user.auth_provider != auth_provider:
                    user.auth_provider = auth_provider
                
                db.session.commit()
                logger.info(f"User logged in: {user_id}")
                
            else:
                # Create new user
                user = User(
                    id=user_id,
                    email=email,
                    name=name,
                    avatar_url=avatar_url,
                    auth_provider=auth_provider
                )
                user.last_login_at = datetime.utcnow()
                
                db.session.add(user)
                db.session.commit()
                
                logger.info(f"New user created: {user_id} ({email})")
                
                # Optional: Send welcome email
                try:
                    from app.services.email_service import get_email_service
                    email_service = get_email_service()
                    email_service.send_welcome_email(email, user_name=name)
                except Exception as e:
                    logger.warning(f"Welcome email failed: {e}")
            
            return user, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"User provisioning failed: {e}")
            return None, "Failed to provision user"
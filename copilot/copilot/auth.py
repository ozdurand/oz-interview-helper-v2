"""Sign-in for the copilot API. Two modes, chosen by AUTH_MODE:

  token  (default)  Authorization: Bearer <COPILOT_TOKEN>. One long random
                    secret, compared in constant time. Good for a single user.
  entra             Microsoft Entra ID access tokens, verified against the
                    tenant's signing keys:
                      ENTRA_TENANT_ID   directory (tenant) ID
                      ENTRA_AUDIENCE    the API's application ID URI or client ID
                      ENTRA_ALLOWED_OIDS  optional comma list of user object IDs
                                          allowed in (everyone else gets 403)

Nothing is ever open: if the mode's settings are missing, every protected
request is refused.
"""
from __future__ import annotations

import hmac
import os
from dataclasses import dataclass

from fastapi import Header, HTTPException, status


@dataclass
class Caller:
    subject: str
    mode: str


_jwks_client = None


def _jwks():
    global _jwks_client
    if _jwks_client is None:
        import jwt
        tenant = os.environ["ENTRA_TENANT_ID"]
        _jwks_client = jwt.PyJWKClient(f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys", cache_keys=True)
    return _jwks_client


def _unauthorized(msg: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, msg, headers={"WWW-Authenticate": "Bearer"})


def verify(authorization: str | None) -> Caller:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("sign-in required")
    token = authorization.split(" ", 1)[1].strip()
    mode = os.environ.get("AUTH_MODE", "token").lower()

    if mode == "token":
        expected = os.environ.get("COPILOT_TOKEN", "")
        if len(expected) < 24:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "COPILOT_TOKEN is not set (24+ characters)")
        if not hmac.compare_digest(token.encode(), expected.encode()):
            raise _unauthorized("invalid token")
        return Caller(subject="owner", mode="token")

    if mode == "entra":
        import jwt
        tenant, audience = os.environ.get("ENTRA_TENANT_ID"), os.environ.get("ENTRA_AUDIENCE")
        if not tenant or not audience:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "ENTRA_TENANT_ID and ENTRA_AUDIENCE are not set")
        try:
            key = _jwks().get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, key, algorithms=["RS256"], audience=audience,
                                issuer=f"https://login.microsoftonline.com/{tenant}/v2.0",
                                options={"require": ["exp", "iss", "aud"]})
        except Exception:
            raise _unauthorized("invalid Entra ID token")
        allowed = [x.strip() for x in os.environ.get("ENTRA_ALLOWED_OIDS", "").split(",") if x.strip()]
        if allowed and claims.get("oid") not in allowed:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "this account is not allowed")
        return Caller(subject=claims.get("oid") or claims.get("sub", ""), mode="entra")

    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"unknown AUTH_MODE {mode!r}")


def require_caller(authorization: str | None = Header(default=None)) -> Caller:
    return verify(authorization)

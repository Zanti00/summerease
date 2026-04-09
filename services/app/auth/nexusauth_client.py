import httpx
from functools import lru_cache
from ..core.config import get_settings
from .schemas import (
    LoginRequest, MFAVerifyRequest, MFAResendRequest, 
    SignupRequest, ForgotPasswordRequest, ResetPasswordRequest
)

class NexusAuthClient:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.NEXUSAUTH_BASE_URL.rstrip("/")
        print(f"DEBUG: Initializing NexusAuthClient with base_url: {self.base_url}")
        self.api_key = settings.NEXUSAUTH_API_KEY
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"X-API-Key": self.api_key},
            timeout=10.0
        )

    async def login(self, payload: LoginRequest):
        response = await self.client.post("/auth/login", json=payload.model_dump())
        response.raise_for_status()
        return response.json()

    async def verify_mfa(self, payload: MFAVerifyRequest, auth_header: str = None):
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        response = await self.client.post("/auth/mfa/verify", json=payload.model_dump(), headers=headers)
        response.raise_for_status()
        return response.json()

    async def resend_otp(self, payload: MFAResendRequest):
        response = await self.client.post("/auth/mfa/resend", json=payload.model_dump())
        response.raise_for_status()
        return response.json()

    async def signup(self, payload: SignupRequest):
        response = await self.client.post("/auth/register", json=payload.model_dump())
        response.raise_for_status()
        return response.json()

    async def forgot_password(self, payload: ForgotPasswordRequest):
        response = await self.client.post("/auth/forgot-password", json=payload.model_dump())
        response.raise_for_status()
        return response.json()

    async def reset_password(self, payload: ResetPasswordRequest):
        response = await self.client.post("/auth/reset-password", json=payload.model_dump())
        response.raise_for_status()
        return response.json()

    async def logout(self, auth_header: str):
        response = await self.client.post(
            "/auth/logout", 
            json={},
            headers={"Authorization": auth_header}
        )
        response.raise_for_status()
        return response.json()

    async def get_me(self, auth_header: str):
        response = await self.client.get(
            "/auth/me",
            headers={"Authorization": auth_header}
        )
        response.raise_for_status()
        return response.json()

    # MFA Enrollment and Disable (from mfaActions.ts)
    async def enroll_mfa(self, auth_header: str):
        response = await self.client.post(
            "/auth/mfa/enroll",
            json={},
            headers={"Authorization": auth_header}
        )
        response.raise_for_status()
        return response.json()

    async def disable_mfa(self, token: str, auth_header: str):
        response = await self.client.post(
            "/auth/mfa/disable",
            json={"token": token},
            headers={"Authorization": auth_header}
        )
        response.raise_for_status()
        return response.json()

# @lru_cache(maxsize=1)
def get_nexusauth_client():
    return NexusAuthClient()

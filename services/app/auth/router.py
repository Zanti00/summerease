from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Optional
from .schemas import (
    LoginRequest, MFAVerifyRequest, MFAResendRequest,
    SignupRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from .nexusauth_client import get_nexusauth_client, NexusAuthClient
import httpx

router = APIRouter(prefix="/auth", tags=["auth"])

async def handle_nexusauth_error(e: httpx.HTTPStatusError):
    """
    Propagate NexusAuth errors faithfully or map them as requested.
    """
    try:
        detail = e.response.json()
    except Exception:
        detail = {"message": str(e)}
    
    status_code = e.response.status_code
    
    # Custom mapping for MFA verify as requested: 
    # Map 401/410/422 on MFA verify to HTTP 400
    if status_code in [401, 410, 422]:
        status_code = 400
        
    raise HTTPException(status_code=status_code, detail=detail)

@router.post("/login")
async def login(payload: LoginRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.login(payload)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/mfa/verify")
async def verify_mfa(
    payload: MFAVerifyRequest, 
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    try:
        return await client.verify_mfa(payload, authorization)
    except httpx.HTTPStatusError as e:
        # Special mapping for MFA verify
        detail = e.response.json() if e.response.content else {"message": str(e)}
        if e.response.status_code in [401, 410, 422]:
            raise HTTPException(status_code=400, detail=detail)
        raise HTTPException(status_code=e.response.status_code, detail=detail)

@router.post("/mfa/resend")
async def resend_otp(payload: MFAResendRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.resend_otp(payload)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/register")
async def register(payload: SignupRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.signup(payload)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.forgot_password(payload)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.reset_password(payload)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/logout")
async def logout(
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        return await client.logout(authorization)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.get("/me")
async def get_me(
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        return await client.get_me(authorization)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/mfa/enroll")
async def enroll_mfa(
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        return await client.enroll_mfa(authorization)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

@router.post("/mfa/disable")
async def disable_mfa(
    payload: dict, # token: str
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        return await client.disable_mfa(payload.get("token"), authorization)
    except httpx.HTTPStatusError as e:
        await handle_nexusauth_error(e)

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from typing import Optional
from .schemas import (
    LoginRequest, MFAVerifyRequest, MFAEnrollVerifyRequest, MFAResendRequest,
    SignupRequest, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
    VerifyPasswordRequest
)
from .nexusauth_client import get_nexusauth_client, NexusAuthClient
import httpx

router = APIRouter(prefix="/auth", tags=["auth"])

def handle_nexusauth_error(e: httpx.HTTPStatusError):
    """
    Propagate NexusAuth errors faithfully or map them as requested.
    """
    try:
        detail = e.response.json()
    except Exception:
        detail = {"message": str(e)}
    
    status_code = e.response.status_code
        
    return JSONResponse(status_code=status_code, content=detail)

@router.post("/login")
async def login(payload: LoginRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.login(payload)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/mfa/verify")
async def verify_mfa(
    payload: MFAVerifyRequest, 
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    try:
        return await client.verify_mfa(payload, authorization)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/mfa/enroll/verify")
async def verify_enroll_mfa(
    payload: MFAEnrollVerifyRequest,
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        return await client.verify_enroll_mfa(payload, authorization)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/mfa/resend")
async def resend_otp(payload: MFAResendRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.resend_otp(payload)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/register")
async def register(payload: SignupRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.signup(payload)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.forgot_password(payload)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, client: NexusAuthClient = Depends(get_nexusauth_client)):
    try:
        return await client.reset_password(payload)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

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
        return handle_nexusauth_error(e)

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
        return handle_nexusauth_error(e)

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
        return handle_nexusauth_error(e)

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
        return handle_nexusauth_error(e)

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if payload.oldPassword == payload.newPassword:
        return JSONResponse(
            status_code=400,
            content={
                "success": False, 
                "error": {
                    "message": "New password cannot be the same as the current password."
                }
            }
        )

    try:
        return await client.change_password(payload, authorization)
    except httpx.HTTPStatusError as e:
        return handle_nexusauth_error(e)

@router.post("/verify-password")
async def verify_password(
    payload: VerifyPasswordRequest,
    authorization: Optional[str] = Header(None),
    client: NexusAuthClient = Depends(get_nexusauth_client)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        user_data = await client.get_me(authorization)
        user = user_data.get("data", {}).get("user") or user_data.get("user")
        if not user or not user.get("email"):
            raise HTTPException(status_code=401, detail="Failed to retrieve user email")
            
        # Verify by attempting to login
        login_request = LoginRequest(email=user["email"], password=payload.password)
        await client.login(login_request)
        return {"success": True}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid password")
        return handle_nexusauth_error(e)

from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, Literal, Union

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class MFAChallengeResponse(BaseModel):
    mfa_required: bool = True
    mfa_token: str
    method: Literal["email_otp", "sms_otp", "totp"]
    destination_hint: Optional[str] = None
    
    # NOTE: assumed shape — verify against NexusAuth docs
    model_config = ConfigDict(from_attributes=True)

class LoginSuccessResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[dict] = None # Basic user info if returned

    # NOTE: assumed shape — verify against NexusAuth docs
    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    success: bool
    data: Union[MFAChallengeResponse, LoginSuccessResponse]
    message: Optional[str] = None

class MFAVerifyRequest(BaseModel):
    token: str
    mfa_token: Optional[str] = None

class MFAResendRequest(BaseModel):
    mfa_token: str

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

class LogoutRequest(BaseModel):
    # Logout usually just requires the Authorization header, 
    # but we might send a token in the body if NexusAuth expects it.
    token: Optional[str] = None

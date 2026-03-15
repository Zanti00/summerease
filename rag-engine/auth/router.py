# auth/router.py
from datetime import datetime, timedelta

import bcrypt
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS


class RegisterPayload(BaseModel):
    email: EmailStr
    password: str
    username: str | None = None


def create_token(data: dict, expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + expires_delta
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterPayload, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode("utf-8")
    user = User(email=payload.email, password_hash=hashed, username=payload.username)

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"id": user.id, "email": user.email, "username": user.username}


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    
    if not user or not bcrypt.checkpw(form.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    return {
        "access_token": create_token(
            {"sub": str(user.id)}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        ),
        "refresh_token": create_token(
            {"sub": str(user.id), "type": "refresh"}, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        ),
    }

@router.post("/refresh")
async def refresh_token(token: str = Body(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    
    return {
        "access_token": create_token({"sub": user_id}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    }
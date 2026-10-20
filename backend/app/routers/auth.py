from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.security import (
    create_access_token,
    get_current_user_id,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=4, max_length=255)
    password: str = Field(..., min_length=4)


class LoginPayload(BaseModel):
    email: str
    password: str


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at,
    }


@router.post("/register", status_code=201)
def register_user(payload: RegisterPayload, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id, "sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.post("/login")
def login_user(payload: LoginPayload, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"user_id": user.id, "sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@router.get("/me")
def get_me(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = db.query(User).order_by(User.id.asc()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return serialize_user(user)
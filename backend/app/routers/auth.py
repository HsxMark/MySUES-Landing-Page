from fastapi import APIRouter, HTTPException, status
from app.config import get_settings
from app.schemas.auth import LoginRequest, TokenResponse
from app.dependencies import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    if (
        request.username != settings.admin_username
        or request.password != settings.admin_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(request.username)
    return TokenResponse(access_token=access_token)

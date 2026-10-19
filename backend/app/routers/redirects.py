from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.redirect_service import resolve_and_record_click
router = APIRouter(tags=["Redirects"])
@router.get("/{short_code}", include_in_schema=False)
def redirect_short_link(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db),
):
    destination = resolve_and_record_click(
        db,
        short_code,
        referrer=request.headers.get("referer"),
        user_agent=request.headers.get("user-agent"),
    )
    return RedirectResponse(
        url=destination,
        status_code=302,
    )
from io import BytesIO
import qrcode
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Link
from app.security import get_current_user_id

router = APIRouter(prefix="/api/links", tags=["QR Codes"])

@router.get("/{link_id}/qr.png")
def link_qr(link_id: int, owner_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    link = db.scalar(select(Link).where(Link.id == link_id, Link.owner_id == owner_id))
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found")
    # The public URL uses the configured API origin; set PUBLIC_BASE_URL in production.
    from app.config import settings
    public_url = f"{settings.public_base_url.rstrip('/')}/{link.short_code}"
    image = qrcode.make(public_url)
    stream = BytesIO()
    image.save(stream, format="PNG")
    stream.seek(0)
    return StreamingResponse(stream, media_type="image/png", headers={"Content-Disposition": f'inline; filename="link-{link.id}.png"'})
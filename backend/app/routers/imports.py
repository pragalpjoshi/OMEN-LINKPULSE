import csv
import io
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.link import LinkCreate
from app.security import get_current_user_id
from app.services.link_service import create_link
router = APIRouter(prefix="/api/imports", tags=["Imports"])
@router.post("/links")
async def import_links(file: UploadFile = File(...), owner_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Upload a .csv file")
    raw = await file.read(1_000_001)
    if len(raw) > 1_000_000:
        raise HTTPException(status_code=413, detail="CSV file must be 1 MB or smaller")
    try:
        text = raw.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="CSV must be UTF-8 encoded") from exc
    if not reader.fieldnames or "original_url" not in reader.fieldnames:
        raise HTTPException(status_code=422, detail="CSV must include an original_url column")
    created, errors = [], []
    for row_num, row in enumerate(reader, start=2):
        url = (row.get("original_url") or "").strip()
        if not url:
            errors.append({"row": row_num, "error": "original_url is required"})
            continue
        try:
            payload = LinkCreate(original_url=url, custom_alias=(row.get("custom_alias") or "").strip() or None)
            link = create_link(db, owner_id, payload)
            created.append({"row": row_num, "id": link.id, "short_code": link.short_code})
        except Exception as exc:
            db.rollback()
            errors.append({"row": row_num, "error": getattr(exc, "detail", "Could not create link")})
    return {"created_count": len(created), "error_count": len(errors), "created": created, "errors": errors}
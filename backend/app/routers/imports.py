import csv
import io
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign
from app.models.link import Link
from app.routers.link import (
    generate_unique_code,
    get_default_owner_id,
    serialize_link,
    sync_link_tags,
)
from app.schemas.link import ALIAS_REGEX
from app.security import hash_password

router = APIRouter(prefix="/api/imports", tags=["Bulk Import"])


class ImportRowInput(BaseModel):
    row_number: int
    destination_url: str
    custom_alias: Optional[str] = None
    campaign_name: Optional[str] = None
    tags: Optional[str] = None
    expires_at: Optional[str] = None
    click_limit: Optional[str] = None
    password: Optional[str] = None


class BulkCommitPayload(BaseModel):
    rows: List[ImportRowInput]


def validate_csv_rows(raw_rows: List[dict], db: Session):
    existing_codes = {code for (code,) in db.query(Link.short_code).all() if code}
    seen_aliases_in_file = set()
    analyzed_rows = []

    for idx, row in enumerate(raw_rows, start=1):
        dest_url = (row.get("destination_url") or row.get("original_url") or row.get("url") or "").strip()
        alias = (row.get("custom_alias") or row.get("short_code") or row.get("alias") or "").strip()
        campaign_name = (row.get("campaign") or row.get("campaign_name") or "").strip()
        tags_str = (row.get("tags") or "").strip()
        expires_at = (row.get("expires_at") or row.get("expiry") or "").strip()
        click_limit = str(row.get("click_limit") or "").strip()
        password = (row.get("password") or "").strip()

        errors = []
        is_duplicate = False

        if not dest_url:
            errors.append("Missing destination_url / original_url.")
        else:
            parsed = urlparse(dest_url)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                errors.append("Invalid URL format (must start with http:// or https://).")

        if alias:
            if not ALIAS_REGEX.match(alias):
                errors.append("Alias must be 3–30 chars (alphanumeric, '-', '_').")
            elif alias.lower() in {"api", "docs", "redoc", "health", "r"}:
                errors.append(f"Alias '{alias}' is reserved.")
            elif alias in seen_aliases_in_file:
                is_duplicate = True
                errors.append(f"Duplicate alias '{alias}' repeated inside CSV.")
            elif alias in existing_codes:
                is_duplicate = True
                errors.append(f"Alias '{alias}' already exists in MySQL.")
            seen_aliases_in_file.add(alias)

        if click_limit:
            try:
                if int(click_limit) < 1:
                    errors.append("click_limit must be >= 1.")
            except ValueError:
                errors.append("click_limit must be an integer.")

        if expires_at:
            try:
                exp_dt = datetime.fromisoformat(expires_at.replace("Z", ""))
                if exp_dt <= datetime.utcnow():
                    errors.append("expires_at must be a future date.")
            except ValueError:
                errors.append("expires_at must be ISO format (YYYY-MM-DD).")

        if password and len(password) < 4:
            errors.append("password must be at least 4 characters.")

        status = "valid"
        if is_duplicate:
            status = "duplicate"
        elif errors:
            status = "error"

        analyzed_rows.append({
            "row_number": idx,
            "destination_url": dest_url,
            "custom_alias": alias or None,
            "campaign_name": campaign_name or None,
            "tags": tags_str or None,
            "expires_at": expires_at or None,
            "click_limit": click_limit or None,
            "password": password or None,
            "status": status,
            "is_valid": len(errors) == 0,
            "is_duplicate": is_duplicate,
            "errors": errors,
        })

    return {
        "total_rows": len(analyzed_rows),
        "valid_rows": sum(1 for r in analyzed_rows if r["is_valid"]),
        "error_rows": sum(1 for r in analyzed_rows if r["status"] == "error"),
        "duplicate_rows": sum(1 for r in analyzed_rows if r["status"] == "duplicate"),
        "rows": analyzed_rows,
    }


@router.post("/preview")
async def preview_csv_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a valid .csv file.")

    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file is empty or missing headers.")

    normalized_rows = []
    for raw in reader:
        clean = {(k.strip().lower() if k else ""): (v.strip() if v else "") for k, v in raw.items()}
        if any(clean.values()):
            normalized_rows.append(clean)

    return validate_csv_rows(normalized_rows, db)


@router.post("/commit")
def commit_bulk_import(
    payload: BulkCommitPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    owner_id = get_default_owner_id(db)
    raw_dicts = [r.model_dump() for r in payload.rows]
    validation = validate_csv_rows(raw_dicts, db)
    valid_items = [r for r in validation["rows"] if r["is_valid"]]

    if not valid_items:
        raise HTTPException(status_code=400, detail="No valid rows available to import.")

    created_links = []
    campaigns_cache = {c.name.lower(): c for c in db.query(Campaign).all()}

    for item in valid_items:
        campaign_id = None
        cname = item.get("campaign_name")
        if cname:
            key = cname.lower()
            if key not in campaigns_cache:
                new_camp = Campaign(
                    owner_id=owner_id,
                    name=cname,
                    description="Auto-created via CSV bulk import",
                )
                db.add(new_camp)
                db.flush()
                campaigns_cache[key] = new_camp
            campaign_id = campaigns_cache[key].id

        short_code = item.get("custom_alias") or generate_unique_code(db)
        exp_dt = (
            datetime.fromisoformat(item["expires_at"].replace("Z", ""))
            if item.get("expires_at")
            else None
        )
        limit_val = int(item["click_limit"]) if item.get("click_limit") else None
        pw_hash = hash_password(item["password"]) if item.get("password") else None

        link = Link(
            owner_id=owner_id,
            campaign_id=campaign_id,
            original_url=item["destination_url"],
            short_code=short_code,
            status="active",
            expires_at=exp_dt,
            click_limit=limit_val,
            click_count=0,
            password_hash=pw_hash,
        )
        db.add(link)
        db.flush()

        if item.get("tags"):
            tag_list = [t.strip() for t in item["tags"].split(",") if t.strip()]
            sync_link_tags(db, link, tag_list, owner_id)

        created_links.append(link)

    db.commit()
    return {
        "imported_count": len(created_links),
        "skipped_count": len(payload.rows) - len(created_links),
        "links": [serialize_link(l, request) for l in created_links],
    }
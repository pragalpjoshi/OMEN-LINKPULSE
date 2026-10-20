import os
import secrets
import string
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign
from app.models.link import Link, Tag
from app.models.user import User
from app.schemas.link import LinkCreate, LinkUpdate, ALIAS_REGEX
from app.security import hash_password
from app.services.safety_service import analyze_url_safety

router = APIRouter(prefix="/api/links", tags=["Links"])

ALPHABET = string.ascii_letters + string.digits


def get_default_owner_id(db: Session) -> int:
    user = db.query(User).order_by(User.id.asc()).first()
    if not user:
        user = User(
            name="Pragalp Joshi",
            email="admin@linkpulse.dev",
            password_hash=hash_password("admin123"),
            role="admin",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user.id


def generate_unique_code(db: Session, length: int = 6) -> str:
    while True:
        code = "".join(secrets.choice(ALPHABET) for _ in range(length))
        exists = db.query(Link).filter(Link.short_code == code).first()
        if not exists:
            return code


def sync_link_tags(db: Session, link: Link, tag_names: List[str], owner_id: int):
    cleaned = []
    seen = set()
    for t in tag_names or []:
        name = t.strip().lstrip("#").lower()
        if name and name not in seen:
            seen.add(name)
            cleaned.append(name[:100])

    tag_objs = []
    for name in cleaned:
        tag = db.query(Tag).filter(Tag.owner_id == owner_id, Tag.name == name).first()
        if not tag:
            tag = Tag(owner_id=owner_id, name=name)
            db.add(tag)
            db.flush()
        tag_objs.append(tag)

    link.tags = tag_objs


def serialize_link(link: Link, request: Optional[Request] = None) -> dict:
    base_url = os.getenv("BASE_SHORT_URL")
    if not base_url:
        if request is not None:
            base_url = f"{request.url.scheme}://{request.url.netloc}"
        else:
            base_url = "http://127.0.0.1:8000"
    base_url = base_url.rstrip("/")

    safety = analyze_url_safety(link.original_url)
    is_flagged = link.status == "flagged" or safety["is_flagged"]
    clicks = int(link.click_count or 0)
    tag_list = [t.name for t in (link.tags or [])]

    return {
        "id": link.id,
        "owner_id": link.owner_id,
        "title": f"/{link.short_code}",
        "original_url": link.original_url,
        "destination_url": link.original_url,
        "short_code": link.short_code,
        "custom_alias": link.short_code,
        "short_url": f"{base_url}/r/{link.short_code}",
        "campaign_id": link.campaign_id,
        "campaign_name": link.campaign.name if link.campaign else None,
        "status": link.status,
        "expires_at": link.expires_at,
        "click_limit": link.click_limit,
        "click_count": clicks,
        "clicks_count": clicks,
        "has_password": link.has_password,
        "is_active": link.status == "active",
        "is_flagged": is_flagged,
        "flag_reason": safety["flag_reason"] if is_flagged else None,
        "is_expired": link.is_expired,
        "effective_active": link.effective_active,
        "tags": tag_list,
        "created_at": link.created_at or datetime.utcnow(),
    }


@router.get("/check-alias")
def check_alias_availability(
    alias: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    alias = alias.strip()
    if not ALIAS_REGEX.match(alias):
        return {
            "available": False,
            "reason": "Alias must be 3–30 characters using letters, numbers, '-' or '_'.",
        }
    existing = db.query(Link).filter(Link.short_code == alias).first()
    if existing:
        return {"available": False, "reason": "This short code / alias is already taken."}
    return {"available": True, "reason": "Alias is available."}


@router.get("/scan-url")
def scan_url_endpoint(url: str = Query(..., min_length=4)):
    return analyze_url_safety(url)


@router.get("")
def list_links(
    request: Request,
    search: Optional[str] = Query(default=None),
    campaign_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Link)
    if campaign_id is not None:
        if campaign_id == 0:
            query = query.filter(Link.campaign_id.is_(None))
        else:
            query = query.filter(Link.campaign_id == campaign_id)

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Link.short_code.ilike(term)) | (Link.original_url.ilike(term))
        )

    links = query.order_by(Link.created_at.desc()).all()
    results = [serialize_link(l, request) for l in links]

    if tag:
        t_clean = tag.strip().lstrip("#").lower()
        results = [r for r in results if t_clean in r["tags"]]

    if status == "active":
        results = [r for r in results if r["effective_active"]]
    elif status == "disabled":
        results = [r for r in results if r["status"] == "disabled"]
    elif status == "flagged":
        results = [r for r in results if r["is_flagged"]]
    elif status == "inactive":
        results = [r for r in results if not r["effective_active"]]

    return results


@router.post("", status_code=201)
def create_link(
    payload: LinkCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    owner_id = get_default_owner_id(db)

    if payload.expires_at:
        now = datetime.utcnow()
        exp_naive = payload.expires_at.replace(tzinfo=None)
        if exp_naive <= now:
            raise HTTPException(status_code=422, detail="Expiry date must be in the future.")
    else:
        exp_naive = None

    if payload.short_code:
        exists = db.query(Link).filter(Link.short_code == payload.short_code).first()
        if exists:
            raise HTTPException(status_code=409, detail=f"Alias '{payload.short_code}' is already in use.")
        short_code = payload.short_code
    else:
        short_code = generate_unique_code(db)

    if payload.campaign_id is not None:
        campaign = db.query(Campaign).filter(Campaign.id == payload.campaign_id).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Selected campaign does not exist.")

    pw_hash = hash_password(payload.password) if payload.password else None

    new_link = Link(
        owner_id=owner_id,
        campaign_id=payload.campaign_id,
        original_url=payload.original_url,
        short_code=short_code,
        status="active",
        expires_at=exp_naive,
        click_limit=payload.click_limit,
        click_count=0,
        password_hash=pw_hash,
    )
    db.add(new_link)
    db.flush()

    if payload.tags:
        sync_link_tags(db, new_link, payload.tags, owner_id)

    db.commit()
    db.refresh(new_link)
    return serialize_link(new_link, request)


@router.post("/{link_id}/toggle-status")
def toggle_link_status(
    link_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Disables or re-enables a suspicious link by toggling `links.status`
    between 'active' and 'disabled' WITHOUT deleting its historical analytics.
    """
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    link.status = "disabled" if link.status == "active" else "active"
    db.commit()
    db.refresh(link)
    return serialize_link(link, request)


@router.get("/{link_id}")
def get_link(link_id: int, request: Request, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    return serialize_link(link, request)


@router.patch("/{link_id}")
def update_link(
    link_id: int,
    payload: LinkUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    new_url = payload.original_url or payload.destination_url
    if new_url is not None:
        link.original_url = new_url.strip()
    if payload.campaign_id is not None:
        link.campaign_id = None if payload.campaign_id == 0 else payload.campaign_id
    if payload.expires_at is not None:
        link.expires_at = payload.expires_at.replace(tzinfo=None)
    if payload.click_limit is not None:
        link.click_limit = None if payload.click_limit == 0 else payload.click_limit
    if payload.status is not None:
        link.status = payload.status
    elif payload.is_active is not None:
        link.status = "active" if payload.is_active else "disabled"
    if payload.password is not None:
        link.password_hash = hash_password(payload.password) if payload.password else None
    if payload.tags is not None:
        sync_link_tags(db, link, payload.tags, link.owner_id)

    db.commit()
    db.refresh(link)
    return serialize_link(link, request)


@router.delete("/{link_id}")
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    db.delete(link)
    db.commit()
    return {"deleted": True, "id": link_id}
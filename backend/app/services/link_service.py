import re
import secrets
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.models import Campaign, Link
from app.schemas.link import LinkCreate, LinkUpdate
from app.services.safety_service import validate_destination_url
ALIAS_PATTERN = re.compile(r"^[A-Za-z0-9_-]{3,30}$")
def normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value
def validate_expiry(value: datetime | None) -> datetime | None:
    value = normalize_datetime(value)
    if value is not None and value <= datetime.utcnow():
        raise HTTPException(
            status_code=422,
            detail="Expiry must be in the future.",
        )
    return value
def generate_short_code(length: int = 7) -> str:
    alphabet = (
        "abcdefghijklmnopqrstuvwxyz"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789"
    )
    return "".join(secrets.choice(alphabet) for _ in range(length))
def create_link(
    db: Session,
    owner_id: int,
    payload: LinkCreate,
) -> Link:
    if owner_id < 1:
        raise HTTPException(status_code=401, detail="Invalid user.")
    if payload.campaign_id is not None:
        campaign = db.scalar(
            select(Campaign).where(
                Campaign.id == payload.campaign_id,
                Campaign.owner_id == owner_id,
            )
        )
        if campaign is None:
            raise HTTPException(
                status_code=404,
                detail="Campaign not found for this user.",
            )
    alias = payload.custom_alias.strip() if payload.custom_alias else None
    if alias and not ALIAS_PATTERN.fullmatch(alias):
        raise HTTPException(
            status_code=422,
            detail="Alias must contain 3–30 letters, digits, underscores, or hyphens.",
        )
    expiry = validate_expiry(payload.expires_at)
    destination = validate_destination_url(str(payload.original_url))
    if alias:
        exists = db.scalar(
            select(Link.id).where(Link.short_code == alias)
        )
        if exists is not None:
            raise HTTPException(
                status_code=409,
                detail="This alias is already in use.",
            )
    for _ in range(5):
        code = alias or generate_short_code()
        link = Link(
            owner_id=owner_id,
            campaign_id=payload.campaign_id,
            original_url=destination,
            short_code=code,
            status="active",
            expires_at=expiry,
            click_limit=payload.click_limit,
            click_count=0,
        )
        db.add(link)
        try:
            db.commit()
            db.refresh(link)
            return link
        except IntegrityError as exc:
            db.rollback()
            if alias:
                raise HTTPException(
                    status_code=409,
                    detail="This alias is already in use.",
                ) from exc
    raise HTTPException(
        status_code=503,
        detail="Could not generate a unique short code. Retry the request.",
    )
def get_link(db: Session, owner_id: int, link_id: int) -> Link:
    link = db.scalar(
        select(Link).where(
            Link.id == link_id,
            Link.owner_id == owner_id,
        )
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Link not found.")
    return link
def list_links(
    db: Session,
    owner_id: int,
    skip: int = 0,
    limit: int = 50,
) -> list[Link]:
    statement = (
        select(Link)
        .where(Link.owner_id == owner_id)
        .order_by(Link.created_at.desc(), Link.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(statement).all())
def update_link(
    db: Session,
    owner_id: int,
    link_id: int,
    payload: LinkUpdate,
) -> Link:
    link = get_link(db, owner_id, link_id)
    changes = payload.model_dump(exclude_unset=True)
    if "original_url" in changes and changes["original_url"] is not None:
        link.original_url = validate_destination_url(
            str(changes["original_url"])
        )
    if "expires_at" in changes:
        link.expires_at = validate_expiry(changes["expires_at"])
    if changes.get("status") is not None:
        link.status = changes["status"]
    if "click_limit" in changes:
        new_limit = changes["click_limit"]
        if new_limit is not None and new_limit < link.click_count:
            raise HTTPException(
                status_code=422,
                detail="Click limit cannot be lower than the current click count.",
            )
        link.click_limit = new_limit
    try:
        db.commit()
        db.refresh(link)
        return link
    except Exception:
        db.rollback()
        raise
def deactivate_link(
    db: Session,
    owner_id: int,
    link_id: int,
) -> Link:
    link = get_link(db, owner_id, link_id)
    link.status = "disabled"
    db.commit()
    db.refresh(link)
    return link
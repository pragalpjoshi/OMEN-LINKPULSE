from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import ClickEvent, Link
def resolve_and_record_click(
    db: Session,
    short_code: str,
    *,
    referrer: str | None = None,
    user_agent: str | None = None,
) -> str:
    link = db.scalar(
        select(Link)
        .where(Link.short_code == short_code)
        .with_for_update()
    )
    if link is None:
        raise HTTPException(status_code=404, detail="Short link not found.")
    now = datetime.utcnow()
    if link.status != "active":
        raise HTTPException(status_code=410, detail="This link is disabled.")
    if link.expires_at is not None and link.expires_at <= now:
        raise HTTPException(status_code=410, detail="This link has expired.")
    if link.click_limit is not None and link.click_count >= link.click_limit:
        raise HTTPException(status_code=410, detail="This link reached its click limit.")
    agent = (user_agent or "")[:2000]
    lowered = agent.lower()
    bot_tokens = (
        "bot", "spider", "crawler", "preview",
        "facebookexternalhit", "slackbot", "discordbot",
    )
    is_bot = any(token in lowered for token in bot_tokens)
    if any(token in lowered for token in ("iphone", "android", "mobile", "ipad")):
        device_type = "mobile"
    elif agent:
        device_type = "desktop"
    else:
        device_type = "unknown"
    browser = "unknown"
    browser_tokens = (
        ("edg/", "Edge"),
        ("opr/", "Opera"),
        ("chrome/", "Chrome"),
        ("firefox/", "Firefox"),
        ("safari/", "Safari"),
    )
    for token, name in browser_tokens:
        if token in lowered:
            browser = name
            break
    link.click_count += 1
    db.add(
        ClickEvent(
            link_id=link.id,
            referrer=referrer[:2000] if referrer else None,
            user_agent=agent or None,
            device_type=device_type,
            browser=browser,
            country=None,
            is_bot=is_bot,
        )
    )
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return link.original_url
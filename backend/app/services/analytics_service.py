from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models import ClickEvent, Link
def _breakdown(db: Session, link_id: int, column, limit: int = 5):
    statement = (
        select(
            column.label("name"),
            func.count(ClickEvent.id).label("clicks"),
        )
        .join(Link, ClickEvent.link_id == Link.id)
        .where(
            Link.id == link_id,
            column.is_not(None),
            column != "",
            ClickEvent.is_bot.is_(False),
        )
        .group_by(column)
        .order_by(func.count(ClickEvent.id).desc())
        .limit(limit)
    )
    return [
        {"name": row.name, "clicks": row.clicks}
        for row in db.execute(statement)
    ]
def get_overview(db: Session, owner_id: int):
    total_links = db.scalar(
        select(func.count(Link.id)).where(Link.owner_id == owner_id)
    ) or 0
    total_clicks = db.scalar(
        select(func.count(ClickEvent.id))
        .join(Link, ClickEvent.link_id == Link.id)
        .where(Link.owner_id == owner_id)
    ) or 0
    bot_clicks = db.scalar(
        select(func.count(ClickEvent.id))
        .join(Link, ClickEvent.link_id == Link.id)
        .where(Link.owner_id == owner_id, ClickEvent.is_bot.is_(True))
    ) or 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    clicks_last_7_days = db.scalar(
        select(func.count(ClickEvent.id))
        .join(Link, ClickEvent.link_id == Link.id)
        .where(
            Link.owner_id == owner_id,
            ClickEvent.clicked_at >= cutoff,
        )
    ) or 0
    return {
        "total_links": total_links,
        "total_clicks": total_clicks,
        "bot_clicks": bot_clicks,
        "human_clicks": total_clicks - bot_clicks,
        "clicks_last_7_days": clicks_last_7_days,
    }
def get_link_analytics(db: Session, owner_id: int, link_id: int):
    link = db.scalar(
        select(Link).where(
            Link.id == link_id,
            Link.owner_id == owner_id,
        )
    )
    if link is None:
        return None
    base_filter = (
        select(func.count(ClickEvent.id))
        .where(ClickEvent.link_id == link_id)
    )
    total_clicks = db.scalar(base_filter) or 0
    human_clicks = db.scalar(
        select(func.count(ClickEvent.id)).where(
            ClickEvent.link_id == link_id,
            ClickEvent.is_bot.is_(False),
        )
    ) or 0
    bot_clicks = db.scalar(
        select(func.count(ClickEvent.id)).where(
            ClickEvent.link_id == link_id,
            ClickEvent.is_bot.is_(True),
        )
    ) or 0
    date_expr = func.date(ClickEvent.clicked_at)

    daily_statement = (
        select(
            date_expr.label("day"),
            func.count(ClickEvent.id).label("clicks"),
        )
        .where(
            ClickEvent.link_id == link_id,
            ClickEvent.is_bot.is_(False),
        )
        .group_by(date_expr)
        .order_by(date_expr)
    )
    daily_clicks = [
        {"date": str(row.day), "clicks": row.clicks}
        for row in db.execute(daily_statement)
    ]
    return {
        "link_id": link.id,
        "short_code": link.short_code,
        "original_url": link.original_url,
        "total_clicks": total_clicks,
        "human_clicks": human_clicks,
        "bot_clicks": bot_clicks,
        "top_referrers": _breakdown(db, link_id, ClickEvent.referrer),
        "devices": _breakdown(db, link_id, ClickEvent.device_type),
        "browsers": _breakdown(db, link_id, ClickEvent.browser),
        "countries": _breakdown(db, link_id, ClickEvent.country),
        "daily_clicks": daily_clicks,
    }
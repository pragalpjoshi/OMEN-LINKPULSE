from collections import Counter
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.click_event import ClickEvent
from app.models.link import Link
from app.routers.link import serialize_link

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
def get_dashboard_metrics(
    request: Request,
    days: int = Query(default=14, ge=1, le=90),
    db: Session = Depends(get_db),
):
    links = db.query(Link).order_by(Link.created_at.desc()).all()
    serialized_links = [serialize_link(l, request) for l in links]

    total_links = len(serialized_links)
    total_clicks = sum(l["clicks_count"] for l in serialized_links)
    active_links = sum(1 for l in serialized_links if l["effective_active"])
    disabled_links = sum(1 for l in serialized_links if l["status"] == "disabled")
    flagged_links = sum(1 for l in serialized_links if l["is_flagged"])
    inactive_links = total_links - active_links

    top_links = sorted(serialized_links, key=lambda x: x["clicks_count"], reverse=True)[:8]

    recent_clicks = (
        db.query(ClickEvent)
        .order_by(ClickEvent.clicked_at.desc())
        .limit(15)
        .all()
    )
    recent_activity = []
    for ev in recent_clicks:
        lnk = ev.link
        recent_activity.append({
            "id": ev.id,
            "type": "click",
            "link_id": ev.link_id,
            "short_code": lnk.short_code if lnk else "deleted",
            "destination_url": lnk.original_url if lnk else "",
            "referrer": ev.referrer or "Direct",
            "device": ev.device_type or "Desktop",
            "device_type": ev.device_type or "Desktop",
            "browser": ev.browser or "Chrome",
            "country": ev.country or "India",
            "is_bot": bool(ev.is_bot),
            "timestamp": ev.clicked_at,
        })

    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start_date, datetime.min.time())

    events_in_window = (
        db.query(ClickEvent)
        .filter(ClickEvent.clicked_at >= start_dt)
        .all()
    )
    counts_by_day = Counter(
        ev.clicked_at.date().isoformat() for ev in events_in_window if ev.clicked_at
    )
    clicks_over_time = [
        {
            "date": (start_date + timedelta(days=i)).isoformat(),
            "clicks": counts_by_day.get((start_date + timedelta(days=i)).isoformat(), 0),
        }
        for i in range(days)
    ]

    bot_clicks = sum(1 for ev in events_in_window if ev.is_bot)

    return {
        "total_links": total_links,
        "total_clicks": total_clicks,
        "active_links": active_links,
        "disabled_links": disabled_links,
        "flagged_links": flagged_links,
        "inactive_links": inactive_links,
        "bot_clicks_in_window": bot_clicks,
        "avg_clicks_per_link": round(total_clicks / total_links, 2) if total_links else 0,
        "top_performing_links": top_links,
        "recent_activity": recent_activity,
        "clicks_over_time": clicks_over_time,
    }


@router.get("/links/{link_id}")
def get_link_analytics(
    link_id: int,
    request: Request,
    days: int = Query(default=14, ge=1, le=90),
    db: Session = Depends(get_db),
):
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")

    events = (
        db.query(ClickEvent)
        .filter(ClickEvent.link_id == link_id)
        .order_by(ClickEvent.clicked_at.desc())
        .all()
    )

    ref_counter = Counter(ev.referrer or "Direct" for ev in events)
    dev_counter = Counter(ev.device_type or "Desktop" for ev in events)
    browser_counter = Counter(ev.browser or "Chrome" for ev in events)
    country_counter = Counter(ev.country or "India" for ev in events)

    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days - 1)
    day_counter = Counter(
        ev.clicked_at.date().isoformat()
        for ev in events
        if ev.clicked_at and ev.clicked_at.date() >= start_date
    )
    time_series = [
        {
            "date": (start_date + timedelta(days=i)).isoformat(),
            "clicks": day_counter.get((start_date + timedelta(days=i)).isoformat(), 0),
        }
        for i in range(days)
    ]

    click_history = [
        {
            "id": ev.id,
            "clicked_at": ev.clicked_at,
            "referrer": ev.referrer or "Direct",
            "device": ev.device_type or "Desktop",
            "device_type": ev.device_type or "Desktop",
            "browser": ev.browser or "Chrome",
            "country": ev.country or "India",
            "is_bot": bool(ev.is_bot),
            "user_agent": ev.user_agent or "Mozilla/5.0",
        }
        for ev in events[:100]
    ]

    total = len(events)
    bot_count = sum(1 for ev in events if ev.is_bot)
    human_count = total - bot_count

    def format_breakdown(counter: Counter):
        return [
            {
                "name": k,
                "count": v,
                "percentage": round((v / total) * 100, 1) if total else 0.0,
            }
            for k, v in counter.most_common()
        ]

    return {
        "link": serialize_link(link, request),
        "total_recorded_clicks": total,
        "human_clicks": human_count,
        "bot_clicks": bot_count,
        "referrers": format_breakdown(ref_counter),
        "devices": format_breakdown(dev_counter),
        "browsers": format_breakdown(browser_counter),
        "countries": format_breakdown(country_counter),
        "time_series": time_series,
        "click_history": click_history,
    }
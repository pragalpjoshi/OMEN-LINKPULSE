from datetime import datetime
from typing import Optional
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.click_event import ClickEvent
from app.models.link import Link
from app.security import verify_password

router = APIRouter(tags=["Redirects"])

BOT_SIGNATURES = ("bot", "crawler", "spider", "curl", "wget", "python-requests", "headless", "facebookexternalhit")


def parse_user_agent(ua_string: str):
    ua = (ua_string or "").lower()
    is_bot = any(sig in ua for sig in BOT_SIGNATURES)

    if "ipad" in ua or "tablet" in ua:
        device_type = "Tablet"
    elif "mobi" in ua or "android" in ua or "iphone" in ua:
        device_type = "Mobile"
    else:
        device_type = "Desktop"

    if "edg/" in ua or "edge" in ua:
        browser = "Edge"
    elif "opr/" in ua or "opera" in ua:
        browser = "Opera"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "chrome" in ua and "safari" in ua:
        browser = "Chrome"
    elif "safari" in ua:
        browser = "Safari"
    else:
        browser = "Other"

    return device_type, browser, is_bot


def normalize_referrer(ref: Optional[str]) -> str:
    if not ref:
        return "Direct"
    parsed = urlparse(ref)
    if parsed.netloc:
        return parsed.netloc.replace("www.", "")
    return ref[:100]


def record_click(
    db: Session,
    link: Link,
    request: Request,
    override_referrer: Optional[str] = None,
    override_device: Optional[str] = None,
    override_browser: Optional[str] = None,
    override_country: Optional[str] = None,
):
    ua_str = request.headers.get("user-agent", "")
    device_type, browser, is_bot = parse_user_agent(ua_str)
    ref_header = override_referrer or request.headers.get("referer")
    referrer = normalize_referrer(ref_header)
    country = (
        override_country
        or request.headers.get("cf-ipcountry")
        or request.headers.get("x-country")
        or "India"
    )

    event = ClickEvent(
        link_id=link.id,
        clicked_at=datetime.utcnow(),
        referrer=referrer,
        user_agent=ua_str[:500] if ua_str else "Mozilla/5.0",
        device_type=override_device or device_type,
        browser=override_browser or browser,
        country=country,
        is_bot=is_bot,
    )
    link.click_count = int(link.click_count or 0) + 1
    db.add(event)
    db.commit()


def render_status_page(title: str, subtitle: str, badge_color: str = "#ef4444") -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{title} — OMEN LinkPulse</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <style>
            body {{ font-family: system-ui, sans-serif; background:#070b14; color:#f8fafc; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }}
            .card {{ background:#0f172a; border:1px solid #1e293b; padding:2.2rem; border-radius:16px; width:100%; max-width:420px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.5); }}
            .pill {{ display:inline-block; padding:0.25rem 0.75rem; border-radius:999px; background:{badge_color}22; color:{badge_color}; font-weight:700; font-size:0.78rem; margin-bottom:0.75rem; }}
            p {{ color:#94a3b8; line-height:1.5; }}
        </style>
    </head>
    <body>
        <div class="card">
            <span class="pill">OMEN LINKPULSE SHIELD</span>
            <h2 style="margin:0.25rem 0 0.75rem">{title}</h2>
            <p>{subtitle}</p>
        </div>
    </body>
    </html>
    """


@router.get("/r/{short_code}")
def redirect_short_link(
    short_code: str,
    request: Request,
    password: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    link = db.query(Link).filter(Link.short_code == short_code).first()
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found.")

    if link.status != "active":
        return HTMLResponse(
            render_status_page(
                "Link Disabled by Security / Admin",
                "This short link has been disabled. All historical analytics remain preserved in the LinkPulse dashboard.",
                "#ef4444",
            ),
            status_code=410,
        )

    if link.expires_at and datetime.utcnow() >= link.expires_at.replace(tzinfo=None):
        return HTMLResponse(
            render_status_page(
                "Link Expired",
                f"This link expired on {link.expires_at.strftime('%Y-%m-%d %H:%M UTC')}.",
                "#f59e0b",
            ),
            status_code=410,
        )

    if link.click_limit is not None and int(link.click_count or 0) >= int(link.click_limit):
        return HTMLResponse(
            render_status_page(
                "Maximum Click Limit Reached",
                f"This link reached its cap of {link.click_limit} visits.",
                "#f59e0b",
            ),
            status_code=410,
        )

    if link.has_password:
        if not password or not verify_password(password, link.password_hash):
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Protected Link — OMEN LinkPulse</title>
                <meta name="viewport" content="width=device-width,initial-scale=1"/>
                <style>
                    body {{ font-family: system-ui, sans-serif; background:#070b14; color:#f8fafc; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }}
                    .card {{ background:#0f172a; border:1px solid #1e293b; padding:2rem; border-radius:14px; width:100%; max-width:380px; box-shadow:0 20px 50px rgba(0,0,0,0.5); }}
                    input {{ width:100%; box-sizing:border-box; padding:0.75rem; border-radius:8px; border:1px solid #334155; background:#090d16; color:#fff; margin:1rem 0; }}
                    button {{ width:100%; padding:0.75rem; border:none; border-radius:8px; background:#6366f1; color:#fff; font-weight:600; cursor:pointer; }}
                    .err {{ color:#f87171; font-size:0.85rem; }}
                </style>
            </head>
            <body>
                <form class="card" method="GET" action="/r/{short_code}">
                    <h3 style="margin-top:0">🔒 Password Protected Link</h3>
                    <p style="color:#94a3b8;font-size:0.9rem">Enter the password to unlock <strong>/{short_code}</strong>.</p>
                    {"<p class='err'>Invalid password. Please try again.</p>" if password else ""}
                    <input type="password" name="password" placeholder="Enter password..." required autofocus />
                    <button type="submit">Unlock & Continue</button>
                </form>
            </body>
            </html>
            """
            return HTMLResponse(content=html, status_code=401)

    record_click(db, link, request)
    return RedirectResponse(url=link.original_url, status_code=307)


@router.post("/api/links/{link_id}/simulate-click")
def simulate_click_event(
    link_id: int,
    request: Request,
    referrer: str = Query(default="Direct"),
    device: str = Query(default="Mobile"),
    browser: str = Query(default="Safari"),
    country: str = Query(default="India"),
    db: Session = Depends(get_db),
):
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    if not link.effective_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot record new public visits while link is disabled, expired, or at its click limit.",
        )

    record_click(
        db,
        link,
        request,
        override_referrer=referrer,
        override_device=device,
        override_browser=browser,
        override_country=country,
    )
    return {"ok": True, "clicks_count": int(link.click_count or 0)}
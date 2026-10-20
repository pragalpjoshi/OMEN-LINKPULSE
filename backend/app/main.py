from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import Campaign, ClickEvent, Link, LinkTag, Tag, User
from app.routers import analytics, auth, campaigns, imports, link, qr, redirects
from app.routers.link import get_default_owner_id, sync_link_tags

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OMEN-LINKPULSE API",
    version="4.0.0",
    description="Full-Stack URL Shortener, QR Studio, Campaign Manager & Analytics Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(analytics.router)
app.include_router(link.router)
app.include_router(campaigns.router)
app.include_router(imports.router)
app.include_router(qr.router)
app.include_router(redirects.router)


@app.on_event("startup")
def seed_mysql_initial_data():
    db = SessionLocal()
    try:
        owner_id = get_default_owner_id(db)
        if db.query(Link).count() > 0:
            return

        c_launch = Campaign(
            owner_id=owner_id,
            name="Q4 Product Launch",
            description="Main website release, social bio links, and printed QR flyers",
        )
        c_growth = Campaign(
            owner_id=owner_id,
            name="Newsletter & Social Growth",
            description="Weekly digest referrals and partner campaigns",
        )
        db.add_all([c_launch, c_growth])
        db.flush()

        l1 = Link(
            owner_id=owner_id,
            campaign_id=c_launch.id,
            original_url="https://github.com/features",
            short_code="launch-26",
            status="active",
            click_limit=1000,
            expires_at=datetime.utcnow() + timedelta(days=45),
            click_count=5,
        )
        l2 = Link(
            owner_id=owner_id,
            campaign_id=c_growth.id,
            original_url="https://developer.mozilla.org/en-US/",
            short_code="dev-docs",
            status="active",
            expires_at=datetime.utcnow() + timedelta(days=30),
            click_count=3,
        )
        db.add_all([l1, l2])
        db.flush()

        sync_link_tags(db, l1, ["launch", "marketing", "qr"], owner_id)
        sync_link_tags(db, l2, ["docs", "newsletter"], owner_id)

        now = datetime.utcnow()
        sample_events = [
            (l1.id, now - timedelta(days=4), "instagram.com", "Mobile", "Safari", "India", False),
            (l1.id, now - timedelta(days=3), "Direct", "Mobile", "Chrome", "India", False),
            (l1.id, now - timedelta(days=2), "linkedin.com", "Desktop", "Chrome", "United States", False),
            (l1.id, now - timedelta(days=1), "whatsapp.com", "Mobile", "Chrome", "India", False),
            (l1.id, now - timedelta(hours=3), "Direct", "Desktop", "Edge", "India", False),
            (l2.id, now - timedelta(days=2), "github.com", "Desktop", "Chrome", "India", False),
            (l2.id, now - timedelta(days=1), "Direct", "Mobile", "Chrome", "Singapore", False),
            (l2.id, now - timedelta(hours=2), "linkedin.com", "Desktop", "Firefox", "Germany", False),
        ]
        for lid, ts, ref, dev, brw, country, is_bot in sample_events:
            db.add(
                ClickEvent(
                    link_id=lid,
                    clicked_at=ts,
                    referrer=ref,
                    user_agent="Mozilla/5.0",
                    device_type=dev,
                    browser=brw,
                    country=country,
                    is_bot=is_bot,
                )
            )

        db.commit()
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "MySQL Linkpulse"}
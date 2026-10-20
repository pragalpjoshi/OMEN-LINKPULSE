from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine
from app.models import Campaign, ClickEvent, Link, LinkTag, Tag, User
from app.routers import analytics, campaigns, imports, link, qr, redirects
from app.routers.link import get_default_owner_id, sync_link_tags

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="OMEN-LINKPULSE API (MySQL Edition)",
    version="3.0.0",
    description="Full-stack LinkPulse Engine backed by MySQL",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

        c_techfest = Campaign(
            owner_id=owner_id,
            name="TechFest 2026",
            description="Campus Hackathon Registration, Printed Poster QR Codes & Keynote Links",
        )
        c_sponsors = Campaign(
            owner_id=owner_id,
            name="Sponsor & Partner Outreach",
            description="Sponsor prospectus and partner onboarding links",
        )
        db.add_all([c_techfest, c_sponsors])
        db.flush()

        l1 = Link(
            owner_id=owner_id,
            campaign_id=c_techfest.id,
            original_url="https://techfest.org/register?event=hackathon2026",
            short_code="techfest-26",
            status="active",
            click_limit=1000,
            expires_at=datetime.utcnow() + timedelta(days=45),
            click_count=6,
        )
        l2 = Link(
            owner_id=owner_id,
            campaign_id=c_techfest.id,
            original_url="https://github.com/topics/hackathon-2026",
            short_code="tf26-poster",
            status="active",
            expires_at=datetime.utcnow() + timedelta(days=30),
            click_count=3,
        )
        l3 = Link(
            owner_id=owner_id,
            campaign_id=c_techfest.id,
            original_url="http://192.168.1.99/free-crypto/login-verify",
            short_code="tf26-prize-claim",
            status="disabled",  # Disabled suspicious link with preserved analytics!
            click_count=2,
        )
        db.add_all([l1, l2, l3])
        db.flush()

        sync_link_tags(db, l1, ["techfest2026", "registration", "poster"], owner_id)
        sync_link_tags(db, l2, ["techfest2026", "qr-poster"], owner_id)
        sync_link_tags(db, l3, ["quarantined", "suspicious"], owner_id)

        now = datetime.utcnow()
        sample_events = [
            (l1.id, now - timedelta(days=5), "instagram.com", "Mobile", "Safari", "India", False),
            (l1.id, now - timedelta(days=4), "Direct", "Mobile", "Chrome", "India", False),
            (l1.id, now - timedelta(days=3), "linkedin.com", "Desktop", "Chrome", "United States", False),
            (l1.id, now - timedelta(days=2), "whatsapp.com", "Mobile", "Chrome", "India", False),
            (l1.id, now - timedelta(days=1), "Direct", "Desktop", "Edge", "India", False),
            (l1.id, now - timedelta(hours=3), "twitter.com", "Mobile", "Safari", "India", False),
            (l2.id, now - timedelta(days=3), "github.com", "Desktop", "Chrome", "India", False),
            (l2.id, now - timedelta(days=1), "Direct", "Mobile", "Chrome", "Singapore", False),
            (l2.id, now - timedelta(hours=2), "linkedin.com", "Desktop", "Firefox", "Germany", False),
            (l3.id, now - timedelta(days=2, hours=4), "telegram.org", "Mobile", "Chrome", "Russia", True),
            (l3.id, now - timedelta(days=2, hours=1), "Direct", "Desktop", "Chrome", "India", False),
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
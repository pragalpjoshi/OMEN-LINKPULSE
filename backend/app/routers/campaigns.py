from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign
from app.models.link import Link
from app.routers.link import get_default_owner_id, serialize_link
from app.schemas.campaign import CampaignAssignLinks, CampaignCreate, CampaignResponse

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])


def serialize_campaign(campaign: Campaign) -> dict:
    links = campaign.links or []
    total_links = len(links)
    active_links = sum(1 for l in links if l.effective_active)
    total_clicks = sum(int(l.click_count or 0) for l in links)
    avg_clicks = round(total_clicks / total_links, 2) if total_links else 0.0
    top_link = max(links, key=lambda l: int(l.click_count or 0)) if links else None

    return {
        "id": campaign.id,
        "owner_id": campaign.owner_id,
        "name": campaign.name,
        "description": campaign.description,
        "status": "active",
        "created_at": campaign.created_at or datetime.utcnow(),
        "total_links": total_links,
        "active_links": active_links,
        "total_clicks": total_clicks,
        "avg_clicks_per_link": avg_clicks,
        "top_link_code": top_link.short_code if top_link else None,
        "top_link_clicks": int(top_link.click_count or 0) if top_link else 0,
    }


@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Campaign)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            (Campaign.name.ilike(term)) | (Campaign.description.ilike(term))
        )
    campaigns = query.order_by(Campaign.created_at.desc()).all()
    return [serialize_campaign(c) for c in campaigns]


@router.post("", response_model=CampaignResponse, status_code=201)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db)):
    owner_id = get_default_owner_id(db)
    name = payload.name.strip()
    existing = db.query(Campaign).filter(Campaign.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Campaign '{name}' already exists.")

    campaign = Campaign(
        owner_id=owner_id,
        name=name,
        description=payload.description,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return serialize_campaign(campaign)


@router.post("/{campaign_id}/assign-links")
def assign_links_to_campaign(
    campaign_id: int,
    payload: CampaignAssignLinks,
    request: Request,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    links = db.query(Link).filter(Link.id.in_(payload.link_ids)).all()
    for lnk in links:
        lnk.campaign_id = campaign_id
    db.commit()
    db.refresh(campaign)
    return {
        "campaign": serialize_campaign(campaign),
        "assigned_count": len(links),
        "links": [serialize_link(l, request) for l in campaign.links],
    }


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    for lnk in campaign.links:
        lnk.campaign_id = None
    db.delete(campaign)
    db.commit()
    return {"deleted": True, "id": campaign_id}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Campaign
from app.schemas.campaign import CampaignCreate, CampaignRead, CampaignUpdate
from app.security import get_current_user_id

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.post("/", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Campaign name cannot be blank")

    campaign = Campaign(
        owner_id=owner_id,
        name=name,
        description=payload.description,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.get("/", response_model=list[CampaignRead])
def list_campaigns(
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    statement = (
        select(Campaign)
        .where(Campaign.owner_id == owner_id)
        .order_by(Campaign.created_at.desc())
    )
    return db.scalars(statement).all()


@router.get("/{campaign_id}", response_model=CampaignRead)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    campaign = db.scalar(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.owner_id == owner_id,
        )
    )
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.patch("/{campaign_id}", response_model=CampaignRead)
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdate,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    campaign = db.scalar(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.owner_id == owner_id,
        )
    )
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    changes = payload.model_dump(exclude_unset=True)

    if "name" in changes:
        if changes["name"] is None or not changes["name"].strip():
            raise HTTPException(status_code=422, detail="Campaign name cannot be blank")
        changes["name"] = changes["name"].strip()

    for field, value in changes.items():
        setattr(campaign, field, value)

    db.commit()
    db.refresh(campaign)
    return campaign


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    campaign = db.scalar(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.owner_id == owner_id,
        )
    )
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    db.delete(campaign)
    db.commit()
    return None

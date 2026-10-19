
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.analytical import AnalyticsOverview, LinkAnalytics
from app.security import get_current_user_id
from app.services.analytics_service import get_link_analytics, get_overview

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def analytics_overview(
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    return get_overview(db, owner_id)


@router.get("/links/{link_id}", response_model=LinkAnalytics)
def analytics_for_link(
    link_id: int,
    db: Session = Depends(get_db),
    owner_id: int = Depends(get_current_user_id),
):
    result = get_link_analytics(db, owner_id, link_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Link not found")
    return result

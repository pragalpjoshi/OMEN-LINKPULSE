from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None


class CampaignAssignLinks(BaseModel):
    link_ids: List[int]


class CampaignResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str]
    status: str = "active"
    created_at: datetime
    total_links: int = 0
    active_links: int = 0
    total_clicks: int = 0
    avg_clicks_per_link: float = 0.0
    top_link_code: Optional[str] = None
    top_link_clicks: int = 0

    class Config:
        from_attributes = True
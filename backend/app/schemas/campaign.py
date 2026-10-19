from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = None
class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    name: str
    description: str | None = None
    created_at: datetime
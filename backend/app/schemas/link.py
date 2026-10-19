from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
class LinkCreate(BaseModel):
    original_url: HttpUrl
    custom_alias: str | None = Field(default=None, min_length=3, max_length=30,
                                     pattern=r"^[A-Za-z0-9_-]+$")
    campaign_id: int | None = Field(default=None, ge=1)
    expires_at: datetime | None = None
    click_limit: int | None = Field(default=None, ge=1)
class LinkUpdate(BaseModel):
    original_url: HttpUrl | None = None
    status: str | None = Field(default=None, pattern=r"^(active|disabled)$")
    expires_at: datetime | None = None
    click_limit: int | None = Field(default=None, ge=1)
class LinkRead(BaseModel):
    id: int
    owner_id: int
    campaign_id: int | None
    original_url: str
    short_code: str
    status: str
    expires_at: datetime | None
    click_limit: int | None
    click_count: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
class LinkCreated(BaseModel):
    link: LinkRead
    short_url: str
import re
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse
from pydantic import BaseModel, Field, model_validator, field_validator

ALIAS_REGEX = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")


class LinkCreate(BaseModel):
    original_url: Optional[str] = None
    destination_url: Optional[str] = None
    short_code: Optional[str] = None
    custom_alias: Optional[str] = None
    campaign_id: Optional[int] = None
    expires_at: Optional[datetime] = None
    click_limit: Optional[int] = None
    password: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_urls_and_alias(self):
        url = (self.original_url or self.destination_url or "").strip()
        if not url:
            raise ValueError("Destination URL is required.")
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("URL must be a valid http:// or https:// address.")
        self.original_url = url
        self.destination_url = url

        alias = (self.custom_alias or self.short_code or "").strip()
        if alias:
            if not ALIAS_REGEX.match(alias):
                raise ValueError("Custom alias must be 3–30 characters (letters, numbers, '-' or '_').")
            if alias.lower() in {"api", "docs", "redoc", "openapi.json", "health", "r"}:
                raise ValueError(f"Alias '{alias}' is reserved.")
            self.custom_alias = alias
            self.short_code = alias
        else:
            self.custom_alias = None
            self.short_code = None

        return self

    @field_validator("click_limit")
    @classmethod
    def validate_click_limit(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("Click limit must be at least 1.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if len(v) < 4:
            raise ValueError("Password must be at least 4 characters long.")
        return v


class LinkUpdate(BaseModel):
    original_url: Optional[str] = None
    destination_url: Optional[str] = None
    campaign_id: Optional[int] = None
    expires_at: Optional[datetime] = None
    click_limit: Optional[int] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    tags: Optional[List[str]] = None
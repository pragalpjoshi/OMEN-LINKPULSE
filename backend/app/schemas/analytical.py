from datetime import datetime
from pydantic import BaseModel
class AnalyticsOverview(BaseModel):
    total_links: int
    total_clicks: int
    bot_clicks: int
    human_clicks: int
    clicks_last_7_days: int
class BreakdownItem(BaseModel):
    name: str
    clicks: int
class DailyClickItem(BaseModel):
    date: str
    clicks: int
class LinkAnalytics(BaseModel):
    link_id: int
    short_code: str
    original_url: str
    total_clicks: int
    human_clicks: int
    bot_clicks: int
    top_referrers: list[BreakdownItem]
    devices: list[BreakdownItem]
    browsers: list[BreakdownItem]
    countries: list[BreakdownItem]
    daily_clicks: list[DailyClickItem]
class RecentClick(BaseModel):
    link_id: int
    clicked_at: datetime
    referrer: str | None = None
    device_type: str | None = None
    browser: str | None = None
    country: str | None = None
    is_bot: bool
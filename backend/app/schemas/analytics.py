from datetime import datetime
from pydantic import BaseModel, ConfigDict
class ClickEventRead(BaseModel):
    id:int; link_id:int; clicked_at:datetime; referrer:str|None=None; device_type:str|None=None; browser:str|None=None; country:str|None=None; is_bot:bool
    model_config=ConfigDict(from_attributes=True)
class LinkAnalyticsSummary(BaseModel):
    link_id:int; short_code:str; total_clicks:int; human_clicks:int; bot_clicks:int
    clicks_by_device:dict[str,int]; clicks_by_browser:dict[str,int]; clicks_by_country:dict[str,int]
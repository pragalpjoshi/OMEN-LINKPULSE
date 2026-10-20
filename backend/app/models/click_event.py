from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class ClickEvent(Base):
    __tablename__ = "click_events"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    link_id = Column(Integer, ForeignKey("links.id", ondelete="CASCADE"), nullable=False, index=True)
    clicked_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), index=True)
    referrer = Column(Text, nullable=True)
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(30), nullable=True, default="Desktop")
    browser = Column(String(100), nullable=True, default="Chrome")
    country = Column(String(100), nullable=True, default="India")
    is_bot = Column(Boolean, nullable=False, default=False)

    link = relationship("Link", back_populates="click_events")
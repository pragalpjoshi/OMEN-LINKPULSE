from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
class ClickEvent(Base):
    __tablename__ = "click_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    link_id: Mapped[int] = mapped_column(Integer, ForeignKey("links.id", ondelete="CASCADE"),
                                         nullable=False, index=True)
    clicked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False,
        server_default=func.current_timestamp(), index=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_bot: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    link: Mapped["Link"] = relationship(back_populates="click_events")

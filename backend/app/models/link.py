from datetime import datetime
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Link(Base):
    __tablename__ = "links"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                                          nullable=False, index=True)
    campaign_id: Mapped[int | None] = mapped_column(Integer,
        ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    original_url: Mapped[str] = mapped_column(Text, nullable=False)
    short_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    click_limit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    click_count: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0, server_default="0")
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False,
        server_default=func.current_timestamp())
    owner: Mapped["User"] = relationship(back_populates="links")
    campaign: Mapped["Campaign | None"] = relationship(back_populates="links")
    click_events: Mapped[list["ClickEvent"]] = relationship(back_populates="link", cascade="all, delete-orphan")
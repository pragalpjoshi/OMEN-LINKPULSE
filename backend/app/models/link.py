from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Text, TIMESTAMP, UniqueConstraint, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("owner_id", "name", name="uq_owner_tag_name"),)

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    owner_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    name = Column(String(100), nullable=False)

    owner = relationship("User", back_populates="tags")


class LinkTag(Base):
    __tablename__ = "link_tags"

    link_id = Column(BigInteger, ForeignKey("links.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(BigInteger, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Link(Base):
    __tablename__ = "links"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    owner_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    campaign_id = Column(BigInteger, ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    original_url = Column(Text, nullable=False)
    short_code = Column(String(30), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="active")
    expires_at = Column(TIMESTAMP, nullable=True)
    click_limit = Column(BigInteger, nullable=True)
    click_count = Column(BigInteger, nullable=False, default=0)
    password_hash = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    owner = relationship("User", back_populates="links")
    campaign = relationship("Campaign", back_populates="links")
    click_events = relationship("ClickEvent", back_populates="link", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="link_tags", viewonly=False)

    @property
    def has_password(self) -> bool:
        return bool(self.password_hash)

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    @property
    def is_flagged(self) -> bool:
        return self.status == "flagged"

    @property
    def is_expired_by_date(self) -> bool:
        return bool(self.expires_at and datetime.utcnow() >= self.expires_at.replace(tzinfo=None))

    @property
    def is_limit_reached(self) -> bool:
        return bool(self.click_limit is not None and (self.click_count or 0) >= self.click_limit)

    @property
    def is_expired(self) -> bool:
        return self.is_expired_by_date or self.is_limit_reached

    @property
    def effective_active(self) -> bool:
        return bool(self.status == "active" and not self.is_expired)
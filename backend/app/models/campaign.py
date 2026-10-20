from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    # Changed from BigInteger to Integer
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())

    owner = relationship("User", back_populates="campaigns")
    links = relationship("Link", back_populates="campaign")
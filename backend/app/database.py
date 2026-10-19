from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from app.config import settings
class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
engine = create_engine(
    settings.database_url.get_secret_value(),
    pool_pre_ping=True,
    pool_recycle=1800,
    echo=settings.debug,
)
SessionLocal = sessionmaker(bind=engine, class_=Session, autoflush=False,
                            autocommit=False, expire_on_commit=False)
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
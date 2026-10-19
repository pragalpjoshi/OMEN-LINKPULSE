
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.link import LinkCreate, LinkCreated, LinkRead, LinkUpdate
from app.security import get_current_user_id
from app.services.link_service import (
    create_link,
    deactivate_link,
    get_link,
    list_links,
    update_link,
)

router = APIRouter(prefix="/api/links", tags=["Links"])


@router.post("", response_model=LinkCreated, status_code=201)
def create_new_link(
    payload: LinkCreate,
    request: Request,
    owner_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    link = create_link(db, owner_id, payload)
    short_url = f"{str(request.base_url).rstrip('/')}/{link.short_code}"
    return {"link": link, "short_url": short_url}


@router.get("", response_model=list[LinkRead])
def get_my_links(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    owner_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return list_links(db, owner_id, skip, limit)


@router.get("/{link_id}", response_model=LinkRead)
def get_one_link(
    link_id: int,
    owner_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return get_link(db, owner_id, link_id)


@router.patch("/{link_id}", response_model=LinkRead)
def patch_link(
    link_id: int,
    payload: LinkUpdate,
    owner_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return update_link(db, owner_id, link_id, payload)


@router.delete("/{link_id}", response_model=LinkRead)
def disable_link(
    link_id: int,
    owner_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return deactivate_link(db, owner_id, link_id)

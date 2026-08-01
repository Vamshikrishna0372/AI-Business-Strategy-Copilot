"""Notifications API Endpoints with complete MongoDB persistence."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel

from app.common.responses import PaginatedResponseModel, ResponseModel
from app.core.exceptions import NotFoundException
from app.dependencies.auth import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _map_notification(n: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=str(n.id),
        user_id=str(n.user_id),
        title=n.title,
        message=n.message,
        type=n.type,
        is_read=n.is_read,
        link=n.link,
        created_at=n.created_at,
    )


@router.get(
    "",
    response_model=PaginatedResponseModel[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="List User Notifications",
)
async def list_notifications(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
):
    """Lists notifications for the current authenticated user."""
    query = {"user_id": current_user.id}
    if unread_only:
        query["is_read"] = False

    total = await Notification.find(query).count()
    items = await Notification.find(query).sort("-created_at").skip(skip).limit(limit).to_list()

    return PaginatedResponseModel(
        success=True,
        message="Notifications retrieved successfully",
        data=[_map_notification(n) for n in items],
        meta={
            "total": total,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
            "total_pages": (total + limit - 1) // limit if limit > 0 else 1,
            "has_next": (skip + limit) < total,
            "has_prev": skip > 0,
        },
    )


@router.patch(
    "/{id}/read",
    response_model=ResponseModel[NotificationResponse],
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read",
)
async def mark_read(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Marks a single notification as read."""
    notif = await Notification.get(id)
    if not notif or str(notif.user_id) != str(current_user.id):
        raise NotFoundException("Notification not found")

    notif.is_read = True
    await notif.save()
    return ResponseModel(success=True, message="Notification marked as read", data=_map_notification(notif))


@router.post(
    "/read-all",
    response_model=ResponseModel[bool],
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read",
)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
):
    """Marks all unread notifications for the user as read."""
    await Notification.find({"user_id": current_user.id, "is_read": False}).update({"$set": {"is_read": True}})
    return ResponseModel(success=True, message="All notifications marked as read", data=True)


@router.delete(
    "/{id}",
    response_model=ResponseModel[bool],
    status_code=status.HTTP_200_OK,
    summary="Delete Notification",
)
async def delete_notification(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Deletes a notification."""
    notif = await Notification.get(id)
    if notif and str(notif.user_id) == str(current_user.id):
        await notif.delete()
    return ResponseModel(success=True, message="Notification deleted", data=True)

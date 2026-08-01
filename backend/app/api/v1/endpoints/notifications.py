"""Notifications API Endpoints with complete MongoDB persistence using Motor async collection."""

from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status

from app.common.responses import PaginatedResponseModel, ResponseModel
from app.core.exceptions import NotFoundException
from app.database.collections import CollectionName, get_collection
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _map_notification(doc: dict) -> NotificationResponse:
    return NotificationResponse(
        id=str(doc.get("_id", "")),
        user_id=str(doc.get("user_id", "")),
        title=doc.get("title", ""),
        message=doc.get("message", ""),
        type=doc.get("type", "SYSTEM"),
        is_read=doc.get("is_read", False),
        link=doc.get("link"),
        created_at=doc.get("created_at"),
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
    col = get_collection(CollectionName.NOTIFICATIONS)
    query: dict = {"user_id": current_user.id}
    if unread_only:
        query["is_read"] = False

    total = await col.count_documents(query)
    cursor = col.find(query).sort("_id", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)

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
    if not ObjectId.is_valid(id):
        raise NotFoundException("Invalid notification ID format")

    col = get_collection(CollectionName.NOTIFICATIONS)
    doc = await col.find_one({"_id": ObjectId(id), "user_id": current_user.id})
    if not doc:
        raise NotFoundException("Notification not found")

    await col.update_one({"_id": ObjectId(id)}, {"$set": {"is_read": True}})
    doc["is_read"] = True
    return ResponseModel(success=True, message="Notification marked as read", data=_map_notification(doc))


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
    col = get_collection(CollectionName.NOTIFICATIONS)
    await col.update_many({"user_id": current_user.id, "is_read": False}, {"$set": {"is_read": True}})
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
    if not ObjectId.is_valid(id):
        return ResponseModel(success=True, message="Notification deleted", data=True)

    col = get_collection(CollectionName.NOTIFICATIONS)
    await col.delete_one({"_id": ObjectId(id), "user_id": current_user.id})
    return ResponseModel(success=True, message="Notification deleted", data=True)

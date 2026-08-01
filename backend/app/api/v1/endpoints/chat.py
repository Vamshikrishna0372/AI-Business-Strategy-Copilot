"""AI Chat & Conversation Management API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.common.responses import ResponseModel, PaginatedResponseModel
from app.core.exceptions import NotFoundException
from app.dependencies.auth import get_current_active_startup, get_current_user
from app.middleware.rate_limiter import ai_rate_limiter
from app.models.startup import Startup
from app.models.user import User
from app.schemas.chat import (
    ConversationResponse,
    CreateConversationRequest,
    SendMessageRequest,
    SendMessageResponse,
    UpdateConversationRequest,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/chat", tags=["AI Chat & Memory"])
ai_service = AIService()


def _map_conv_to_response(conv) -> ConversationResponse:
    """Helper to convert MongoDB Conversation model to API response schema."""
    return ConversationResponse(
        id=str(conv.id),
        startup_id=str(conv.startup_id),
        user_id=str(conv.user_id),
        title=conv.title,
        module=conv.module,
        is_pinned=conv.is_pinned,
        summary=conv.summary,
        recent_topics=conv.recent_topics,
        suggested_followups=conv.suggested_followups,
        messages=[m.model_dump() for m in conv.messages],
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.post(
    "/conversations",
    response_model=ResponseModel[ConversationResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Chat Conversation Thread",
)
async def create_conversation(
    body: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Creates a new AI chat conversation thread bound strictly to the active startup workspace."""
    conv = await ai_service.create_conversation(
        user=current_user,
        startup=current_startup,
        title=body.title,
        module=body.module or "general",
    )
    return ResponseModel(
        success=True,
        message="Conversation thread created successfully",
        data=_map_conv_to_response(conv),
    )


@router.get(
    "/conversations",
    response_model=PaginatedResponseModel[ConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="List Conversations for Active Startup",
)
async def list_conversations(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search conversations by title"),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Lists conversations belonging to the active startup workspace context."""
    conversations = await ai_service.list_conversations(
        startup_id=str(current_startup.id),
        skip=skip,
        limit=limit,
        search=search,
    )
    total = await ai_service.count_conversations(
        startup_id=str(current_startup.id),
        search=search,
    )
    data_list = [_map_conv_to_response(c) for c in conversations]
    return PaginatedResponseModel(
        success=True,
        message="Conversations retrieved successfully",
        data=data_list,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        page_size=limit,
        has_more=(skip + limit) < total,
    )


@router.get(
    "/conversations/{id}",
    response_model=ResponseModel[ConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Conversation Details & History",
)
async def get_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Gets a conversation thread ensuring workspace context isolation."""
    conv = await ai_service.get_conversation(
        startup_id=str(current_startup.id),
        conversation_id=id,
    )
    if not conv:
        raise NotFoundException(f"Conversation '{id}' not found in active startup workspace")
    
    return ResponseModel(
        success=True,
        message="Conversation retrieved successfully",
        data=_map_conv_to_response(conv),
    )


@router.post(
    "/conversations/{id}/messages",
    response_model=ResponseModel[SendMessageResponse],
    status_code=status.HTTP_200_OK,
    summary="Send Chat Message & Receive Structured AI Reply",
)
async def send_chat_message(
    id: str,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Sends a user message, runs AI strategy engine, persists history, and returns structured AI reply."""
    # Check sliding window rate limit per user per startup
    ai_rate_limiter.check_rate_limit(str(current_user.id), str(current_startup.id))

    res = await ai_service.process_chat_message(
        user=current_user,
        startup=current_startup,
        conversation_id=id,
        user_text=body.content,
        module=body.module or "general",
    )
    return ResponseModel(
        success=True,
        message="AI response generated successfully",
        data=res,
    )


@router.patch(
    "/conversations/{id}",
    response_model=ResponseModel[ConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="Rename or Pin Conversation",
)
async def update_conversation(
    id: str,
    body: UpdateConversationRequest,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Updates title or pinned status of a conversation."""
    updated = await ai_service.update_conversation(
        startup_id=str(current_startup.id),
        conversation_id=id,
        title=body.title,
        is_pinned=body.is_pinned,
    )
    if not updated:
        raise NotFoundException(f"Conversation '{id}' not found")

    return ResponseModel(
        success=True,
        message="Conversation updated successfully",
        data=_map_conv_to_response(updated),
    )


@router.post(
    "/conversations/{id}/messages/{msg_id}/pin",
    response_model=ResponseModel[ConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="Pin or Unpin Specific Message",
)
async def pin_message(
    id: str,
    msg_id: str,
    is_pinned: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Pins or unpins a specific message in a conversation thread."""
    updated = await ai_service.pin_message(
        startup_id=str(current_startup.id),
        conversation_id=id,
        message_id=msg_id,
        is_pinned=is_pinned,
    )
    if not updated:
        raise NotFoundException(f"Conversation or Message '{msg_id}' not found")

    return ResponseModel(
        success=True,
        message=f"Message {'pinned' if is_pinned else 'unpinned'} successfully",
        data=_map_conv_to_response(updated),
    )


@router.delete(
    "/conversations/{id}",
    response_model=ResponseModel[bool],
    status_code=status.HTTP_200_OK,
    summary="Delete Conversation",
)
async def delete_conversation(
    id: str,
    current_user: User = Depends(get_current_user),
    current_startup: Startup = Depends(get_current_active_startup),
):
    """Deletes a chat conversation thread."""
    deleted = await ai_service.delete_conversation(
        startup_id=str(current_startup.id),
        conversation_id=id,
    )
    if not deleted:
        raise NotFoundException(f"Conversation '{id}' not found")

    return ResponseModel(
        success=True,
        message="Conversation deleted successfully",
        data=True,
    )

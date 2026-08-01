"""Standard API Response Wrapper Schemas for consistent REST responses."""

from typing import Any, Generic, List, Optional
from pydantic import BaseModel, Field
from app.common.types import T


class BaseResponse(BaseModel):
    """Base response model."""
    success: bool = True
    message: str = "Operation completed successfully"


class ResponseModel(BaseResponse, Generic[T]):
    """Standard generic API single object wrapper."""
    data: Optional[T] = None


class PaginationMetadata(BaseModel):
    """Pagination metadata model."""
    total: int = Field(..., description="Total items count")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total available pages")
    has_next: bool = Field(..., description="Whether next page exists")
    has_prev: bool = Field(..., description="Whether previous page exists")


class PaginatedResponseModel(BaseResponse, Generic[T]):
    """Standard generic API paginated list wrapper."""
    data: List[T] = Field(default_factory=list)
    meta: Optional[PaginationMetadata] = None


class ErrorDetail(BaseModel):
    """Error detail model."""
    code: str = Field(..., description="Error code identifier")
    message: str = Field(..., description="Human readable error message")
    details: Optional[Any] = Field(default=None, description="Detailed validation or exception errors")


class ErrorResponseModel(BaseResponse):
    """Standard error response model."""
    success: bool = False
    error: ErrorDetail

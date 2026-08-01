"""File metadata MongoDB Model."""

from typing import Optional
from pydantic import Field
from app.models.base import MongoBaseModel
from app.common.types import PyObjectId


class File(MongoBaseModel):
    """File attachment collection model."""

    filename: str = Field(..., description="Original filename")
    stored_filename: str = Field(..., description="Storage key / unique file path")
    content_type: str = Field(..., description="MIME content type")
    size_bytes: int = Field(..., description="File size in bytes")
    uploaded_by: PyObjectId = Field(..., description="User ID of uploader")
    startup_id: Optional[PyObjectId] = Field(default=None, description="Associated startup workspace ID")
    storage_provider: str = Field(default="local", description="Storage provider (e.g. local, s3)")

"""Setting API schemas DTOs."""

from typing import Any
from pydantic import Field
from app.schemas.base import BaseSchema


class SettingResponse(BaseSchema):
    id: str
    key: str
    value: Any
    category: str
    is_public: bool

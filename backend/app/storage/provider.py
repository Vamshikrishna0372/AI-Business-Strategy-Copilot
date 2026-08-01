"""Storage provider interface & local file storage stub."""

from abc import ABC, abstractmethod
from typing import BinaryIO


class BaseStorageProvider(ABC):
    """Storage provider interface."""

    @abstractmethod
    async def upload_file(self, file_name: str, file_data: BinaryIO) -> str:
        """Uploads file and returns target URI/path."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    """Local storage provider implementation stub."""

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir

    async def upload_file(self, file_name: str, file_data: BinaryIO) -> str:
        return f"{self.upload_dir}/{file_name}"

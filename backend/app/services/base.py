"""Base Service Layer class."""

from typing import Generic, TypeVar
from app.repositories.base import BaseRepository

RepoType = TypeVar("RepoType", bound=BaseRepository)


class BaseService(Generic[RepoType]):
    """Base class for domain service layers."""

    def __init__(self, repository: RepoType):
        self.repository = repository

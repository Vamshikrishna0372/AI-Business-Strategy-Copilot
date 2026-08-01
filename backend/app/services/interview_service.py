"""Interview domain service."""

from app.repositories.interview_repository import InterviewRepository
from app.services.base import BaseService


class InterviewService(BaseService[InterviewRepository]):
    """Interview business logic service layer stub."""

    def __init__(self, interview_repository: InterviewRepository):
        super().__init__(repository=interview_repository)

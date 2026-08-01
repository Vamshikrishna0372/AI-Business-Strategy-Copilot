"""Legacy AI Interviews stub — superseded by /ai/interview/* in modules.py."""

from fastapi import APIRouter

router = APIRouter(prefix="/interviews", tags=["AI Interviews (Legacy)"])
# All interview logic is now served under /api/v1/ai/interview/* via modules.py

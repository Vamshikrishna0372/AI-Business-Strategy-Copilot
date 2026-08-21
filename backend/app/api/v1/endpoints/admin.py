"""Admin Control Panel API Router."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.common.enums import InterviewStatus, UserRole
from app.common.responses import ResponseModel
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.database.collections import CollectionName
from app.database.connection import DatabaseManager
from app.dependencies.auth import require_admin
from app.models.user import User
from app.repositories.activity_log_repository import ActivityLogRepository
from app.repositories.interview_repository import InterviewRepository
from app.repositories.startup_repository import StartupRepository
from app.repositories.user_repository import UserRepository

router = APIRouter(prefix="/admin", tags=["Admin Management"])


# --- Pydantic Request Models ---

class UpdateUserStatusRequest(BaseModel):
    is_active: bool = Field(..., description="Target user active status")


class UpdateUserRoleRequest(BaseModel):
    role: str = Field(..., description="Target user role (admin or founder)")


# --- Helper: Convert BSON Document ---

def _format_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return {}
    formatted = {**doc}
    if "_id" in formatted:
        formatted["id"] = str(formatted.pop("_id"))
    for k, v in list(formatted.items()):
        if isinstance(v, ObjectId):
            formatted[k] = str(v)
        elif isinstance(v, datetime):
            formatted[k] = v.isoformat()
    return formatted


# ─── 1. ADMIN DASHBOARD STATS ───────────────────────────────────────────────────

@router.get(
    "/dashboard/stats",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get System Administration Overview Statistics",
)
async def get_admin_dashboard_stats(
    current_admin: User = Depends(require_admin),
):
    """Retrieves real-time system metrics directly from MongoDB."""
    db = DatabaseManager.get_database()

    users_col = db[CollectionName.USERS.value]
    startups_col = db[CollectionName.STARTUPS.value]
    interviews_col = db[CollectionName.AI_INTERVIEWS.value]
    reports_col = db[CollectionName.AI_REPORTS.value]
    activity_col = db[CollectionName.ACTIVITY_LOGS.value]

    total_users = await users_col.count_documents({})
    active_users = await users_col.count_documents({"is_active": True})
    admin_users = await users_col.count_documents({"role": UserRole.ADMIN.value})

    total_startups = await startups_col.count_documents({})

    total_interviews = await interviews_col.count_documents({})
    completed_interviews = await interviews_col.count_documents({
        "status": {"$in": ["completed", "knowledge_generated", "all_modules_updated"]}
    })
    in_progress_interviews = await interviews_col.count_documents({
        "status": {"$in": ["in_progress", "started", "resumed"]}
    })
    paused_interviews = await interviews_col.count_documents({"status": "paused"})
    stopped_interviews = await interviews_col.count_documents({"status": "stopped"})

    total_reports = await reports_col.count_documents({})

    # Recent Registrations
    recent_users_cursor = users_col.find().sort("created_at", -1).limit(5)
    recent_users_raw = await recent_users_cursor.to_list(length=5)
    recent_users = [_format_doc(u) for u in recent_users_raw]

    # Recent Startups
    recent_startups_cursor = startups_col.find().sort("created_at", -1).limit(5)
    recent_startups_raw = await recent_startups_cursor.to_list(length=5)
    recent_startups = []
    for s in recent_startups_raw:
        s_fmt = _format_doc(s)
        founder = await users_col.find_one({"_id": ObjectId(s["user_id"])}) if "user_id" in s else None
        s_fmt["founder_email"] = founder.get("email") if founder else "N/A"
        s_fmt["founder_name"] = founder.get("full_name") if founder else "N/A"
        recent_startups.append(s_fmt)

    # Recent Activity
    activity_cursor = activity_col.find().sort("created_at", -1).limit(10)
    activity_raw = await activity_cursor.to_list(length=10)
    recent_activity = [_format_doc(a) for a in activity_raw]

    data = {
        "metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "admin_users": admin_users,
            "total_startups": total_startups,
            "total_interviews": total_interviews,
            "completed_interviews": completed_interviews,
            "in_progress_interviews": in_progress_interviews,
            "paused_interviews": paused_interviews,
            "stopped_interviews": stopped_interviews,
            "total_reports": total_reports,
        },
        "recent_users": recent_users,
        "recent_startups": recent_startups,
        "recent_activity": recent_activity,
        "system_health": {
            "database": "healthy",
            "storage": "healthy",
            "ai_engine": "operational",
            "api_server": "operational",
            "server_time": datetime.now(timezone.utc).isoformat(),
        },
    }
    return ResponseModel(success=True, message="Admin statistics loaded", data=data)


# ─── 2. USER MANAGEMENT ENDPOINTS ──────────────────────────────────────────────

@router.get(
    "/users",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Registered Users with Filter, Search & Pagination",
)
async def list_admin_users(
    query: Optional[str] = Query(default=None, description="Search query for name or email"),
    role: Optional[str] = Query(default=None, description="Filter by user role (admin/founder)"),
    is_active: Optional[bool] = Query(default=None, description="Filter by active status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
):
    """Returns paginated user list from MongoDB."""
    db = db_manager.db
    users_col = db[CollectionName.USERS.value]
    startups_col = db[CollectionName.STARTUPS.value]

    filter_dict: Dict[str, Any] = {}
    if query:
        filter_dict["$or"] = [
            {"email": {"$regex": query, "$options": "i"}},
            {"full_name": {"$regex": query, "$options": "i"}},
        ]
    if role:
        filter_dict["role"] = role.lower()
    if is_active is not None:
        filter_dict["is_active"] = is_active

    total_count = await users_col.count_documents(filter_dict)
    skip = (page - 1) * limit
    cursor = users_col.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
    users_raw = await cursor.to_list(length=limit)

    users_list = []
    for u in users_raw:
        u_fmt = _format_doc(u)
        u_id = ObjectId(u["_id"])
        startup_count = await startups_col.count_documents({"user_id": u_id})
        u_fmt["startup_count"] = startup_count
        users_list.append(u_fmt)

    data = {
        "users": users_list,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        },
    }
    return ResponseModel(success=True, message="User list loaded", data=data)


@router.get(
    "/users/{userId}",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get Detailed User Account Info",
)
async def get_admin_user_details(
    userId: str,
    current_admin: User = Depends(require_admin),
):
    """Retrieves full details, startups, and activities for a single user."""
    if not ObjectId.is_valid(userId):
        raise BadRequestException("Invalid User ID format")

    db = db_manager.db
    users_col = db[CollectionName.USERS.value]
    startups_col = db[CollectionName.STARTUPS.value]
    activity_col = db[CollectionName.ACTIVITY_LOGS.value]

    user_doc = await users_col.find_one({"_id": ObjectId(userId)})
    if not user_doc:
        raise NotFoundException(f"User with ID '{userId}' not found")

    user_info = _format_doc(user_doc)

    startups_cursor = startups_col.find({"user_id": ObjectId(userId)}).sort("created_at", -1)
    startups_raw = await startups_cursor.to_list(length=50)
    user_startups = [_format_doc(s) for s in startups_raw]

    act_cursor = activity_col.find({"user_id": ObjectId(userId)}).sort("created_at", -1).limit(20)
    act_raw = await act_cursor.to_list(length=20)
    user_activities = [_format_doc(a) for a in act_raw]

    data = {
        "user": user_info,
        "startups": user_startups,
        "activity_logs": user_activities,
    }
    return ResponseModel(success=True, message="User details loaded", data=data)


@router.patch(
    "/users/{userId}/status",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Update User Account Active Status",
)
async def update_admin_user_status(
    userId: str,
    payload: UpdateUserStatusRequest,
    current_admin: User = Depends(require_admin),
):
    """Activates or deactivates user account."""
    if not ObjectId.is_valid(userId):
        raise BadRequestException("Invalid User ID format")

    if str(current_admin.id) == userId and not payload.is_active:
        raise ForbiddenException("You cannot deactivate your own active admin account")

    db = db_manager.db
    users_col = db[CollectionName.USERS.value]

    result = await users_col.update_one(
        {"_id": ObjectId(userId)},
        {"$set": {"is_active": payload.is_active, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise NotFoundException(f"User with ID '{userId}' not found")

    updated_doc = await users_col.find_one({"_id": ObjectId(userId)})
    return ResponseModel(
        success=True,
        message=f"User account {'activated' if payload.is_active else 'deactivated'} successfully",
        data=_format_doc(updated_doc),
    )


@router.patch(
    "/users/{userId}/role",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Update User Role",
)
async def update_admin_user_role(
    userId: str,
    payload: UpdateUserRoleRequest,
    current_admin: User = Depends(require_admin),
):
    """Changes user role between founder and admin."""
    if not ObjectId.is_valid(userId):
        raise BadRequestException("Invalid User ID format")

    new_role = payload.role.lower().strip()
    if new_role not in ["admin", "founder"]:
        raise BadRequestException("Role must be either 'admin' or 'founder'")

    if str(current_admin.id) == userId and new_role != "admin":
        raise ForbiddenException("You cannot remove admin privileges from your own account")

    db = db_manager.db
    users_col = db[CollectionName.USERS.value]

    result = await users_col.update_one(
        {"_id": ObjectId(userId)},
        {"$set": {"role": new_role, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise NotFoundException(f"User with ID '{userId}' not found")

    updated_doc = await users_col.find_one({"_id": ObjectId(userId)})
    return ResponseModel(
        success=True,
        message=f"User role updated to '{new_role}' successfully",
        data=_format_doc(updated_doc),
    )


@router.delete(
    "/users/{userId}",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Delete User Account and Clean Up Workspace",
)
async def delete_admin_user(
    userId: str,
    current_admin: User = Depends(require_admin),
):
    """Deletes a user account and associated workspaces."""
    if not ObjectId.is_valid(userId):
        raise BadRequestException("Invalid User ID format")

    if str(current_admin.id) == userId:
        raise ForbiddenException("You cannot delete your own logged-in admin account")

    db = db_manager.db
    users_col = db[CollectionName.USERS.value]
    startups_col = db[CollectionName.STARTUPS.value]
    interviews_col = db[CollectionName.INTERVIEWS.value]
    reports_col = db[CollectionName.REPORTS.value]

    u_id = ObjectId(userId)
    user_doc = await users_col.find_one({"_id": u_id})
    if not user_doc:
        raise NotFoundException(f"User with ID '{userId}' not found")

    # Clean up associated startups, interviews, and reports
    await startups_col.delete_many({"user_id": u_id})
    await interviews_col.delete_many({"user_id": u_id})
    await reports_col.delete_many({"user_id": u_id})
    await users_col.delete_one({"_id": u_id})

    return ResponseModel(
        success=True,
        message=f"User '{user_doc.get('email')}' deleted cleanly",
        data={"deleted_user_id": userId},
    )


# ─── 3. STARTUP MANAGEMENT ENDPOINTS ───────────────────────────────────────────

@router.get(
    "/startups",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List All Startups Across Workspaces",
)
async def list_admin_startups(
    query: Optional[str] = Query(default=None, description="Search startup name or industry"),
    industry: Optional[str] = Query(default=None, description="Filter by industry"),
    stage: Optional[str] = Query(default=None, description="Filter by startup stage"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
):
    """Lists startups with founder identity and interview status."""
    db = db_manager.db
    startups_col = db[CollectionName.STARTUPS.value]
    users_col = db[CollectionName.USERS.value]
    interviews_col = db[CollectionName.INTERVIEWS.value]

    filter_dict: Dict[str, Any] = {}
    if query:
        filter_dict["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"industry": {"$regex": query, "$options": "i"}},
        ]
    if industry:
        filter_dict["industry"] = {"$regex": f"^{industry}$", "$options": "i"}
    if stage:
        filter_dict["stage"] = stage.lower()

    total_count = await startups_col.count_documents(filter_dict)
    skip = (page - 1) * limit
    cursor = startups_col.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
    startups_raw = await cursor.to_list(length=limit)

    startups_list = []
    for s in startups_raw:
        s_fmt = _format_doc(s)
        s_id = ObjectId(s["_id"])
        founder = await users_col.find_one({"_id": ObjectId(s["user_id"])}) if "user_id" in s else None
        s_fmt["founder_email"] = founder.get("email") if founder else "N/A"
        s_fmt["founder_name"] = founder.get("full_name") if founder else "N/A"

        interview = await interviews_col.find_one({"startup_id": s_id})
        if interview:
            s_fmt["interview_status"] = interview.get("status", "not_started")
            s_fmt["interview_progress"] = interview.get("progress_percentage", 0)
        else:
            s_fmt["interview_status"] = "not_started"
            s_fmt["interview_progress"] = 0

        startups_list.append(s_fmt)

    data = {
        "startups": startups_list,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        },
    }
    return ResponseModel(success=True, message="Startup list loaded", data=data)


@router.delete(
    "/startups/{startupId}",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Delete Startup Workspace",
)
async def delete_admin_startup(
    startupId: str,
    current_admin: User = Depends(require_admin),
):
    """Deletes a startup workspace and related interviews."""
    if not ObjectId.is_valid(startupId):
        raise BadRequestException("Invalid Startup ID format")

    db = db_manager.db
    startups_col = db[CollectionName.STARTUPS.value]
    interviews_col = db[CollectionName.INTERVIEWS.value]

    s_id = ObjectId(startupId)
    doc = await startups_col.find_one({"_id": s_id})
    if not doc:
        raise NotFoundException(f"Startup '{startupId}' not found")

    await interviews_col.delete_many({"startup_id": s_id})
    await startups_col.delete_one({"_id": s_id})

    return ResponseModel(
        success=True,
        message=f"Startup '{doc.get('name')}' deleted successfully",
        data={"deleted_startup_id": startupId},
    )


# ─── 4. INTERVIEW MANAGEMENT ENDPOINTS ─────────────────────────────────────────

@router.get(
    "/interviews",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List All Interview Sessions",
)
async def list_admin_interviews(
    status_filter: Optional[str] = Query(default=None, alias="status", description="Filter by interview status"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
):
    """Lists all interview sessions with startup and founder details."""
    db = db_manager.db
    interviews_col = db[CollectionName.INTERVIEWS.value]
    startups_col = db[CollectionName.STARTUPS.value]
    users_col = db[CollectionName.USERS.value]

    filter_dict: Dict[str, Any] = {}
    if status_filter:
        filter_dict["status"] = status_filter.lower()

    total_count = await interviews_col.count_documents(filter_dict)
    skip = (page - 1) * limit
    cursor = interviews_col.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
    interviews_raw = await cursor.to_list(length=limit)

    interviews_list = []
    for item in interviews_raw:
        i_fmt = _format_doc(item)
        startup = await startups_col.find_one({"_id": ObjectId(item["startup_id"])}) if "startup_id" in item else None
        founder = await users_col.find_one({"_id": ObjectId(item["user_id"])}) if "user_id" in item else None

        i_fmt["startup_name"] = startup.get("name") if startup else "N/A"
        i_fmt["founder_email"] = founder.get("email") if founder else "N/A"
        i_fmt["founder_name"] = founder.get("full_name") if founder else "N/A"
        i_fmt["qa_count"] = len(item.get("qa_history", []))

        interviews_list.append(i_fmt)

    data = {
        "interviews": interviews_list,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
        },
    }
    return ResponseModel(success=True, message="Interviews list loaded", data=data)


# ─── 5. ADMIN ANALYTICS & REPORTS ENDPOINTS ────────────────────────────────────

@router.get(
    "/analytics",
    response_model=ResponseModel[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get Detailed System Analytics Aggregations",
)
async def get_admin_analytics(
    current_admin: User = Depends(require_admin),
):
    """Generates analytics breakdown for industries, stages, and completion rates."""
    db = db_manager.db
    startups_col = db[CollectionName.STARTUPS.value]
    interviews_col = db[CollectionName.INTERVIEWS.value]
    users_col = db[CollectionName.USERS.value]

    # Industry distribution
    industry_pipeline = [
        {"$group": {"_id": {"$ifNull": ["$industry", "General"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    industry_raw = await startups_col.aggregate(industry_pipeline).to_list(length=20)
    industry_distribution = [{"industry": doc["_id"], "count": doc["count"]} for doc in industry_raw]

    # Stage distribution
    stage_pipeline = [
        {"$group": {"_id": {"$ifNull": ["$stage", "idea"]}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    stage_raw = await startups_col.aggregate(stage_pipeline).to_list(length=20)
    stage_distribution = [{"stage": doc["_id"], "count": doc["count"]} for doc in stage_raw]

    # Interview Status breakdown
    status_pipeline = [
        {"$group": {"_id": {"$ifNull": ["$status", "not_started"]}, "count": {"$sum": 1}}},
    ]
    status_raw = await interviews_col.aggregate(status_pipeline).to_list(length=20)
    status_distribution = [{"status": doc["_id"], "count": doc["count"]} for doc in status_raw]

    total_startups = await startups_col.count_documents({})
    total_users = await users_col.count_documents({})

    data = {
        "industry_distribution": industry_distribution,
        "stage_distribution": stage_distribution,
        "status_distribution": status_distribution,
        "totals": {
            "users": total_users,
            "startups": total_startups,
        },
    }
    return ResponseModel(success=True, message="Analytics metrics loaded", data=data)

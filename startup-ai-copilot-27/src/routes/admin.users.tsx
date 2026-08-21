import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserMinus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, SurfaceCard } from "@/components/common/ui-kit";
import { Button } from "@/components/ui/button";
import { adminService, type AdminUserItem } from "@/services/admin-service";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "User Management — Admin Control Panel" }],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUserItem | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const isAct = statusFilter === "" ? undefined : statusFilter === "true";
      const res = await adminService.getUsers({
        query: search || undefined,
        role: roleFilter || undefined,
        is_active: isAct,
        page,
        limit: 10,
      });
      setUsers(res.users);
      setTotalPages(res.pagination.total_pages);
      setTotalUsers(res.pagination.total);
    } catch (err: any) {
      toast.error(err?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (user: AdminUserItem) => {
    try {
      setActionLoading(true);
      const nextStatus = !user.is_active;
      await adminService.updateUserStatus(user.id, nextStatus);
      toast.success(`User ${user.email} is now ${nextStatus ? "Active" : "Inactive"}`);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async (user: AdminUserItem) => {
    try {
      setActionLoading(true);
      const nextRole = user.role === "admin" ? "founder" : "admin";
      await adminService.updateUserRole(user.id, nextRole);
      toast.success(`User ${user.email} role updated to '${nextRole}'`);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update user role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return;
    try {
      setActionLoading(true);
      await adminService.deleteUser(deleteConfirmUser.id);
      toast.success(`User account ${deleteConfirmUser.email} deleted cleanly.`);
      setDeleteConfirmUser(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user account");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetails(true);
    try {
      const res = await adminService.getUserDetails(userId);
      setUserDetails(res);
    } catch (err: any) {
      toast.error("Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Admin Control Panel · User Directory"
        title="User Management"
        subtitle="View, search, filter, update roles, manage active status, and audit user accounts."
        actions={
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1.5 font-semibold">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Users
          </Button>
        }
      />

      <SurfaceCard className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by full name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="">All Roles</option>
                <option value="admin">Admins</option>
                <option value="founder">Founders</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-xl border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              Apply Filters
            </Button>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b text-muted-foreground font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Role</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Workspaces</th>
                <th className="p-4">Registration Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="size-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <p className="text-xs text-muted-foreground">Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No matching registered users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-extrabold text-primary border border-primary/20 text-sm">
                          {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{u.full_name || "User"}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          u.role === "admin"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                            : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                        }`}
                      >
                        {u.role === "admin" && <ShieldCheck className="size-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          u.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                            : "bg-destructive/10 text-destructive border border-destructive/30"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-destructive"}`} />
                        {u.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-foreground">
                      {u.startup_count} Workspaces
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetails(u.id)}
                          title="View User Details"
                          className="size-8 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actionLoading}
                          onClick={() => handleToggleRole(u)}
                          title={`Change Role to ${u.role === "admin" ? "Founder" : "Admin"}`}
                          className="size-8 text-muted-foreground hover:text-amber-600"
                        >
                          <UserCog className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus(u)}
                          title={u.is_active ? "Deactivate User" : "Activate User"}
                          className={`size-8 ${u.is_active ? "text-muted-foreground hover:text-amber-600" : "text-emerald-600 hover:bg-emerald-50"}`}
                        >
                          {u.is_active ? <UserMinus className="size-4" /> : <UserCheck className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={actionLoading}
                          onClick={() => setDeleteConfirmUser(u)}
                          title="Delete User"
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
          <span>Showing total {totalUsers} registered users</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="size-8 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="font-semibold text-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="size-8 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </SurfaceCard>

      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <SurfaceCard className="max-w-md w-full p-6 space-y-4 shadow-2xl border-destructive/30">
            <div className="flex items-center gap-3 text-destructive font-bold text-lg">
              <AlertTriangle className="size-6 shrink-0" /> Confirm User Deletion
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete user account <strong className="text-foreground">{deleteConfirmUser.email}</strong>? All associated startup workspaces and diagnostic data will be removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Delete User
              </Button>
            </div>
          </SurfaceCard>
        </div>
      )}

      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <SurfaceCard className="max-w-2xl w-full p-6 space-y-6 shadow-2xl border-amber-500/30 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 font-extrabold text-base border border-amber-500/30">
                  {userDetails?.user?.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{userDetails?.user?.full_name || "User Details"}</h3>
                  <p className="text-xs text-muted-foreground">{userDetails?.user?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
                Close
              </Button>
            </div>

            {loadingDetails ? (
              <div className="py-8 text-center">
                <Loader2 className="size-6 animate-spin mx-auto text-amber-500" />
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground font-semibold">User Role</p>
                    <p className="font-bold text-foreground uppercase mt-1">{userDetails?.user?.role}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground font-semibold">Status</p>
                    <p className={`font-bold mt-1 ${userDetails?.user?.is_active ? "text-emerald-600" : "text-destructive"}`}>
                      {userDetails?.user?.is_active ? "Active Account" : "Deactivated"}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-muted-foreground font-semibold">Registered On</p>
                    <p className="font-bold text-foreground mt-1">
                      {userDetails?.user?.created_at ? new Date(userDetails.user.created_at).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-foreground">Associated Startup Workspaces ({userDetails?.startups?.length || 0})</h4>
                  <div className="space-y-2">
                    {(userDetails?.startups ?? []).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
                        <div>
                          <p className="font-bold text-foreground">{s.name}</p>
                          <p className="text-muted-foreground text-[11px]">{s.industry} · Stage: {s.stage}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Created {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {(!userDetails?.startups || userDetails.startups.length === 0) && (
                      <p className="text-muted-foreground py-2">No startup workspaces created yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}

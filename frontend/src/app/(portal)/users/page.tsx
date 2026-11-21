"use client";

import { useState, useEffect } from "react";
import {
  Users2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Building2,
  Lock,
  KeyRound,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  ChevronRight,
  FolderLock,
  X,
  RefreshCw,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { SystemRole } from "@/types";
import { formatDate } from "@/lib/utils";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMatrixDrawerOpen, setIsMatrixDrawerOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // New User Form State
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState<SystemRole>("DEALING_ASSISTANT");
  const [formPrimaryDeptId, setFormPrimaryDeptId] = useState("");
  const [formPassword, setFormPassword] = useState("GovSecurePassword2026!");

  // Password reset state
  const [newPassword, setNewPassword] = useState("");

  // Access Matrix State
  const [matrixPermissions, setMatrixPermissions] = useState<Record<string, any>>({});
  const [matrixTab, setMatrixTab] = useState<"departments" | "folders">("departments");
  const [overrideFileId, setOverrideFileId] = useState("");
  const [overrideCanRead, setOverrideCanRead] = useState(true);
  const [overrideCanWrite, setOverrideCanWrite] = useState(false);
  const [overrideCanCheckout, setOverrideCanCheckout] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptRes, filesRes] = await Promise.all([
        api.getUsers(),
        api.getDepartments(),
        api.getFiles(),
      ]);
      setUsers(usersRes || []);
      const allDepts = deptRes?.all || deptRes?.departments || [];
      setDepartments(allDepts);
      if (allDepts.length > 0 && !formPrimaryDeptId) {
        setFormPrimaryDeptId(allDepts[0].id);
      }
      setFiles(filesRes || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        employeeCode: formEmployeeCode,
        fullName: formFullName,
        designation: formDesignation,
        email: formEmail,
        phone: formPhone,
        role: formRole,
        primaryDeptId: formPrimaryDeptId,
        password: formPassword,
      });
      setIsCreateModalOpen(false);
      setFormEmployeeCode("");
      setFormFullName("");
      setFormDesignation("");
      setFormEmail("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await api.toggleUserStatus(user.id, !user.isActive);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openMatrixDrawer = (user: any) => {
    setSelectedUser(user);
    // Initialize permissions map for all departments
    const map: Record<string, any> = {};
    departments.forEach((dept) => {
      const existing = user.deptAccess?.find((a: any) => a.departmentId === dept.id);
      const isPrimary = user.primaryDeptId === dept.id;

      map[dept.id] = {
        departmentId: dept.id,
        canView: existing ? existing.canView : isPrimary,
        canCreate: existing ? existing.canCreate : isPrimary,
        canEdit: existing ? existing.canEdit : isPrimary,
        canDownmark: existing ? existing.canDownmark : isPrimary && (user.role === "SUPER_ADMIN" || user.role === "EXECUTIVE_OFFICER" || user.role === "DEPT_ADMIN"),
        canCheckoutPhysical: existing ? existing.canCheckoutPhysical : isPrimary && (user.role === "SUPER_ADMIN" || user.role === "DOC_CONTROLLER"),
        canExport: existing ? existing.canExport : true,
        canDelete: existing ? existing.canDelete : user.role === "SUPER_ADMIN",
      };
    });
    setMatrixPermissions(map);
    setIsMatrixDrawerOpen(true);
  };

  const handleSaveMatrix = async () => {
    if (!selectedUser) return;
    try {
      const permissionsList = Object.values(matrixPermissions);
      const updated = await api.updateUserPermissions(selectedUser.id, { deptAccess: permissionsList });
      setIsMatrixDrawerOpen(false);
      // If updating current logged-in user, refresh localStorage
      const stored = localStorage.getItem("govedms_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id === selectedUser.id) {
            localStorage.setItem("govedms_user", JSON.stringify({ ...parsed, deptAccess: updated.deptAccess }));
          }
        } catch {}
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddFolderOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !overrideFileId) return;
    try {
      await api.setUserFolderPermission(selectedUser.id, {
        fileId: overrideFileId,
        canRead: overrideCanRead,
        canWrite: overrideCanWrite,
        canCheckout: overrideCanCheckout,
      });
      // Refresh selected user
      const updated = await api.getUser(selectedUser.id);
      setSelectedUser(updated);
      setOverrideFileId("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevokeFolderOverride = async (fileId: string) => {
    if (!selectedUser) return;
    try {
      await api.revokeUserFolderPermission(selectedUser.id, fileId);
      const updated = await api.getUser(selectedUser.id);
      setSelectedUser(updated);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      await api.resetUserPassword(selectedUser.id, newPassword);
      setIsResetPasswordOpen(false);
      setNewPassword("");
      alert("Password has been successfully updated.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employeeCode.toLowerCase().includes(q) ||
        u.designation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gov-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gov-slate">User Management & Granular Access Control</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gov-emerald text-white">
              v2.0 Matrix
            </span>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Administer government officer accounts, cross-department clearance toggles, and confidential folder overrides.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-xs"
        >
          <Plus className="w-4 h-4 text-gov-gold" />
          <span>Register New Officer</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-gov-border bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gov-muted">Total Registered</span>
          <p className="text-xl font-bold text-gov-slate mt-1">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-gov-border bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gov-muted">Active Officers</span>
          <p className="text-xl font-bold text-gov-emerald mt-1">
            {users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gov-border bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gov-muted">Multi-Dept Access</span>
          <p className="text-xl font-bold text-gov-gold mt-1">
            {users.filter((u) => (u.deptAccess?.length || 0) > 1).length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gov-border bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-gov-muted">Folder Overrides</span>
          <p className="text-xl font-bold text-gov-slate mt-1">
            {users.reduce((acc, u) => acc + (u.folderPermissions?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Officer Name, Code, Email..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gov-border bg-white text-gov-slate"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate"
          >
            <option value="">All System Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN (Chief Admin)</option>
            <option value="EXECUTIVE_OFFICER">EXECUTIVE_OFFICER (PM / Secretary)</option>
            <option value="DEPT_ADMIN">DEPT_ADMIN (Director)</option>
            <option value="DOC_CONTROLLER">DOC_CONTROLLER (Registrar)</option>
            <option value="DEALING_ASSISTANT">DEALING_ASSISTANT (Officer)</option>
            <option value="AUDITOR">AUDITOR (Read-Only)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="p-6 rounded-bento bg-white border border-gov-border shadow-gov overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gov-border text-gov-muted font-bold tracking-wider uppercase text-[10px] bg-gov-canvas/40">
                <th className="py-3 px-3">Officer Profile</th>
                <th className="py-3 px-3">Primary Wing</th>
                <th className="py-3 px-3">System Clearance</th>
                <th className="py-3 px-3">Multi-Dept Access</th>
                <th className="py-3 px-3">Folder Overrides</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Access Matrix & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border">
              {filteredUsers.map((user) => {
                const multiDeptCount = user.deptAccess?.length || 0;
                const folderOverrideCount = user.folderPermissions?.length || 0;

                return (
                  <tr key={user.id} className="hover:bg-gov-canvas/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gov-emerald-soft border border-gov-emerald/30 flex items-center justify-center text-gov-emerald font-bold text-xs shrink-0">
                          {user.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gov-slate">{user.fullName}</p>
                          <p className="text-[11px] text-gov-muted">
                            {user.designation} • <span className="font-mono">{user.employeeCode}</span>
                          </p>
                          <p className="text-[10px] text-gov-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-gov-slate">
                        {user.primaryDept?.shortName || user.primaryDept?.name || "—"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user.role === "SUPER_ADMIN"
                            ? "bg-gov-gold/15 text-gov-gold border border-gov-gold/30"
                            : user.role === "EXECUTIVE_OFFICER"
                            ? "bg-gov-emerald text-white"
                            : user.role === "DEPT_ADMIN"
                            ? "bg-gov-emerald-soft text-gov-emerald"
                            : "bg-gov-canvas border border-gov-border text-gov-slate"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          multiDeptCount > 1
                            ? "bg-gov-emerald-soft text-gov-emerald font-bold"
                            : "bg-gov-canvas text-gov-muted"
                        }`}
                      >
                        {multiDeptCount} Department{multiDeptCount !== 1 ? "s" : ""}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          folderOverrideCount > 0
                            ? "bg-gov-amber-light text-gov-amber font-bold"
                            : "bg-gov-canvas text-gov-muted"
                        }`}
                      >
                        {folderOverrideCount} File{folderOverrideCount !== 1 ? "s" : ""}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                          user.isActive
                            ? "bg-gov-emerald-soft text-gov-emerald hover:bg-gov-emerald/20"
                            : "bg-gov-crimson-light text-gov-crimson hover:bg-gov-crimson/20"
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openMatrixDrawer(user)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gov-emerald-soft text-gov-emerald hover:bg-gov-emerald hover:text-white transition-all shadow-2xs"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Access Matrix</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsResetPasswordOpen(true);
                          }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg border border-gov-border hover:bg-gov-canvas text-gov-muted hover:text-gov-slate"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create New Officer */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-bento border border-gov-border p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gov-border pb-3">
              <h2 className="text-base font-bold text-gov-slate">Register Official Government Officer</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gov-muted hover:text-gov-slate">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gov-slate block mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    placeholder="e.g. EMP-007"
                    className="w-full p-2 rounded-xl border border-gov-border bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-gov-slate block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="e.g. Asad Umar"
                    className="w-full p-2 rounded-xl border border-gov-border bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gov-slate block mb-1">Official Designation *</label>
                  <input
                    type="text"
                    required
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Deputy Secretary"
                    className="w-full p-2 rounded-xl border border-gov-border bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-gov-slate block mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. asad@govedms.gov"
                    className="w-full p-2 rounded-xl border border-gov-border bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gov-slate block mb-1">Primary Department *</label>
                  <select
                    value={formPrimaryDeptId}
                    onChange={(e) => setFormPrimaryDeptId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gov-border bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gov-slate block mb-1">System Clearance Role *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as SystemRole)}
                    className="w-full p-2 rounded-xl border border-gov-border bg-white"
                  >
                    <option value="DEALING_ASSISTANT">DEALING_ASSISTANT</option>
                    <option value="DOC_CONTROLLER">DOC_CONTROLLER</option>
                    <option value="DEPT_ADMIN">DEPT_ADMIN</option>
                    <option value="EXECUTIVE_OFFICER">EXECUTIVE_OFFICER</option>
                    <option value="AUDITOR">AUDITOR</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gov-slate block mb-1">Initial Temporary Password</label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full p-2 rounded-xl border border-gov-border bg-white font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gov-border text-gov-slate font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gov-emerald text-white font-bold hover:bg-gov-emerald-dark"
                >
                  Create Officer Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: Granular Multi-Department & Folder Access Matrix */}
      {isMatrixDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-gov-border">
            {/* Drawer Header */}
            <div className="p-5 border-b border-gov-border bg-gov-canvas/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-gov-slate">Access Control Matrix</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-gold/15 text-gov-gold border border-gov-gold/30">
                      {selectedUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-gov-muted mt-0.5">
                    Configuring permissions for <span className="font-bold text-gov-slate">{selectedUser.fullName}</span> ({selectedUser.designation})
                  </p>
                </div>
                <button
                  onClick={() => setIsMatrixDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-gov-border/40 text-gov-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-2 mt-4 text-xs font-bold border-b border-gov-border/60">
                <button
                  onClick={() => setMatrixTab("departments")}
                  className={`pb-2 px-1 border-b-2 transition-all ${
                    matrixTab === "departments"
                      ? "border-gov-emerald text-gov-emerald"
                      : "border-transparent text-gov-muted hover:text-gov-slate"
                  }`}
                >
                  Multi-Department Permissions
                </button>
                <button
                  onClick={() => setMatrixTab("folders")}
                  className={`pb-2 px-1 border-b-2 transition-all ${
                    matrixTab === "folders"
                      ? "border-gov-emerald text-gov-emerald"
                      : "border-transparent text-gov-muted hover:text-gov-slate"
                  }`}
                >
                  Folder & Confidential Overrides ({selectedUser.folderPermissions?.length || 0})
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {matrixTab === "departments" ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-gov-emerald-soft/30 border border-gov-emerald/20 text-xs text-gov-slate space-y-1">
                    <p className="font-bold text-gov-emerald flex items-center space-x-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Granular Multi-Department Clearance</span>
                    </p>
                    <p className="text-[11px] text-gov-muted">
                      Officers can be granted specific operational roles across sister wings and project units without changing their primary posting.
                    </p>
                  </div>

                  {departments.map((dept) => {
                    const perm = matrixPermissions[dept.id] || {
                      canView: false,
                      canCreate: false,
                      canEdit: false,
                      canDownmark: false,
                      canCheckoutPhysical: false,
                      canExport: false,
                      canDelete: false,
                    };
                    const isPrimary = selectedUser.primaryDeptId === dept.id;

                    const toggleField = (field: string) => {
                      setMatrixPermissions((prev) => ({
                        ...prev,
                        [dept.id]: {
                          ...perm,
                          [field]: !perm[field],
                        },
                      }));
                    };

                    return (
                      <div
                        key={dept.id}
                        className={`p-4 rounded-xl border text-xs space-y-3 transition-colors ${
                          isPrimary
                            ? "border-gov-emerald/40 bg-gov-emerald-soft/10"
                            : "border-gov-border bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-gov-muted block">
                              {dept.code} {isPrimary && "• PRIMARY ASSIGNED"}
                            </span>
                            <h4 className="font-bold text-gov-slate text-sm">{dept.name}</h4>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              perm.canView ? "bg-gov-emerald text-white" : "bg-gov-canvas text-gov-muted"
                            }`}
                          >
                            {perm.canView ? "Access Granted" : "Restricted"}
                          </span>
                        </div>

                        {/* Permission Toggles */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-gov-border">
                          {[
                            { id: "canView", label: "View Letters & Files" },
                            { id: "canCreate", label: "Inward Intake (Create)" },
                            { id: "canEdit", label: "Edit Metadata" },
                            { id: "canDownmark", label: "Downmark Letters" },
                            { id: "canCheckoutPhysical", label: "Check-out Hardcopy" },
                            { id: "canExport", label: "Export & Print PDF" },
                            { id: "canDelete", label: "Admin Delete (Soft)" },
                          ].map((action) => (
                            <label
                              key={action.id}
                              className="flex items-center space-x-2 text-[11px] font-semibold text-gov-slate cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(perm[action.id])}
                                onChange={() => toggleField(action.id)}
                                className="w-3.5 h-3.5 rounded text-gov-emerald focus:ring-gov-emerald"
                              />
                              <span className={action.id === "canDelete" ? "text-gov-crimson font-bold" : ""}>
                                {action.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Add Folder Override Form */}
                  <form onSubmit={handleAddFolderOverride} className="p-4 rounded-xl border border-gov-border bg-gov-canvas/40 space-y-3">
                    <h4 className="font-bold text-gov-slate text-xs flex items-center space-x-1.5">
                      <FolderLock className="w-4 h-4 text-gov-emerald" />
                      <span>Grant Explicit Folder / Case File Override</span>
                    </h4>

                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Select File Jacket / Case</label>
                      <select
                        required
                        value={overrideFileId}
                        onChange={(e) => setOverrideFileId(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      >
                        <option value="">-- Choose File Dossier --</option>
                        {files.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fileNumber} — {f.title} ({f.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center space-x-4 pt-1 text-xs">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideCanRead}
                          onChange={(e) => setOverrideCanRead(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-gov-emerald"
                        />
                        <span>canRead</span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideCanWrite}
                          onChange={(e) => setOverrideCanWrite(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-gov-emerald"
                        />
                        <span>canWrite</span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={overrideCanCheckout}
                          onChange={(e) => setOverrideCanCheckout(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-gov-emerald"
                        />
                        <span>canCheckout</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={!overrideFileId}
                      className="px-3.5 py-1.5 rounded-lg bg-gov-emerald text-white text-xs font-bold disabled:opacity-50"
                    >
                      Grant File Clearance
                    </button>
                  </form>

                  {/* Active Folder Overrides List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                      Active File / Folder Clearances ({selectedUser.folderPermissions?.length || 0})
                    </h4>

                    {(!selectedUser.folderPermissions || selectedUser.folderPermissions.length === 0) ? (
                      <p className="text-xs text-gov-muted italic">No custom folder-level overrides active.</p>
                    ) : (
                      selectedUser.folderPermissions.map((fp: any) => (
                        <div key={fp.id} className="p-3 rounded-xl border border-gov-border bg-white flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-gov-emerald">
                              {fp.file?.fileNumber}
                            </span>
                            <p className="font-bold text-gov-slate line-clamp-1">{fp.file?.title}</p>
                            <div className="flex space-x-2 text-[10px] text-gov-muted mt-1">
                              <span>Read: {fp.canRead ? "✓" : "✗"}</span>
                              <span>Write: {fp.canWrite ? "✓" : "✗"}</span>
                              <span>Checkout: {fp.canCheckout ? "✓" : "✗"}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRevokeFolderOverride(fp.fileId)}
                            className="text-gov-crimson hover:underline text-[11px] font-bold"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gov-border bg-white flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMatrixDrawerOpen(false)}
                className="px-4 py-2 rounded-xl border border-gov-border text-xs font-semibold text-gov-slate"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMatrix}
                className="px-5 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-sm"
              >
                Save Access Matrix Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password */}
      {isResetPasswordOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-bento border border-gov-border p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gov-slate">
              Reset Password for {selectedUser.fullName}
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gov-slate block mb-1">New Password (Min 8 characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full p-2 rounded-xl border border-gov-border bg-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gov-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-gov-emerald text-white font-bold"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

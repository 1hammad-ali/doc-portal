"use client";

import { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Building,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Lock,
  Phone,
  Mail,
  BadgeAlert,
  Settings,
  Upload,
  Image,
} from "lucide-react";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Password Change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  // Branding (Super Admin)
  const [portalTitle, setPortalTitle] = useState("GovEDMS — National Document & e-File Management System");
  const [watermarkText, setWatermarkText] = useState("GOVERNMENT OF PAKISTAN — CONFIDENTIAL");
  const [logoBase64, setLogoBase64] = useState("");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState("");
  const [brandingErr, setBrandingErr] = useState("");

  const loadUserData = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      if (res?.user) {
        setCurrentUser(res.user);
        setFullName(res.user.fullName || "");
        setPhone(res.user.phone || "");
      }

      const settings = await api.getSettings();
      if (settings) {
        if (settings.portalTitle) setPortalTitle(settings.portalTitle);
        if (settings.watermarkText) setWatermarkText(settings.watermarkText);
        if (settings.logoBase64) setLogoBase64(settings.logoBase64);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg("");
    setProfileErr("");

    try {
      const res = await api.updateProfile({ fullName, phone });
      setProfileMsg("Official profile updated successfully");
      if (res?.user) {
        setCurrentUser((prev: any) => ({ ...prev, ...res.user }));
        localStorage.setItem("govedms_user", JSON.stringify(res.user));
      }
    } catch (err: any) {
      setProfileErr(err.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg("");
    setPwErr("");

    if (newPassword !== confirmPassword) {
      setPwErr("New passwords do not match");
      setPwSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setPwErr("New password must be at least 8 characters long");
      setPwSaving(false);
      return;
    }

    try {
      await api.changePassword({ currentPassword, newPassword });
      setPwMsg("Official password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwErr(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingSaving(true);
    setBrandingMsg("");
    setBrandingErr("");

    try {
      await api.updateSettings({
        portalTitle,
        watermarkText,
        logoBase64,
      });
      setBrandingMsg("National portal branding & security settings saved live");
    } catch (err: any) {
      setBrandingErr(err.message || "Failed to update branding");
    } finally {
      setBrandingSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3 text-gov-muted">
          <div className="w-8 h-8 border-2 border-gov-emerald border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading official security credential...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header Profile Badge */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-gov-emerald text-white flex items-center justify-center font-bold text-xl shadow-md shadow-gov-emerald/25">
            {currentUser?.fullName?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "GO"}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gov-slate">{currentUser?.fullName}</h1>
              <ShieldCheck className="w-5 h-5 text-gov-emerald" />
            </div>
            <p className="text-xs font-medium text-gov-muted mt-0.5">
              {currentUser?.designation} • <span className="font-mono text-gov-slate">{currentUser?.employeeCode}</span>
            </p>
            <p className="text-xs text-gov-emerald font-semibold mt-1">
              {currentUser?.primaryDept?.name} ({currentUser?.primaryDept?.code})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gov-emerald/15 text-gov-emerald border border-gov-emerald/30">
            {currentUser?.role}
          </span>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Clearance</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Details & Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Edit Contact Information */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-gov-border/60 pb-3">
              <User className="w-4 h-4 text-gov-emerald" />
              <h2 className="text-sm font-bold text-gov-slate">Official Officer Profile</h2>
            </div>

            {profileMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileMsg}</span>
              </div>
            )}
            {profileErr && (
              <div className="p-3 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileErr}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Official Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Direct Phone / Extension
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92-51-9200000"
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Official Email (Immutable)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ""}
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border/60 bg-gov-canvas/60 text-gov-muted font-medium cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Employee ID Code
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.employeeCode || ""}
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border/60 bg-gov-canvas/60 text-gov-muted font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{profileSaving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Change Password */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-gov-border/60 pb-3">
              <KeyRound className="w-4 h-4 text-gov-gold" />
              <h2 className="text-sm font-bold text-gov-slate">Security & Password</h2>
            </div>

            {pwMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pwMsg}</span>
              </div>
            )}
            {pwErr && (
              <div className="p-3 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwErr}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Current Official Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    New Secure Password (Min 8 Chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gov-slate text-white text-xs font-bold hover:bg-black transition-all disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5 text-gov-gold" />
                  <span>{pwSaving ? "Updating Password..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Portal Branding (Super Admin Only) */}
          {isSuperAdmin && (
            <div id="settings" className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-gov-gold">
              <div className="flex items-center justify-between border-b border-gov-border/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-gov-gold" />
                  <h2 className="text-sm font-bold text-gov-slate">
                    National Portal Branding & Security Stamp (Super Admin)
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-gold/15 text-gov-gold border border-gov-gold/30">
                  Global Setting
                </span>
              </div>

              {brandingMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{brandingMsg}</span>
                </div>
              )}
              {brandingErr && (
                <div className="p-3 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{brandingErr}</span>
                </div>
              )}

              <form onSubmit={handleUpdateBranding} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Portal Header Title
                  </label>
                  <input
                    type="text"
                    value={portalTitle}
                    onChange={(e) => setPortalTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    Forensic PDF Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                    State Emblem / Ministry Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    {logoBase64 ? (
                      <img
                        src={logoBase64}
                        alt="Portal Emblem"
                        className="w-14 h-14 object-contain rounded-xl border border-gov-border bg-white p-1"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl border border-dashed border-gov-border flex items-center justify-center text-gov-muted bg-white/60">
                        <Image className="w-6 h-6 text-gov-muted" />
                      </div>
                    )}
                    <label className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white border border-gov-border text-xs font-semibold text-gov-slate hover:bg-gov-canvas cursor-pointer shadow-xs">
                      <Upload className="w-3.5 h-3.5 text-gov-emerald" />
                      <span>Upload Logo PNG/SVG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={brandingSaving}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gov-gold text-gov-slate-ink text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{brandingSaving ? "Saving Branding..." : "Update Branding"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Multi-Department Clearance Matrix */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-2 border-b border-gov-border/60 pb-3">
              <Building className="w-4 h-4 text-gov-emerald" />
              <h2 className="text-sm font-bold text-gov-slate">Department Clearances</h2>
            </div>

            <p className="text-[11px] text-gov-muted">
              Official wings and ministerial desks authorized for your government session.
            </p>

            <div className="space-y-3">
              {/* Primary Department */}
              <div className="p-3.5 rounded-xl border border-gov-emerald/30 bg-gov-emerald-soft/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gov-emerald">
                    {currentUser?.primaryDept?.name}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gov-emerald text-white">
                    PRIMARY
                  </span>
                </div>
                <p className="text-[10px] text-gov-muted font-mono">{currentUser?.primaryDept?.code}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white font-medium text-gov-emerald border border-gov-emerald/20">
                    Full Desk Access
                  </span>
                </div>
              </div>

              {/* Additional Authorized Departments */}
              {currentUser?.deptAccess?.map((da: any) => (
                <div
                  key={da.id}
                  className="p-3.5 rounded-xl border border-gov-border/80 bg-white/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gov-slate">
                      {da.department?.name || "Additional Department"}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-gov-muted">
                      {da.department?.code}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {da.canView && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        View
                      </span>
                    )}
                    {da.canCreate && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                        Create
                      </span>
                    )}
                    {da.canEdit && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                        Edit
                      </span>
                    )}
                    {da.canDownmark && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                        Down-Mark
                      </span>
                    )}
                    {da.canCheckoutPhysical && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                        Physical Custody
                      </span>
                    )}
                    {da.canExport && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-700 font-semibold border border-gray-200">
                        Export PDF
                      </span>
                    )}
                    {da.canDelete && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-semibold border border-red-200">
                        Admin Delete
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Send,
  FolderKanban,
  GitBranch,
  AlertOctagon,
  ScrollText,
  Building2,
  ShieldAlert,
  FileCheck2,
  Search,
  Users2,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const navigationItems = [
  { name: "Command Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Story & Archival Search", href: "/search", icon: Search },
  { name: "Inward Dak Register", href: "/dak-inward", icon: Inbox },
  { name: "Outward Dispatch", href: "/dak-outward", icon: Send },
  { name: "Files, Cases & Projects", href: "/files", icon: FolderKanban },
  { name: "Down-Marked Tasks", href: "/downmarks", icon: GitBranch, badge: 2 },
  { name: "Physical Custody Out-Log", href: "/custody-alerts", icon: AlertOctagon, alert: true, badge: 1 },
  { name: "User Access Control", href: "/users", icon: Users2 },
  { name: "Departments & Access", href: "/departments", icon: Building2 },
  { name: "Gazettes & SROs", href: "/notifications", icon: ScrollText },
  { name: "Forensic Audit Logs", href: "/audit-logs", icon: ShieldAlert },
  { name: "Profile & Portal Branding", href: "/profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [portalTitle, setPortalTitle] = useState("GovEDMS");

  useEffect(() => {
    const storedUser = localStorage.getItem("govedms_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }

    // Attempt to load settings
    api.getSettings().then((s) => {
      if (s?.portalTitle) setPortalTitle(s.portalTitle);
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    finally {
      localStorage.removeItem("govedms_token");
      localStorage.removeItem("govedms_user");
      router.push("/login");
    }
  };

  return (
    <aside className="w-64 glass-panel border-r border-gov-border/70 flex flex-col h-screen select-none shrink-0 z-20">
      {/* Sovereign National Header */}
      <div className="p-4 border-b border-gov-border/60 bg-white/40 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gov-emerald flex items-center justify-center text-white shadow-md shadow-gov-emerald/20">
          <FileCheck2 className="w-6 h-6 text-gov-gold" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm font-bold text-gov-slate tracking-tight truncate">GovEDMS</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gov-gold/15 text-gov-gold border border-gov-gold/30">
              v3.0
            </span>
          </div>
          <p className="text-[11px] text-gov-muted truncate">National e-Office Portal</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-gov-muted">
          Operational Core
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group",
                isActive
                  ? "bg-gov-emerald text-white shadow-sm shadow-gov-emerald/25"
                  : "text-gov-slate hover:bg-gov-emerald-soft/70 hover:text-gov-emerald"
              )}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-gov-gold"
                      : "text-gov-muted group-hover:text-gov-emerald"
                  )}
                />
                <span className="truncate">{item.name}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                    item.alert
                      ? "bg-gov-crimson text-white animate-gov-pulse"
                      : isActive
                      ? "bg-white/20 text-white"
                      : "bg-gov-emerald-soft text-gov-emerald"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Status & Dedicated Logout Button */}
      <div className="p-3 border-t border-gov-border/60 bg-white/40 space-y-2">
        {currentUser && (
          <div className="flex items-center justify-between px-2 py-1">
            <div className="truncate">
              <p className="text-xs font-bold text-gov-slate truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-gov-muted truncate">{currentUser.designation}</p>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gov-emerald/10 text-gov-emerald shrink-0">
              {currentUser.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-gov-crimson hover:bg-gov-crimson-light border border-gov-crimson/20 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out Session</span>
        </button>

        <div className="flex items-center justify-between px-2 pt-1 text-[10px] text-gov-muted border-t border-gov-border/40">
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>GovNet Node Active</span>
          </div>
          <span className="font-mono">PMO-SEC</span>
        </div>
      </div>
    </aside>
  );
}

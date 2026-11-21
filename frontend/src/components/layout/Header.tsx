"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  QrCode,
  Bell,
  UserCircle2,
  ChevronDown,
  ShieldCheck,
  LogOut,
  User,
  Settings,
  Building,
} from "lucide-react";
import { api } from "@/lib/api";

interface HeaderProps {
  onOpenScanner: () => void;
}

export function Header({ onOpenScanner }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Read user from localStorage
    const storedUser = localStorage.getItem("govedms_user");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        // ignore JSON parse error
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/search");
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem("govedms_token");
      localStorage.removeItem("govedms_user");
      router.push("/login");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "GO";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="h-16 glass-header px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Global Story & Concept Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gov-muted pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by story, concept ('roads tender dispute'), Diary No, or OCR body..."
            className="w-full pl-10 pr-24 py-2 rounded-xl text-xs bg-white/70 border border-gov-border/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald transition-all text-gov-slate"
          />
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 hover:opacity-80 transition-opacity"
          >
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white border border-gov-border rounded text-gov-muted font-mono cursor-pointer shadow-2xs">
              Ctrl + K
            </kbd>
          </button>
        </div>
      </form>

      {/* Right Header Quick-Actions */}
      <div className="flex items-center space-x-3 ml-4">
        {/* Quick Barcode Scanner Trigger */}
        <button
          onClick={onOpenScanner}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gov-emerald text-white hover:bg-gov-emerald-dark shadow-sm transition-all"
        >
          <QrCode className="w-4 h-4 text-gov-gold" />
          <span>Scan Barcode</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-white/80 border border-transparent hover:border-gov-border text-gov-slate transition-all">
          <Bell className="w-4 h-4 text-gov-muted" />
          <span className="w-2 h-2 rounded-full bg-gov-crimson absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* Officer Profile & Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 pl-3 border-l border-gov-border hover:opacity-90 transition-opacity text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gov-emerald text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials(currentUser?.fullName)}
            </div>
            <div className="hidden md:block">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold text-gov-slate truncate max-w-[140px]">
                  {currentUser?.fullName || "Government Officer"}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-gov-emerald shrink-0" />
              </div>
              <div className="text-[10px] text-gov-muted flex items-center space-x-1">
                <span className="font-medium text-gov-emerald truncate max-w-[120px]">
                  {currentUser?.primaryDept?.shortName || currentUser?.designation || "Officer"}
                </span>
                <ChevronDown className="w-3 h-3 text-gov-muted shrink-0" />
              </div>
            </div>
          </button>

          {/* Interactive Profile Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 glass-modal rounded-2xl shadow-gov-lg border border-gov-border/80 p-2 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-3 py-2.5 border-b border-gov-border/60">
                <p className="text-xs font-bold text-gov-slate">{currentUser?.fullName}</p>
                <p className="text-[11px] text-gov-muted">{currentUser?.email}</p>
                <div className="mt-1.5 flex items-center space-x-1.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gov-emerald/15 text-gov-emerald border border-gov-emerald/30">
                    {currentUser?.role || "OFFICER"}
                  </span>
                  <span className="text-[9px] text-gov-muted font-mono">
                    {currentUser?.employeeCode}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-gov-slate hover:bg-gov-emerald-soft hover:text-gov-emerald rounded-xl transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>My Official Profile</span>
                </Link>

                <Link
                  href="/profile#settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-gov-slate hover:bg-gov-emerald-soft hover:text-gov-emerald rounded-xl transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Portal Branding & Settings</span>
                </Link>

                <Link
                  href="/departments"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-gov-slate hover:bg-gov-emerald-soft hover:text-gov-emerald rounded-xl transition-colors"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Assigned Departments</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-gov-border/60">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-gov-crimson hover:bg-gov-crimson-light rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-gov-crimson" />
                  <span>Sign Out / Secure Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

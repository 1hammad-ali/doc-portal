"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, FileCheck2, KeyRound, Mail, ArrowRight, Lock } from "lucide-react";
import { api } from "@/lib/api";

const demoAccounts = [
  { role: "Super Admin", email: "superadmin@govedms.gov", designation: "CIO / System Controller" },
  { role: "Executive Officer", email: "secretary@govedms.gov", designation: "Federal Secretary" },
  { role: "Dept Admin", email: "director@govedms.gov", designation: "Project Director (PMU)" },
  { role: "Doc Controller", email: "doccontroller@govedms.gov", designation: "Diary & Dak Officer" },
  { role: "Dealing Assistant", email: "dealing@govedms.gov", designation: "Assistant Director" },
  { role: "Auditor", email: "auditor@govedms.gov", designation: "Audit Inspector" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("superadmin@govedms.gov");
  const [password, setPassword] = useState("GovSecurePassword2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.login({ email, password });
      if (res.token) {
        localStorage.setItem("govedms_token", res.token);
        localStorage.setItem("govedms_user", JSON.stringify(res.user));
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with government system");
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("GovSecurePassword2026!");
  };

  return (
    <div className="min-h-screen bg-gov-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-gov-emerald text-gov-gold flex items-center justify-center mx-auto shadow-gov-lg mb-4">
          <FileCheck2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gov-slate">GovEDMS National Portal</h1>
        <p className="text-xs text-gov-muted mt-1">
          Government Electronic Document & e-File Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-gov-lg sm:rounded-2xl border border-gov-border sm:px-10">
          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider">
                Official Email Address
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <Mail className="w-4 h-4 text-gov-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-xs border border-gov-border rounded-xl bg-gov-canvas text-gov-slate focus:outline-none focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider">
                Password / Secure Passcode
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <KeyRound className="w-4 h-4 text-gov-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-xs border border-gov-border rounded-xl bg-gov-canvas text-gov-slate focus:outline-none focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-gov-emerald hover:bg-gov-emerald-dark focus:outline-none transition-all disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Secretariat Node"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher Pills */}
          <div className="mt-6 border-t border-gov-border pt-4">
            <span className="text-[10px] font-bold text-gov-muted uppercase tracking-wider block mb-2 text-center">
              One-Click Executive Test Accounts
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc.email)}
                  className={`text-left p-2 rounded-lg border text-[11px] transition-all ${
                    email === acc.email
                      ? "bg-gov-emerald-soft border-gov-emerald text-gov-emerald font-bold"
                      : "bg-gov-canvas/60 border-gov-border text-gov-slate hover:bg-gov-canvas"
                  }`}
                >
                  <div className="truncate font-bold">{acc.role}</div>
                  <div className="text-[10px] text-gov-muted truncate">{acc.designation}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Download,
  Eye,
  FileCheck2,
  Calendar,
  Building,
  User,
  AlertTriangle,
  Clock,
  Printer,
} from "lucide-react";
import { api } from "@/lib/api";

interface SharedDocumentPageProps {
  params: Promise<{ token: string }>;
}

export default function SharedDocumentPage({ params }: SharedDocumentPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Anti-Screenshot and View-Only Security Hooks
  useEffect(() => {
    if (!isUnlocked || shareData?.allowDownload) return;

    // 1. Prevent Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Prevent Print, Save, and Screen Capture Keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "p" || e.key === "s" || e.key === "u")
      ) {
        e.preventDefault();
        alert("Action Restricted: This official government disclosure is View-Only.");
      }
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };

    // 3. Blur Viewport on Window Blur (e.g. Snipping tool focus loss)
    const handleBlur = () => setIsWindowBlurred(true);
    const handleFocus = () => setIsWindowBlurred(false);

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isUnlocked, shareData]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.verifySharedLink(token, password);
      setShareData(res);
      setIsUnlocked(true);
    } catch (err: any) {
      setError(err.message || "Invalid passcode or link expired");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!shareData?.allowDownload) return;
    const url = api.getSharedDownloadUrl(token);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gov-canvas text-gov-slate select-none flex flex-col justify-between">
      {/* Top Sovereign Bar */}
      <header className="glass-header h-16 px-6 flex items-center justify-between border-b border-gov-border sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gov-emerald text-gov-gold flex items-center justify-center font-bold shadow-xs">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-gov-slate tracking-tight">GovEDMS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gov-gold/15 text-gov-gold border border-gov-gold/30">
                Official Disclosure
              </span>
            </div>
            <p className="text-[10px] text-gov-muted">Government of Pakistan Secure Document Gateway</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-gov-emerald" />
          <span className="font-semibold text-gov-slate hidden sm:inline">Cryptographically Verified Link</span>
        </div>
      </header>

      {/* Main Center Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        {!isUnlocked ? (
          // Password Verification Modal
          <div className="max-w-md w-full mx-auto glass-modal p-8 rounded-3xl border border-gov-border shadow-gov-lg space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gov-emerald/10 text-gov-emerald flex items-center justify-center mx-auto border border-gov-emerald/20">
                <Lock className="w-7 h-7 text-gov-emerald" />
              </div>
              <h2 className="text-lg font-bold text-gov-slate">Protected Government Document</h2>
              <p className="text-xs text-gov-muted leading-relaxed">
                This correspondence has been shared under strict federal access protocols. Enter the authorized access passcode to view.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Access Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gov-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter recipient password"
                    className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl border border-gov-border bg-white text-gov-slate focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all shadow-md shadow-gov-emerald/20 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-gov-gold" />
                <span>{loading ? "Verifying Credentials..." : "Access Document"}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-gov-border/60 text-[10px] text-gov-muted text-center space-y-1">
              <p>All access attempts, client IP addresses, and timestamps are recorded in the forensic audit ledger.</p>
            </div>
          </div>
        ) : (
          // Document Viewer Workspace
          <div className="space-y-4 h-full flex flex-col">
            {/* Letter Metadata Strip */}
            <div className="glass-panel p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-gov-emerald">
                    {shareData?.letter?.diaryNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-emerald/10 text-gov-emerald uppercase">
                    {shareData?.letter?.letterType?.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-gold/15 text-gov-gold">
                    {shareData?.letter?.priority}
                  </span>
                </div>
                <h1 className="text-sm md:text-base font-bold text-gov-slate mt-1">
                  {shareData?.letter?.subject}
                </h1>
                <p className="text-xs text-gov-muted mt-0.5">
                  Issued by: <strong className="text-gov-slate">{shareData?.letter?.senderOrganization}</strong> • Recipient: <span className="text-gov-emerald font-semibold">{shareData?.recipientLabel || "Stakeholder"}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                {shareData?.allowDownload ? (
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4 text-gov-gold" />
                    <span>Download Official PDF</span>
                  </button>
                ) : (
                  <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>View-Only (Anti-Download Protection)</span>
                  </span>
                )}
              </div>
            </div>

            {/* Inline PDF Stream Container with Anti-Screenshot Watermark */}
            <div className="relative flex-1 min-h-[650px] rounded-2xl glass-card overflow-hidden border border-gov-border">
              {/* Blur Overlay on Focus Loss (anti-screenshot) */}
              {isWindowBlurred && !shareData?.allowDownload && (
                <div className="absolute inset-0 z-30 bg-gov-canvas/80 backdrop-blur-md flex items-center justify-center">
                  <div className="glass-modal p-6 rounded-2xl text-center space-y-2 border border-gov-border max-w-sm">
                    <ShieldAlert className="w-8 h-8 text-gov-gold mx-auto" />
                    <h3 className="text-xs font-bold text-gov-slate">Document Concealed</h3>
                    <p className="text-[11px] text-gov-muted">
                      Click back onto this window to resume viewing.
                    </p>
                  </div>
                </div>
              )}

              {/* Streaming PDF Viewer */}
              <iframe
                src={api.getSharedStreamUrl(token)}
                title="Protected Document"
                className="w-full h-full min-h-[650px] border-0"
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-gov-muted border-t border-gov-border/60 bg-white/40">
        <p>GovEDMS National Document & e-File System • Prime Minister Secretariat, Islamabad</p>
      </footer>
    </div>
  );
}

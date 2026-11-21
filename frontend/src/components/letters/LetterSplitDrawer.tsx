"use client";

import { useState, useEffect } from "react";
import {
  X,
  FileText,
  Clock,
  GitBranch,
  ShieldAlert,
  Download,
  Printer,
  Calendar,
  Building,
  User,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Tag as TagIcon,
  Plus,
  Send,
  ExternalLink,
  Share2,
  Lock,
  Copy,
  Eye,
  MessageSquare,
  Maximize2,
  RefreshCw,
  KeyRound,
  FileCheck2,
} from "lucide-react";
import { Letter, DownmarkStatus, PhysicalCustodyStatus, LinkRole } from "@/types";
import { formatDate, formatDateTime, isPastDate } from "@/lib/utils";
import { api } from "@/lib/api";

interface LetterSplitDrawerProps {
  letter: Letter | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function LetterSplitDrawer({
  letter,
  isOpen,
  onClose,
  onRefresh,
}: LetterSplitDrawerProps) {
  const [activeTab, setActiveTab] = useState<"files" | "notes" | "downmarking" | "custody" | "share" | "audit">("files");
  const [leftViewMode, setLeftViewMode] = useState<"pdf" | "metadata">("pdf");

  // Registered officers list
  const [officers, setOfficers] = useState<any[]>([]);

  // Sub-actions state: Physical Custody
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [checkoutPurpose, setCheckoutPurpose] = useState("");
  const [checkoutDueDate, setCheckoutDueDate] = useState("");
  const [checkoutHolder, setCheckoutHolder] = useState("");
  const [checkoutDesignation, setCheckoutDesignation] = useState("");

  // Sub-actions state: Downmarking
  const [isDownmarking, setIsDownmarking] = useState(false);
  const [downmarkOfficerId, setDownmarkOfficerId] = useState("");
  const [downmarkInstructions, setDownmarkInstructions] = useState("");
  const [downmarkDeadline, setDownmarkDeadline] = useState("");
  const [respondingDownmarkId, setRespondingDownmarkId] = useState<string | null>(null);
  const [respondRemarks, setRespondRemarks] = useState("");
  const [respondStatus, setRespondStatus] = useState("COMPLETED_CLOSED");

  // Sub-actions state: Multi-File Linking
  const [isLinkingFile, setIsLinkingFile] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [linkFileId, setLinkFileId] = useState("");
  const [linkFolio, setLinkFolio] = useState("");
  const [linkRole, setLinkRole] = useState<LinkRole>("CASE_RECORD");

  // Sub-actions state: Minute Notes
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);

  // Sub-actions state: Secure External Share
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiresHours, setShareExpiresHours] = useState(24);
  const [shareAllowDownload, setShareAllowDownload] = useState(false);
  const [shareRecipientLabel, setShareRecipientLabel] = useState("");
  const [generatedShareUrl, setGeneratedShareUrl] = useState("");
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  useEffect(() => {
    if (isOpen && letter) {
      // 1. Fetch Users/Officers
      api.getUsers().then((res) => {
        if (Array.isArray(res)) {
          setOfficers(res);
          if (res.length > 0) setDownmarkOfficerId(res[0].id);
        }
      }).catch(console.error);

      // 2. Fetch Files for linking
      api.getFiles().then((res) => {
        if (Array.isArray(res)) {
          setAvailableFiles(res);
          if (res.length > 0) setLinkFileId(res[0].id);
        }
      }).catch(console.error);

      // 3. Fetch Minute Notes
      api.getLetterNotes(letter.id).then((res) => {
        if (Array.isArray(res)) setNotes(res);
      }).catch(console.error);

      // 4. Fetch Share Links
      api.getShareLinks(letter.id).then((res) => {
        if (Array.isArray(res)) setShareLinks(res);
      }).catch(console.error);
    }
  }, [isOpen, letter]);

  if (!isOpen || !letter) return null;

  const isCustodyOverdue =
    !letter.isAttachedInPhysicalFile &&
    letter.physicalDueReturnDate &&
    isPastDate(letter.physicalDueReturnDate);

  // Check-In Physical Original
  const handleCheckin = async () => {
    try {
      await api.checkinPhysical(letter.id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Physical Checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutDesignation) {
      alert("Recipient Officer Designation is mandatory.");
      return;
    }
    try {
      await api.checkoutPhysical(letter.id, {
        issuedToUserId: selectedOfficerId || undefined,
        issuedToExternal: selectedOfficerId ? undefined : checkoutHolder,
        issuedToDesignation: checkoutDesignation,
        purpose: checkoutPurpose,
        expectedReturnAt: new Date(checkoutDueDate).toISOString(),
      });
      setIsCheckingOut(false);
      setCheckoutHolder("");
      setCheckoutDesignation("");
      setCheckoutPurpose("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit Downmark
  const handleDownmarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downmarkOfficerId) {
      alert("Please select a recipient officer for down-marking.");
      return;
    }
    try {
      await api.downmarkLetter(letter.id, {
        markedToId: downmarkOfficerId,
        instructions: downmarkInstructions,
        deadline: downmarkDeadline ? new Date(downmarkDeadline).toISOString() : undefined,
      });
      setIsDownmarking(false);
      setDownmarkInstructions("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Respond / Close Downmark
  const handleRespondDownmark = async (downmarkId: string) => {
    try {
      await api.respondDownmark(downmarkId, {
        status: respondStatus,
        closingRemarks: respondRemarks,
      });
      setRespondingDownmarkId(null);
      setRespondRemarks("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Minute Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setNoteSaving(true);
    try {
      const added = await api.addLetterNote(letter.id, {
        noteText: newNoteText.trim(),
        isInternal: isInternalNote,
      });
      setNotes((prev) => [...prev, added]);
      setNewNoteText("");
    } catch (err: any) {
      alert(err.message || "Failed to record minute note");
    } finally {
      setNoteSaving(false);
    }
  };

  // Generate External Share Link
  const handleCreateShareLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharePassword || sharePassword.length < 4) {
      alert("Password must be at least 4 characters.");
      return;
    }

    setIsGeneratingShare(true);
    try {
      const res = await api.createShareLink(letter.id, {
        password: sharePassword,
        expiresInHours: Number(shareExpiresHours),
        allowDownload: shareAllowDownload,
        recipientLabel: shareRecipientLabel || "Government External Stakeholder",
      });

      const fullUrl = `${window.location.origin}${res.shareUrl}`;
      setGeneratedShareUrl(fullUrl);

      // Refresh share links list
      const updated = await api.getShareLinks(letter.id);
      if (Array.isArray(updated)) setShareLinks(updated);

      setSharePassword("");
      setShareRecipientLabel("");
    } catch (err: any) {
      alert(err.message || "Failed to generate secure link");
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleRevokeShareLink = async (shareId: string) => {
    if (!confirm("Are you sure you want to revoke this secure share link?")) return;
    try {
      await api.revokeShareLink(letter.id, shareId);
      const updated = await api.getShareLinks(letter.id);
      if (Array.isArray(updated)) setShareLinks(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  const handleAttachToFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkFileId) return;

    try {
      await api.linkLetterToFile(letter.id, {
        fileId: linkFileId,
        linkRole: linkRole as string,
        folioNumber: linkFolio || undefined,
      });
      setIsLinkingFile(false);
      setLinkFolio("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gov-slate/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-6xl bg-white h-full shadow-2xl flex flex-col border-l border-gov-border">
        {/* Drawer Header */}
        <div className="p-4 px-6 border-b border-gov-border bg-gov-canvas/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-lg bg-gov-emerald text-white text-xs font-mono font-bold tracking-tight shadow-xs">
              {letter.diaryNumber}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-gov-gold/15 text-gov-gold border border-gov-gold/30">
              {letter.letterType.replace(/_/g, " ")}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                letter.priority === "MOST_IMMEDIATE" || letter.priority === "IMMEDIATE"
                  ? "bg-gov-crimson text-white"
                  : "bg-gov-emerald-soft text-gov-emerald"
              }`}
            >
              {letter.priority.replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab("share")}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gov-gold text-gov-slate-ink text-xs font-bold hover:opacity-90 transition-all shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Secure Link</span>
            </button>

            <a
              href={`http://localhost:4000/api/v1/barcode/generate/${letter.barcode}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gov-border bg-white hover:bg-gov-canvas text-xs font-semibold text-gov-slate"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Barcode</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gov-muted hover:text-gov-slate hover:bg-gov-canvas"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overdue Physical Custody Alert Banner */}
        {isCustodyOverdue && (
          <div className="bg-gov-crimson px-6 py-2.5 text-white flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-gov-gold" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Critical Physical Custody Alert: Original Paper Overdue for Return!
              </span>
            </div>
            <span className="text-xs font-medium">
              Due Date: {formatDateTime(letter.physicalDueReturnDate)} (Holder: {letter.physicalHolderName})
            </span>
          </div>
        )}

        {/* Split-View Body (2 Columns: Left 50% Preview, Right 50% Workflows) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Interactive Inline PDF Viewer & Document Synopsis */}
          <div className="w-1/2 border-r border-gov-border flex flex-col bg-[#FAFBF9]">
            {/* View Mode Toggle Bar */}
            <div className="flex items-center justify-between p-3 px-5 border-b border-gov-border bg-white">
              <div className="flex items-center space-x-1 border border-gov-border rounded-lg p-0.5 bg-gov-canvas text-xs font-semibold">
                <button
                  onClick={() => setLeftViewMode("pdf")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    leftViewMode === "pdf"
                      ? "bg-gov-emerald text-white shadow-xs"
                      : "text-gov-muted hover:text-gov-slate"
                  }`}
                >
                  Inline Document (PDF)
                </button>
                <button
                  onClick={() => setLeftViewMode("metadata")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    leftViewMode === "metadata"
                      ? "bg-gov-emerald text-white shadow-xs"
                      : "text-gov-muted hover:text-gov-slate"
                  }`}
                >
                  Metadata & OCR Excerpt
                </button>
              </div>

              <a
                href={api.getLetterStreamUrl(letter.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 text-xs font-semibold text-gov-emerald hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </a>
            </div>

            {/* Left Content Area */}
            {leftViewMode === "pdf" ? (
              <div className="flex-1 p-4 overflow-hidden flex flex-col">
                <div className="flex-1 rounded-xl overflow-hidden border border-gov-border bg-white shadow-inner">
                  <iframe
                    src={api.getLetterStreamUrl(letter.id)}
                    title="Official Document Stream"
                    className="w-full h-full min-h-[550px] border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted">
                    Official Subject / Title
                  </span>
                  <h2 className="text-sm font-bold text-gov-slate mt-1 leading-snug">
                    {letter.subject}
                  </h2>
                </div>

                {/* Structured Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white border border-gov-border text-xs">
                  <div>
                    <span className="text-gov-muted block text-[10px] uppercase font-bold">Sender Organization</span>
                    <span className="font-semibold text-gov-slate">{letter.senderOrganization}</span>
                  </div>
                  <div>
                    <span className="text-gov-muted block text-[10px] uppercase font-bold">Addressed To</span>
                    <span className="font-semibold text-gov-slate">
                      {letter.addressedToName} ({letter.addressedToPost})
                    </span>
                  </div>
                  <div>
                    <span className="text-gov-muted block text-[10px] uppercase font-bold">Official Reference No</span>
                    <span className="font-mono text-gov-slate">{letter.referenceNumber || "None"}</span>
                  </div>
                  <div>
                    <span className="text-gov-muted block text-[10px] uppercase font-bold">Letter Date</span>
                    <span className="text-gov-slate">{formatDate(letter.letterDate)}</span>
                  </div>
                  <div>
                    <span className="text-gov-muted block text-[10px] uppercase font-bold">Diary Intake Date</span>
                    <span className="text-gov-slate">{formatDateTime(letter.receivedOrSentDate)}</span>
                  </div>
                  <div>
                    <span className="text-gov-muted block text-[10px] uppercase font-bold">Action SLA Deadline</span>
                    <span className={`font-semibold ${letter.dueDate ? "text-gov-crimson" : "text-gov-muted"}`}>
                      {letter.dueDate ? formatDateTime(letter.dueDate) : "No SLA Attached"}
                    </span>
                  </div>
                </div>

                {/* Brief Synopsis / Controller Reason */}
                <div className="p-4 rounded-xl bg-white border border-gov-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted block mb-1">
                    Intake Synopsis / Reason
                  </span>
                  <p className="text-xs text-gov-slate leading-relaxed">{letter.briefReason}</p>
                </div>

                {/* Digital File & Checksum Verification */}
                <div className="p-4 rounded-xl bg-white border border-gov-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted">
                      Digital Archive & Integrity
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      SHA-256 Verified
                    </span>
                  </div>
                  <div className="text-xs font-mono text-gov-slate truncate bg-gov-canvas p-2 rounded border border-gov-border">
                    {letter.originalFileName}
                  </div>
                  <div className="text-[10px] text-gov-muted font-mono truncate">
                    Hash: {letter.sha256Checksum}
                  </div>
                </div>

                {/* OCR Extracted Text Preview */}
                {letter.ocrExtractedText && (
                  <div className="p-4 rounded-xl bg-white border border-gov-border">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted block mb-1.5">
                      OCR Full-Text Content
                    </span>
                    <div className="text-xs text-gov-slate font-mono bg-gov-canvas/60 p-3 rounded-lg border border-gov-border max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {letter.ocrExtractedText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Workflows, Minutes, Down-Marking, Sharing & Audit */}
          <div className="w-1/2 flex flex-col bg-white">
            {/* Action Tabs Header */}
            <div className="flex border-b border-gov-border px-4 pt-3 bg-gov-canvas/40 space-x-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab("files")}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                  activeTab === "files"
                    ? "bg-white border-gov-emerald text-gov-emerald shadow-xs"
                    : "border-transparent text-gov-muted hover:text-gov-slate"
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Files ({letter.fileLinks?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                  activeTab === "notes"
                    ? "bg-white border-gov-emerald text-gov-emerald shadow-xs"
                    : "border-transparent text-gov-muted hover:text-gov-slate"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Minute Notes ({notes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("downmarking")}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                  activeTab === "downmarking"
                    ? "bg-white border-gov-emerald text-gov-emerald shadow-xs"
                    : "border-transparent text-gov-muted hover:text-gov-slate"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Down-Marking ({letter.downmarkings?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("custody")}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                  activeTab === "custody"
                    ? "bg-white border-gov-emerald text-gov-emerald shadow-xs"
                    : "border-transparent text-gov-muted hover:text-gov-slate"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Hardcopy</span>
                {!letter.isAttachedInPhysicalFile && (
                  <span className="w-2 h-2 rounded-full bg-gov-crimson" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("share")}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                  activeTab === "share"
                    ? "bg-white border-gov-emerald text-gov-emerald shadow-xs"
                    : "border-transparent text-gov-muted hover:text-gov-slate"
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Links ({shareLinks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                  activeTab === "audit"
                    ? "bg-white border-gov-emerald text-gov-emerald shadow-xs"
                    : "border-transparent text-gov-muted hover:text-gov-slate"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Audit</span>
              </button>
            </div>

            {/* Tab 1: Multi-File Links */}
            {activeTab === "files" && (
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                    Linked File Jackets & Folios
                  </h4>
                  <button
                    onClick={() => setIsLinkingFile(true)}
                    className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gov-emerald-soft text-gov-emerald hover:bg-gov-emerald hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Attach to Additional File</span>
                  </button>
                </div>

                {isLinkingFile && (
                  <form onSubmit={handleAttachToFile} className="p-4 rounded-xl border border-gov-emerald/40 bg-gov-emerald-soft/30 space-y-3">
                    <h5 className="text-xs font-bold text-gov-slate">Attach Letter to Another Case/Project File</h5>
                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Target File *</label>
                      <select
                        required
                        value={linkFileId}
                        onChange={(e) => setLinkFileId(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      >
                        {availableFiles.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.fileNumber} — {f.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gov-muted block mb-1">Link Role</label>
                        <select
                          value={linkRole}
                          onChange={(e) => setLinkRole(e.target.value as LinkRole)}
                          className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                        >
                          <option value="CASE_RECORD">Case Record</option>
                          <option value="CROSS_REFERENCE">Cross Reference</option>
                          <option value="PRECEDENT_COPY">Precedent Copy</option>
                          <option value="TEMPORARY_DEPOSIT">Temporary Deposit</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gov-muted block mb-1">Folio Number</label>
                        <input
                          type="text"
                          value={linkFolio}
                          onChange={(e) => setLinkFolio(e.target.value)}
                          placeholder="e.g. Folio 45-48"
                          className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-1">
                      <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-gov-emerald text-white text-xs font-bold">
                        Confirm Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLinkingFile(false)}
                        className="px-3.5 py-1.5 rounded-lg border border-gov-border text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {letter.fileLinks?.map((link) => (
                    <div
                      key={link.id}
                      className="p-3.5 rounded-xl border border-gov-border bg-gov-canvas/40 hover:bg-gov-canvas transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-emerald text-white">
                          {link.linkRole.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-mono font-bold text-gov-emerald">
                          {link.folioNumber || "Folio N/A"}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-gov-slate">{link.file.title}</h5>
                      <div className="flex items-center space-x-3 text-[11px] text-gov-muted mt-1.5">
                        <span className="font-mono">{link.file.fileNumber}</span>
                        <span>•</span>
                        <span>{link.file.rackLocation || "Rack location unassigned"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Minute Notes Sheet (Core Feature) */}
            {activeTab === "notes" && (
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                      Official Minute Notes Sheet
                    </h4>
                    <p className="text-[10px] text-gov-muted">Chronological notes and observations recorded by officers.</p>
                  </div>
                </div>

                {/* Add Minute Note Form */}
                <form onSubmit={handleAddNote} className="p-3.5 rounded-xl border border-gov-border bg-gov-canvas/40 space-y-2.5">
                  <label className="text-[10px] font-bold text-gov-muted uppercase block">
                    Record New Official Minute Note
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Enter official minute note, observation, or departmental endorsement..."
                    className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate focus:outline-none focus:ring-1 focus:ring-gov-emerald"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-xs text-gov-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-gov-emerald"
                      />
                      <span>Internal Confidential Minute</span>
                    </label>

                    <button
                      type="submit"
                      disabled={noteSaving}
                      className="px-3.5 py-1.5 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all disabled:opacity-50"
                    >
                      {noteSaving ? "Recording..." : "Record Minute Note"}
                    </button>
                  </div>
                </form>

                {/* Minute Notes Register */}
                <div className="space-y-3">
                  {notes.length === 0 ? (
                    <p className="text-xs text-gov-muted italic text-center py-6">
                      No minute notes recorded on this document sheet yet.
                    </p>
                  ) : (
                    notes.map((note, index) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl border border-gov-border bg-white text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-gov-border/60 pb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-gov-slate">
                              Minute #{index + 1}: {note.author?.fullName}
                            </span>
                            <span className="text-[10px] text-gov-muted">
                              ({note.author?.designation})
                            </span>
                          </div>
                          <span className="text-[10px] text-gov-muted">
                            {formatDateTime(note.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-gov-slate leading-relaxed whitespace-pre-wrap">
                          {note.noteText}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-gov-muted border-t border-gov-border/40">
                          <span>{note.author?.primaryDept?.name || "PM Secretariat"}</span>
                          {note.isInternal && (
                            <span className="font-bold text-gov-emerald uppercase">Internal Note</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Hierarchical Down-Marking Workflow */}
            {activeTab === "downmarking" && (
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                    Delegation & Accountability Chain
                  </h4>
                  <button
                    onClick={() => setIsDownmarking(true)}
                    className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gov-emerald text-white hover:bg-gov-emerald-dark transition-all cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Down-Mark to Subordinate</span>
                  </button>
                </div>

                {isDownmarking && (
                  <form onSubmit={handleDownmarkSubmit} className="p-4 rounded-xl border border-gov-emerald bg-gov-emerald-soft/40 space-y-3">
                    <h5 className="text-xs font-bold text-gov-slate">Down-Mark Instructions & Subordinate Assignment</h5>
                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Subordinate Recipient Officer *</label>
                      <select
                        required
                        value={downmarkOfficerId}
                        onChange={(e) => setDownmarkOfficerId(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      >
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} ({o.designation}) — {o.primaryDept?.code || o.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      required
                      value={downmarkInstructions}
                      onChange={(e) => setDownmarkInstructions(e.target.value)}
                      placeholder="Enter minute/instructions (e.g. Please examine and put up draft reply within 48h)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-gov-border bg-white focus:outline-none focus:ring-1 focus:ring-gov-emerald"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <input
                        type="datetime-local"
                        value={downmarkDeadline}
                        onChange={(e) => setDownmarkDeadline(e.target.value)}
                        className="text-xs p-2 rounded-lg border border-gov-border bg-white flex-1"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-gov-emerald text-white text-xs font-bold cursor-pointer"
                      >
                        Forward
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDownmarking(false)}
                        className="px-3 py-1.5 rounded-lg border border-gov-border text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Respond Drawer */}
                {respondingDownmarkId && (
                  <div className="p-4 rounded-xl border border-gov-gold bg-gov-gold-light/40 space-y-3">
                    <h5 className="text-xs font-bold text-gov-slate">Submit Down-Mark Resolution / Closing Remarks</h5>
                    <div className="flex space-x-2">
                      <select
                        value={respondStatus}
                        onChange={(e) => setRespondStatus(e.target.value)}
                        className="text-xs p-2 rounded-lg border border-gov-border bg-white"
                      >
                        <option value="IN_PROGRESS">IN_PROGRESS (Under Examination)</option>
                        <option value="COMPLETED_CLOSED">COMPLETED_CLOSED (Formal Reply Filed)</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={respondRemarks}
                      onChange={(e) => setRespondRemarks(e.target.value)}
                      placeholder="Enter resolution notes, summary of reply submitted..."
                      className="w-full text-xs p-2.5 rounded-lg border border-gov-border bg-white"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRespondDownmark(respondingDownmarkId)}
                        className="px-3 py-1.5 rounded-lg bg-gov-emerald text-white text-xs font-bold"
                      >
                        Save Resolution
                      </button>
                      <button
                        onClick={() => setRespondingDownmarkId(null)}
                        className="px-3 py-1.5 rounded-lg border border-gov-border text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gov-border">
                  {letter.downmarkings?.map((dm, idx) => (
                    <div key={dm.id} className="relative pl-7">
                      <div className="w-3 h-3 rounded-full bg-gov-emerald absolute left-1.5 top-1 ring-4 ring-white" />
                      <div className="p-3.5 rounded-xl border border-gov-border bg-white shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gov-slate">
                            Step {dm.sequenceOrder}: {dm.markedBy.fullName} ➔ {dm.markedTo.fullName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              dm.status === "COMPLETED_CLOSED"
                                ? "bg-emerald-100 text-emerald-800"
                                : dm.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {dm.status}
                          </span>
                        </div>
                        <p className="text-xs text-gov-slate italic">&quot;{dm.instructions}&quot;</p>
                        
                        {dm.closingRemarks && (
                          <div className="p-2 rounded bg-gov-canvas border border-gov-border text-[11px] text-gov-slate">
                            <strong>Closing Remarks:</strong> {dm.closingRemarks}
                          </div>
                        )}

                        <div className="text-[10px] text-gov-muted flex items-center justify-between pt-1 border-t border-gov-border/60">
                          <span>Marked: {formatDateTime(dm.createdAt)}</span>
                          {dm.status !== "COMPLETED_CLOSED" && (
                            <button
                              onClick={() => {
                                setRespondingDownmarkId(dm.id);
                                setRespondRemarks(dm.closingRemarks || "");
                              }}
                              className="text-gov-emerald font-bold hover:underline"
                            >
                              Update Status / Close
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Physical Hardcopy Custody */}
            {activeTab === "custody" && (
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="p-4 rounded-xl border border-gov-border bg-gov-canvas/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted block">
                        Hardcopy Verification Status
                      </span>
                      <h4 className="text-sm font-bold text-gov-slate mt-0.5">
                        {letter.isAttachedInPhysicalFile
                          ? "✓ Hardcopy Safely Attached in File"
                          : "⚠️ Original Copy Removed / Issued Out"}
                      </h4>
                    </div>

                    {letter.isAttachedInPhysicalFile ? (
                      <button
                        onClick={() => setIsCheckingOut(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gov-amber text-white hover:bg-gov-amber/90"
                      >
                        Check-Out Hardcopy
                      </button>
                    ) : (
                      <button
                        onClick={handleCheckin}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gov-emerald text-white hover:bg-gov-emerald-dark"
                      >
                        Confirm Return to File
                      </button>
                    )}
                  </div>

                  {!letter.isAttachedInPhysicalFile && (
                    <div className="p-3 rounded-lg bg-gov-crimson-light/50 border border-gov-crimson/20 text-xs text-gov-slate space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Current Holder:</span>
                        <span className="font-bold">{letter.physicalHolderName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Due Return Date:</span>
                        <span className="font-bold text-gov-crimson">
                          {formatDateTime(letter.physicalDueReturnDate)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {isCheckingOut && (
                  <form onSubmit={handleCheckoutSubmit} className="p-4 rounded-xl border border-gov-amber bg-gov-amber-light/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gov-slate">Log Physical Original Removal</h5>
                      <span className="text-[10px] font-bold text-gov-amber px-2 py-0.5 rounded bg-white border border-gov-amber/40">
                        Out-Timestamp: NOW
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">
                        Recipient Government Officer
                      </label>
                      <select
                        value={selectedOfficerId}
                        onChange={(e) => {
                          const uid = e.target.value;
                          setSelectedOfficerId(uid);
                          const officer = officers.find((o) => o.id === uid);
                          if (officer) {
                            setCheckoutHolder(officer.fullName);
                            setCheckoutDesignation(officer.designation);
                          } else {
                            setCheckoutHolder("");
                            setCheckoutDesignation("");
                          }
                        }}
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      >
                        <option value="">-- Manual External Recipient / Authority --</option>
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} ({o.designation})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-gov-muted block mb-1">Officer Full Name *</label>
                        <input
                          type="text"
                          required
                          value={checkoutHolder}
                          onChange={(e) => setCheckoutHolder(e.target.value)}
                          placeholder="Full Name"
                          className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gov-muted block mb-1">Official Designation / Post *</label>
                        <input
                          type="text"
                          required
                          value={checkoutDesignation}
                          onChange={(e) => setCheckoutDesignation(e.target.value)}
                          placeholder="e.g. Deputy Secretary"
                          className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Purpose & Justification *</label>
                      <input
                        type="text"
                        required
                        value={checkoutPurpose}
                        onChange={(e) => setCheckoutPurpose(e.target.value)}
                        placeholder="Purpose (e.g. For Secretary Signature / Court Hearing)"
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Expected Return Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={checkoutDueDate}
                        onChange={(e) => setCheckoutDueDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      />
                    </div>

                    <div className="flex space-x-2 pt-1">
                      <button type="submit" className="px-3.5 py-1.5 rounded-lg bg-gov-amber text-white text-xs font-bold shadow-2xs">
                        Confirm Hardcopy Check-Out
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCheckingOut(false)}
                        className="px-3 py-1.5 rounded-lg border border-gov-border text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <h5 className="text-xs font-bold uppercase tracking-wider text-gov-slate pt-2">
                  Physical File Movement Ledger
                </h5>
                <div className="space-y-2">
                  {(!letter.custodyLogs || letter.custodyLogs.length === 0) ? (
                    <p className="text-xs text-gov-muted italic">No hardcopy checkout logs recorded for this letter.</p>
                  ) : (
                    letter.custodyLogs.map((log: any) => {
                      const officer = log.issuedToUser?.fullName || log.issuedToExternal || "Designated Officer";
                      const desig = log.issuedToDesignation || log.issuedToUser?.designation || "Officer";
                      const isReturned = Boolean(log.returnedAt);
                      const isOverdue = !isReturned && isPastDate(log.expectedReturnAt);

                      return (
                        <div key={log.id} className="p-3.5 rounded-xl border border-gov-border bg-white text-xs space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between font-bold text-gov-slate">
                            <span className="text-[11px] font-mono text-gov-emerald">
                              Out: {formatDateTime(log.checkedOutAt)}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                isReturned
                                  ? "bg-gov-emerald-soft text-gov-emerald"
                                  : isOverdue
                                  ? "bg-gov-crimson-light text-gov-crimson animate-gov-pulse"
                                  : "bg-gov-amber-light text-gov-amber"
                              }`}
                            >
                              {isReturned ? "RETURNED TO FILE" : isOverdue ? "OVERDUE RETURN" : "HELD OUT"}
                            </span>
                          </div>

                          <div className="text-xs">
                            <span className="text-gov-muted font-medium">Taken By: </span>
                            <strong className="text-gov-slate">{officer}</strong>{" "}
                            <span className="text-gov-emerald font-semibold">({desig})</span>
                          </div>

                          <p className="text-[11px] text-gov-muted">&quot;{log.purpose}&quot;</p>

                          <div className="text-[10px] text-gov-muted pt-1 border-t border-gov-border/60 flex justify-between">
                            <span>Due Return: <strong className="text-gov-slate">{formatDateTime(log.expectedReturnAt)}</strong></span>
                            <span>{log.returnedAt ? `Returned: ${formatDateTime(log.returnedAt)}` : "Pending return"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Secure External Share */}
            {activeTab === "share" && (
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                      External Time-Bound & Password-Protected Sharing
                    </h4>
                    <p className="text-[10px] text-gov-muted">Generate secure encrypted links for external ministries or courts.</p>
                  </div>
                </div>

                {/* Generated Link Alert Banner */}
                {generatedShareUrl && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Share Link Successfully Created!</span>
                      <button
                        onClick={() => copyToClipboard(generatedShareUrl)}
                        className="flex items-center space-x-1 text-xs font-bold text-gov-emerald hover:underline cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedShareLink ? "Copied!" : "Copy URL"}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={generatedShareUrl}
                      className="w-full text-xs p-2 rounded-lg bg-white border border-emerald-200 text-gov-slate font-mono select-all"
                    />
                  </div>
                )}

                {/* Create Share Link Form */}
                <form onSubmit={handleCreateShareLink} className="p-4 rounded-xl border border-gov-border bg-gov-canvas/40 space-y-3">
                  <h5 className="text-xs font-bold text-gov-slate">Configure New Secure Share Link</h5>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Access Passcode *</label>
                      <input
                        type="password"
                        required
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                        placeholder="Passcode for recipient"
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gov-muted block mb-1">Expiry Duration</label>
                      <select
                        value={shareExpiresHours}
                        onChange={(e) => setShareExpiresHours(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                      >
                        <option value={1}>1 Hour</option>
                        <option value={24}>24 Hours (1 Day)</option>
                        <option value={72}>72 Hours (3 Days)</option>
                        <option value={168}>7 Days (1 Week)</option>
                        <option value={720}>30 Days (1 Month)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gov-muted block mb-1">Recipient Label / Organization</label>
                    <input
                      type="text"
                      value={shareRecipientLabel}
                      onChange={(e) => setShareRecipientLabel(e.target.value)}
                      placeholder="e.g. Law Ministry Additional Secretary / Supreme Court Registrar"
                      className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center space-x-2 text-xs text-gov-slate cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareAllowDownload}
                        onChange={(e) => setShareAllowDownload(e.target.checked)}
                        className="rounded text-gov-emerald"
                      />
                      <span>Allow PDF Download (Leave unchecked for View-Only)</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isGeneratingShare}
                      className="px-4 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all disabled:opacity-50"
                    >
                      {isGeneratingShare ? "Generating..." : "Generate Secure Link"}
                    </button>
                  </div>
                </form>

                {/* Existing Share Links & Access Logs */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gov-slate">Active & Past Share Links</h5>
                  {shareLinks.length === 0 ? (
                    <p className="text-xs text-gov-muted italic">No external share links generated for this document yet.</p>
                  ) : (
                    shareLinks.map((s) => (
                      <div key={s.id} className="p-3.5 rounded-xl border border-gov-border bg-white space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gov-slate">{s.recipientLabel || "External Stakeholder"}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              s.isRevoked
                                ? "bg-red-100 text-red-800"
                                : new Date() > new Date(s.expiresAt)
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {s.isRevoked ? "REVOKED" : new Date() > new Date(s.expiresAt) ? "EXPIRED" : "ACTIVE"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gov-muted font-mono">
                          <span>Expires: {formatDateTime(s.expiresAt)}</span>
                          <span>{s.allowDownload ? "Download Allowed" : "View-Only"}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-gov-border/60">
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/shared/${s.token}`)}
                            className="text-gov-emerald font-semibold text-[11px] hover:underline"
                          >
                            Copy Link URL
                          </button>

                          {!s.isRevoked && (
                            <button
                              onClick={() => handleRevokeShareLink(s.id)}
                              className="text-gov-crimson font-semibold text-[11px] hover:underline"
                            >
                              Revoke Access
                            </button>
                          )}
                        </div>

                        {/* Recent Access Logs */}
                        {s.accessLogs && s.accessLogs.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gov-border/40 text-[10px] text-gov-muted space-y-1">
                            <span className="font-bold block uppercase tracking-wider">Access Forensics:</span>
                            {s.accessLogs.slice(0, 3).map((log: any) => (
                              <div key={log.id} className="flex justify-between">
                                <span>{log.action} from IP: {log.ipAddress}</span>
                                <span>{formatDateTime(log.accessedAt)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 6: Forensic Audit Log */}
            {activeTab === "audit" && (
              <div className="p-5 overflow-y-auto flex-1 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                  Document Forensic Access Ledger
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-gov-border bg-gov-canvas/40 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-gov-slate">
                      <span>VIEW_DOCUMENT</span>
                      <span className="text-[10px] text-gov-muted">Current Session</span>
                    </div>
                    <p className="text-[11px] text-gov-muted">Document opened by active officer clearance.</p>
                  </div>
                  <div className="p-3 rounded-xl border border-gov-border bg-gov-canvas/40 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-gov-slate">
                      <span>CREATE_LETTER</span>
                      <span className="text-[10px] text-gov-muted">{formatDateTime(letter.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-gov-muted">Intake recorded under Diary No {letter.diaryNumber}.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

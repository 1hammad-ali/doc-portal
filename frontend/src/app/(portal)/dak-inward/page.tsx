"use client";

import { useState, useEffect } from "react";
import {
  Inbox,
  Plus,
  Trash2,
  FolderKanban,
  FileCheck2,
  Upload,
  Calendar,
  AlertCircle,
  Building,
  User,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Clock,
  ArrowRight,
  Printer,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { GovFile, Department, Letter } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

export default function InwardDakPage() {
  const [viewMode, setViewMode] = useState<"register" | "intake">("register");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableFiles, setAvailableFiles] = useState<GovFile[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Register Filters
  const [selectedDeptId, setSelectedDeptId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Selected Letter for Split Drawer
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  // Intake Form Fields
  const [subject, setSubject] = useState("");
  const [briefReason, setBriefReason] = useState("");
  const [letterType, setLetterType] = useState("ACTION_REQUIRED");
  const [priority, setPriority] = useState("ROUTINE");
  const [direction, setDirection] = useState("INWARD");
  const [senderName, setSenderName] = useState("");
  const [senderOrganization, setSenderOrganization] = useState("");
  const [addressedToName, setAddressedToName] = useState("");
  const [addressedToPost, setAddressedToPost] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isAttachedInPhysicalFile, setIsAttachedInPhysicalFile] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Multi-File Linking Junction Array
  const [fileLinks, setFileLinks] = useState<
    { fileId: string; linkRole: string; folioNumber: string; attachedNote: string }[]
  >([
    { fileId: "", linkRole: "PRIMARY_MASTER", folioNumber: "Folio 01", attachedNote: "Master record copy" },
  ]);

  const loadRegister = async () => {
    try {
      setRegisterLoading(true);
      const params: Record<string, string> = { direction: "INWARD" };
      if (selectedDeptId !== "ALL") params.departmentId = selectedDeptId;
      const res = await api.getLetters(params);
      const list = res?.letters || (Array.isArray(res) ? res : []);
      setLetters(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setRegisterLoading(false);
    }
  };

  const fetchPrerequisites = async () => {
    try {
      const [deptRes, filesRes] = await Promise.all([
        api.getDepartments(),
        api.getFiles(),
      ]);
      if (deptRes?.all) {
        setDepartments(deptRes.all);
        if (deptRes.all.length > 0) setDepartmentId(deptRes.all[0].id);
      }
      if (Array.isArray(filesRes)) {
        setAvailableFiles(filesRes);
        if (filesRes.length > 0) {
          setFileLinks([
            { fileId: filesRes[0].id, linkRole: "PRIMARY_MASTER", folioNumber: "Folio 01", attachedNote: "Main file copy" },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrerequisites();
    loadRegister();
  }, []);

  useEffect(() => {
    loadRegister();
  }, [selectedDeptId]);

  const addFileLinkRow = () => {
    setFileLinks([
      ...fileLinks,
      { fileId: availableFiles[0]?.id || "", linkRole: "CASE_RECORD", folioNumber: "", attachedNote: "" },
    ]);
  };

  const removeFileLinkRow = (index: number) => {
    if (fileLinks.length <= 1) return;
    setFileLinks(fileLinks.filter((_, i) => i !== index));
  };

  const updateFileLinkRow = (index: number, field: string, val: string) => {
    const updated = [...fileLinks];
    updated[index] = { ...updated[index], [field]: val };
    setFileLinks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("briefReason", briefReason);
      formData.append("letterType", letterType);
      formData.append("priority", priority);
      formData.append("direction", direction);
      formData.append("senderName", senderName);
      formData.append("senderOrganization", senderOrganization);
      formData.append("addressedToName", addressedToName);
      formData.append("addressedToPost", addressedToPost);
      if (referenceNumber) formData.append("referenceNumber", referenceNumber);
      formData.append("letterDate", letterDate);
      if (dueDate) formData.append("dueDate", dueDate);
      formData.append("departmentId", departmentId);
      formData.append("isAttachedInPhysicalFile", String(isAttachedInPhysicalFile));

      const validLinks = fileLinks.filter((l) => l.fileId);
      formData.append("fileLinks", JSON.stringify(validLinks));

      if (selectedFile) {
        formData.append("document", selectedFile);
      }

      const res = await api.createLetter(formData);
      setSuccessMessage(`Inward Dak ${res.letter?.diaryNumber || "Document"} successfully logged and linked to ${validLinks.length} files.`);

      // Reset form
      setSubject("");
      setBriefReason("");
      setSenderName("");
      setSenderOrganization("");
      setAddressedToName("");
      setAddressedToPost("");
      setReferenceNumber("");
      setSelectedFile(null);

      // Reload Register and switch to register view
      loadRegister();
      setViewMode("register");
      if (res.letter) {
        setSelectedLetter(res.letter);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to intake Inward Dak letter");
    } finally {
      setLoading(false);
    }
  };

  // Client-side date and search filtering
  const filteredLetters = letters.filter((l) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        l.diaryNumber.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.senderOrganization.toLowerCase().includes(q) ||
        l.addressedToName.toLowerCase().includes(q) ||
        l.barcode.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (fromDate) {
      const lDate = new Date(l.letterDate).getTime();
      const fDate = new Date(fromDate).getTime();
      if (lDate < fDate) return false;
    }

    if (toDate) {
      const lDate = new Date(l.letterDate).getTime();
      const tDate = new Date(toDate + "T23:59:59").getTime();
      if (lDate > tDate) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Dual-View Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gov-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gov-slate">Central & Departmental Inward Dak</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gov-emerald-soft text-gov-emerald border border-gov-emerald/30">
              National Register
            </span>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Log, classify, link across files, and inspect all incoming government correspondence.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex border border-gov-border rounded-xl p-1 bg-white text-xs font-semibold space-x-1 shadow-2xs">
            <button
              onClick={() => setViewMode("register")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === "register"
                  ? "bg-gov-emerald text-white shadow-xs"
                  : "text-gov-muted hover:text-gov-slate"
              }`}
            >
              Dak Inward Register ({filteredLetters.length})
            </button>
            <button
              onClick={() => setViewMode("intake")}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                viewMode === "intake"
                  ? "bg-gov-emerald text-white shadow-xs"
                  : "text-gov-muted hover:text-gov-slate"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Inward Intake</span>
            </button>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage("")} className="text-emerald-800 hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: DAK INWARD REGISTER TABLE */}
      {viewMode === "register" && (
        <div className="space-y-4">
          {/* Department Filter Tabs */}
          <div className="flex border-b border-gov-border pb-2 space-x-2 overflow-x-auto">
            <button
              onClick={() => setSelectedDeptId("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedDeptId === "ALL"
                  ? "bg-gov-emerald text-white shadow-xs"
                  : "bg-white text-gov-muted border border-gov-border hover:text-gov-slate"
              }`}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedDeptId === dept.id
                    ? "bg-gov-emerald text-white shadow-xs"
                    : "bg-white text-gov-muted border border-gov-border hover:text-gov-slate"
                }`}
              >
                {dept.name} ({dept.code})
              </button>
            ))}
          </div>

          {/* Search & Date Range Filter Strip */}
          <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gov-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Dak No, Subject, Barcode, Sender Org..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gov-border bg-white text-gov-slate focus:outline-none focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gov-muted font-bold uppercase text-[10px]">Date Range:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs p-1.5 px-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
              />
              <span className="text-gov-muted">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs p-1.5 px-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  className="text-[11px] text-gov-crimson font-bold hover:underline ml-1"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>

          {/* Letters Table (100% Clickable Rows) */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-gov-border">
            {registerLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gov-muted">
                <div className="w-6 h-6 border-2 border-gov-emerald border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">Loading Inward Dak Register...</p>
              </div>
            ) : filteredLetters.length === 0 ? (
              <div className="py-12 text-center text-gov-muted space-y-2">
                <Inbox className="w-10 h-10 text-gov-muted/50 mx-auto" />
                <p className="text-xs font-semibold">No inward letters matching the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gov-canvas/60 border-b border-gov-border text-[10px] font-bold uppercase tracking-wider text-gov-muted">
                      <th className="py-3 px-4">Dak ID / Barcode</th>
                      <th className="py-3 px-4">Subject & Synopsis</th>
                      <th className="py-3 px-4">Sender Org / Addressee</th>
                      <th className="py-3 px-4">Letter Date</th>
                      <th className="py-3 px-4">Priority & SLA</th>
                      <th className="py-3 px-4">Hardcopy</th>
                      <th className="py-3 px-4">Files Linked</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gov-border/60">
                    {filteredLetters.map((l) => (
                      <tr
                        key={l.id}
                        onClick={() => setSelectedLetter(l)}
                        className="hover:bg-gov-emerald-soft/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-gov-emerald group-hover:underline">
                            {l.diaryNumber}
                          </span>
                          <span className="block text-[10px] text-gov-muted">{l.barcode}</span>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-bold text-gov-slate line-clamp-1">{l.subject}</p>
                          <p className="text-[11px] text-gov-muted line-clamp-1 mt-0.5">{l.briefReason}</p>
                        </td>

                        <td className="py-3 px-4">
                          <strong className="text-gov-slate block">{l.senderOrganization}</strong>
                          <span className="text-[11px] text-gov-muted">To: {l.addressedToName}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-gov-slate block">{formatDate(l.letterDate)}</span>
                          <span className="text-[10px] text-gov-muted">
                            Rec: {formatDate(l.receivedOrSentDate)}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              l.priority === "MOST_IMMEDIATE" || l.priority === "IMMEDIATE"
                                ? "bg-gov-crimson text-white"
                                : "bg-gov-emerald-soft text-gov-emerald"
                            }`}
                          >
                            {l.priority.replace(/_/g, " ")}
                          </span>
                          {l.dueDate && (
                            <span className="block text-[10px] text-gov-crimson font-semibold mt-0.5">
                              SLA: {formatDate(l.dueDate)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              l.isAttachedInPhysicalFile
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800 animate-gov-pulse"
                            }`}
                          >
                            {l.isAttachedInPhysicalFile ? "In File" : "Issued Out"}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-bold text-gov-emerald text-xs">
                            {l.fileLinks?.length || 1} File(s)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLetter(l);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gov-emerald-soft text-gov-emerald hover:bg-gov-emerald hover:text-white font-bold text-[11px] transition-all"
                          >
                            Open Drawer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: NEW INWARD DAK INTAKE FORM */}
      {viewMode === "intake" && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-gov-crimson-light border border-gov-crimson/30 text-xs text-gov-crimson font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Classification & Core Metadata */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate border-b border-gov-border/60 pb-2">
              1. Document Classification & Department Clearance
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Target Department / Wing *
                </label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-semibold"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Correspondence Category *
                </label>
                <select
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-semibold"
                >
                  <option value="ACTION_REQUIRED">Action Required</option>
                  <option value="CC_INFORMATION_ONLY">CC / Information Only</option>
                  <option value="NOTIFICATION_SRO">Notification / SRO</option>
                  <option value="DIRECTIVE_ORDER">Directive / Prime Minister Order</option>
                  <option value="FINANCIAL_AUDIT">Financial / Audit Para</option>
                  <option value="LEGAL_COURT_NOTICE">Legal / Court Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Priority SLA Rating
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-semibold"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent (48-72h)</option>
                  <option value="IMMEDIATE">Immediate (24-48h)</option>
                  <option value="MOST_IMMEDIATE">Most Immediate (24h SLA)</option>
                  <option value="SECRET_CONFIDENTIAL">Secret / Confidential</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Letter Date (Printed on Original) *
                </label>
                <input
                  type="date"
                  required
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Action SLA Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Subject & Reason */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate border-b border-gov-border/60 pb-2">
              2. Official Subject & Intake Synopsis
            </h3>

            <div>
              <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                Letter Subject / Title *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Directive Regarding Accelerated Completion of Sector G Infrastructure Project"
                className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                Intake Synopsis / Mandatory Brief Reason *
              </label>
              <textarea
                required
                rows={3}
                value={briefReason}
                onChange={(e) => setBriefReason(e.target.value)}
                placeholder="Concise summary entered by Documentation Controller describing why letter arrived and required actions..."
                className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-white text-gov-slate font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Source & Recipient */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate border-b border-gov-border/60 pb-2">
              3. Source Authority & Addressee
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Sender Organization *
                </label>
                <input
                  type="text"
                  required
                  value={senderOrganization}
                  onChange={(e) => setSenderOrganization(e.target.value)}
                  placeholder="e.g. Prime Minister's Secretariat / Ministry of Law"
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Sender Name & Designation
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Principal Secretary to Prime Minister"
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Addressee Officer Name *
                </label>
                <input
                  type="text"
                  required
                  value={addressedToName}
                  onChange={(e) => setAddressedToName(e.target.value)}
                  placeholder="e.g. Dr. Ayesha Noor / Engr. Salman Farooq"
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Addressee Designation / Post
                </label>
                <input
                  type="text"
                  value={addressedToPost}
                  onChange={(e) => setAddressedToPost(e.target.value)}
                  placeholder="e.g. Federal Secretary / Project Director"
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white text-gov-slate font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Multi-File Linking Junction (Non-Negotiable Requirement 1) */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gov-border/60 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
                  4. Multi-File Placement & Folio Indexing
                </h3>
                <p className="text-[11px] text-gov-muted">
                  Link this single letter to multiple file jackets simultaneously with per-file folio numbers.
                </p>
              </div>
              <button
                type="button"
                onClick={addFileLinkRow}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another File Link</span>
              </button>
            </div>

            <div className="space-y-3">
              {fileLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-gov-border bg-gov-canvas/40 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
                      Target File Jacket *
                    </label>
                    <select
                      value={link.fileId}
                      onChange={(e) => updateFileLinkRow(idx, "fileId", e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white font-semibold"
                    >
                      {availableFiles.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.fileNumber} — {f.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
                      File Role
                    </label>
                    <select
                      value={link.linkRole}
                      onChange={(e) => updateFileLinkRow(idx, "linkRole", e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white text-xs"
                    >
                      <option value="PRIMARY_MASTER">Primary Master File</option>
                      <option value="CASE_RECORD">Case File Record</option>
                      <option value="PROJECT_FILE">Project File Record</option>
                      <option value="OFFICER_COPY">Officer Personal Dossier</option>
                      <option value="CROSS_REFERENCE">Cross Reference</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
                      Folio / Page
                    </label>
                    <input
                      type="text"
                      value={link.folioNumber}
                      onChange={(e) => updateFileLinkRow(idx, "folioNumber", e.target.value)}
                      placeholder="Folio 01"
                      className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gov-muted uppercase mb-1">
                      Attached Note
                    </label>
                    <input
                      type="text"
                      value={link.attachedNote}
                      onChange={(e) => updateFileLinkRow(idx, "attachedNote", e.target.value)}
                      placeholder="Note"
                      className="w-full text-xs p-2 rounded-lg border border-gov-border bg-white"
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end pt-4">
                    {fileLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFileLinkRow(idx)}
                        className="p-1.5 text-gov-crimson hover:bg-gov-crimson-light rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Document Upload & Physical Verification */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate border-b border-gov-border/60 pb-2">
              5. Scanned Document Upload & Physical Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <label className="block text-xs font-bold text-gov-slate uppercase tracking-wider mb-1">
                  Attach Scanned Document (PDF / Image)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gov-emerald-soft file:text-gov-emerald cursor-pointer"
                />
                <p className="text-[10px] text-gov-muted mt-1">
                  SHA-256 checksum and structured naming will be computed automatically.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gov-border bg-white/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gov-muted block">
                  Hardcopy Original Status
                </span>
                <label className="flex items-center space-x-2 text-xs font-semibold text-gov-slate cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAttachedInPhysicalFile}
                    onChange={(e) => setIsAttachedInPhysicalFile(e.target.checked)}
                    className="rounded text-gov-emerald"
                  />
                  <span>Original Hardcopy Paper Safely Attached in Physical File Jacket</span>
                </label>
                <p className="text-[10px] text-gov-muted">
                  Unchecking triggers an immediate Physical Custody Out-Log check.
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setViewMode("register")}
              className="px-4 py-2 rounded-xl border border-gov-border bg-white text-xs font-bold text-gov-muted hover:text-gov-slate"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-md shadow-gov-emerald/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-gov-gold" />
              <span>{loading ? "Recording Inward Dak..." : "Record Inward Dak (Official Intake)"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Split Drawer for selected letter */}
      <LetterSplitDrawer
        letter={selectedLetter}
        isOpen={!!selectedLetter}
        onClose={() => setSelectedLetter(null)}
        onRefresh={loadRegister}
      />
    </div>
  );
}

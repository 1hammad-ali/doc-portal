"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Search, Tag, Building, Lock, QrCode, FileText, ExternalLink, Download } from "lucide-react";
import { api } from "@/lib/api";
import { GovFile, Department, FileCategory } from "@/types";
import { formatDate } from "@/lib/utils";

export default function FilesCasesProjectsPage() {
  const [files, setFiles] = useState<GovFile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New File State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FileCategory>("CASE_FILE");
  const [departmentId, setDepartmentId] = useState("");
  const [custodianName, setCustodianName] = useState("");
  const [rackLocation, setRackLocation] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);

  const loadFiles = async () => {
    try {
      const [filesRes, deptRes] = await Promise.all([
        api.getFiles(),
        api.getDepartments(),
      ]);
      if (Array.isArray(filesRes)) setFiles(filesRes);
      if (deptRes?.all) {
        setDepartments(deptRes.all);
        if (deptRes.all.length > 0) setDepartmentId(deptRes.all[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFile({
        title,
        description,
        category,
        departmentId,
        custodianName,
        rackLocation,
        isConfidential,
      });
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      loadFiles();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredFiles = files.filter((f) => {
    if (activeTab !== "ALL" && f.category !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.fileNumber.toLowerCase().includes(q) ||
        f.barcode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gov-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-gov-slate">Files, Cases & Project Dossiers</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Physical & digital file jackets, litigation case folders, and capital infrastructure projects.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-xs"
        >
          <Plus className="w-4 h-4 text-gov-gold" />
          <span>Open New File / Case</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex border border-gov-border bg-white rounded-xl p-1 text-xs font-semibold space-x-1">
          {["ALL", "MAIN_ORG_FILE", "CASE_FILE", "PROJECT_FILE", "POLICY_FILE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === cat
                  ? "bg-gov-emerald text-white shadow-xs"
                  : "text-gov-muted hover:text-gov-slate"
              }`}
            >
              {cat === "ALL" ? "All Files" : cat.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="w-72 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Title, File No, or Barcode..."
            className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gov-border bg-white text-gov-slate"
          />
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className="p-5 rounded-bento bg-white border border-gov-border shadow-gov hover:border-gov-emerald/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-emerald-soft text-gov-emerald uppercase">
                  {file.category.replace(/_/g, " ")}
                </span>
                <span className="font-mono text-xs font-bold text-gov-slate">
                  {file.fileNumber}
                </span>
              </div>

              <Link href={`/files/${file.id}`} className="block group">
                <h3 className="text-sm font-bold text-gov-slate line-clamp-2 mt-1 group-hover:text-gov-emerald transition-colors">
                  {file.title}
                </h3>
              </Link>

              {file.description && (
                <p className="text-xs text-gov-muted line-clamp-2 mt-2 leading-relaxed">
                  {file.description}
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gov-border text-xs space-y-2">
              <div className="flex items-center justify-between text-gov-muted text-[11px]">
                <span>Almirah / Rack:</span>
                <span className="font-semibold text-gov-slate">{file.rackLocation || "Unassigned"}</span>
              </div>

              <div className="flex items-center justify-between text-gov-muted text-[11px]">
                <span>Attached Letters:</span>
                <span className="font-bold text-gov-emerald">
                  {file._count?.letterLinks || 0} Letters Filed
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={`http://localhost:4000/api/v1/barcode/generate/${file.barcode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-[11px] font-semibold text-gov-muted hover:text-gov-emerald"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="font-mono">{file.barcode}</span>
                </a>

                <div className="flex items-center space-x-2">
                  <a
                    href={api.getDownloadAllFilePdfUrl(file.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gov-emerald-soft text-gov-emerald hover:bg-gov-emerald hover:text-white text-[11px] font-bold transition-all shadow-2xs"
                    title="Download complete merged dossier PDF"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download (1 PDF)</span>
                  </a>

                  <Link
                    href={`/files/${file.id}`}
                    className="flex items-center space-x-1 text-[11px] font-bold text-gov-slate hover:text-gov-emerald transition-colors"
                  >
                    <span>Open Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {file.isConfidential && (
                <span className="flex items-center space-x-1 text-[10px] font-bold text-gov-crimson px-1.5 py-0.5 rounded bg-gov-crimson-light mt-2 inline-flex">
                  <Lock className="w-3 h-3" />
                  <span>Confidential</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Open New File / Case / Project */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gov-slate/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-gov-lg border border-gov-border max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gov-slate">Open New File Jacket / Case Dossier</h3>
            <form onSubmit={handleCreateFile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gov-slate uppercase mb-1">
                  File Title / Case Heading *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Writ Petition No. 1420/2026: Land Encroachment"
                  className="w-full text-xs p-2.5 rounded-xl border border-gov-border bg-gov-canvas"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gov-slate uppercase mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FileCategory)}
                    className="w-full text-xs p-2 rounded-xl border border-gov-border bg-gov-canvas font-medium"
                  >
                    <option value="MAIN_ORG_FILE">Main Org File</option>
                    <option value="CASE_FILE">Case File (Litigation/Inquiry)</option>
                    <option value="PROJECT_FILE">Project File (Development)</option>
                    <option value="OFFICER_FILE">Personal Officer File</option>
                    <option value="POLICY_FILE">Policy & Standing Orders</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gov-slate uppercase mb-1">
                    Responsible Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-gov-border bg-gov-canvas font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gov-slate uppercase mb-1">
                    Rack / Almirah Location
                  </label>
                  <input
                    type="text"
                    value={rackLocation}
                    onChange={(e) => setRackLocation(e.target.value)}
                    placeholder="e.g. Cabinet A, Shelf 2"
                    className="w-full text-xs p-2 rounded-xl border border-gov-border bg-gov-canvas"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gov-slate uppercase mb-1">
                    Physical Custodian Clerk
                  </label>
                  <input
                    type="text"
                    value={custodianName}
                    onChange={(e) => setCustodianName(e.target.value)}
                    placeholder="e.g. Muhammad Rizwan"
                    className="w-full text-xs p-2 rounded-xl border border-gov-border bg-gov-canvas"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gov-slate uppercase mb-1">
                  Description / Synopsis
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of case proceedings or project scope..."
                  className="w-full text-xs p-2 rounded-xl border border-gov-border bg-gov-canvas"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="confidentialCheck"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded text-gov-emerald"
                />
                <label htmlFor="confidentialCheck" className="text-xs font-bold text-gov-slate">
                  Classify as Confidential / Restrict Folder Access
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gov-border text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark"
                >
                  Create File Jacket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

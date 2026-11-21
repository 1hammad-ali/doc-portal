"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  FolderKanban,
  FileText,
  Download,
  Printer,
  ArrowLeft,
  QrCode,
  Lock,
  Building,
  User,
  MapPin,
  Calendar,
  CheckSquare,
  Square,
  AlertTriangle,
  Eye,
  RefreshCw,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { GovFile, Letter } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

interface FileDossierPageProps {
  params: Promise<{ id: string }>;
}

export default function FileDossierPage({ params }: FileDossierPageProps) {
  const resolvedParams = use(params);
  const fileId = resolvedParams.id;

  const [file, setFile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [activeLetter, setActiveLetter] = useState<Letter | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [viewMode, setViewMode] = useState<"register" | "preview">("register");

  const loadDossier = async () => {
    try {
      setLoading(true);
      const res = await api.getFile(fileId);
      setFile(res);
      // Default: all letters selected for merging
      if (res?.letterLinks) {
        setSelectedLetters(res.letterLinks.map((l: any) => l.letterId));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDossier();
  }, [fileId]);

  const toggleSelectAll = () => {
    if (!file?.letterLinks) return;
    if (selectedLetters.length === file.letterLinks.length) {
      setSelectedLetters([]);
    } else {
      setSelectedLetters(file.letterLinks.map((l: any) => l.letterId));
    }
  };

  const toggleSelectLetter = (id: string) => {
    setSelectedLetters((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleMergePdfDownload = () => {
    if (selectedLetters.length === 0) {
      alert("Please select at least 1 attached letter to compile into the PDF dossier.");
      return;
    }
    const url = api.getMergePdfUrl(fileId, selectedLetters);
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3 text-gov-muted">
          <RefreshCw className="w-8 h-8 animate-spin text-gov-emerald" />
          <p className="text-sm font-semibold">Retrieving Government File Dossier...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-gov-crimson">File Jacket Not Found</h2>
        <p className="text-xs text-gov-muted">The requested physical/digital file dossier could not be located.</p>
        <Link href="/files" className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Files Explorer</span>
        </Link>
      </div>
    );
  }

  const letterLinks: any[] = file.letterLinks || [];

  return (
    <div className="space-y-6 pb-16">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/files"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gov-muted hover:text-gov-emerald transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Files & Cases</span>
        </Link>

        <div className="flex items-center space-x-2">
          <a
            href={api.getDownloadAllFilePdfUrl(fileId)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-sm transition-all"
            title="Download complete merged dossier PDF in 1 click"
          >
            <Download className="w-4 h-4 text-gov-gold" />
            <span>Download Complete File (1 PDF)</span>
          </a>

          <button
            onClick={() => setViewMode(viewMode === "register" ? "preview" : "register")}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-gov-border bg-white text-xs font-semibold text-gov-slate hover:bg-gov-canvas"
          >
            <Layers className="w-4 h-4 text-gov-emerald" />
            <span>{viewMode === "register" ? "Live PDF Preview" : "Folio Register"}</span>
          </button>
        </div>
      </div>

      {/* Official Physical File Cover Header */}
      <div className="p-6 rounded-bento bg-white border border-gov-border shadow-gov relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gov-emerald/5 rounded-bl-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gov-emerald text-white uppercase tracking-wider">
                {file.category.replace(/_/g, " ")}
              </span>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-canvas border border-gov-border text-gov-slate uppercase">
                Status: {file.status}
              </span>

              {file.isConfidential && (
                <span className="flex items-center space-x-1 text-[10px] font-bold text-gov-crimson px-2 py-0.5 rounded bg-gov-crimson-light border border-gov-crimson/20">
                  <Lock className="w-3 h-3" />
                  <span>Classified Dossier</span>
                </span>
              )}
            </div>

            <div>
              <span className="font-mono text-xs font-bold text-gov-gold bg-gov-slate/5 px-2 py-1 rounded inline-block">
                {file.fileNumber}
              </span>
              <h1 className="text-xl font-bold text-gov-slate mt-1">{file.title}</h1>
              {file.description && (
                <p className="text-xs text-gov-muted mt-1 leading-relaxed max-w-3xl">
                  {file.description}
                </p>
              )}
            </div>

            {/* Metadata badges grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="flex items-center space-x-2 text-gov-muted">
                <Building className="w-4 h-4 text-gov-emerald shrink-0" />
                <div className="truncate">
                  <span className="block text-[10px] uppercase font-bold text-gov-muted">Department</span>
                  <span className="font-semibold text-gov-slate">{file.department?.shortName || file.department?.name}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-gov-muted">
                <User className="w-4 h-4 text-gov-emerald shrink-0" />
                <div className="truncate">
                  <span className="block text-[10px] uppercase font-bold text-gov-muted">Custodian</span>
                  <span className="font-semibold text-gov-slate">{file.custodianName || "Central Registry"}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-gov-muted">
                <MapPin className="w-4 h-4 text-gov-emerald shrink-0" />
                <div className="truncate">
                  <span className="block text-[10px] uppercase font-bold text-gov-muted">Almirah / Rack</span>
                  <span className="font-semibold text-gov-slate">{file.rackLocation || "Unassigned"}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-gov-muted">
                <Calendar className="w-4 h-4 text-gov-emerald shrink-0" />
                <div className="truncate">
                  <span className="block text-[10px] uppercase font-bold text-gov-muted">Opened Date</span>
                  <span className="font-semibold text-gov-slate">{formatDate(file.openedDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode Sticker Preview */}
          <div className="p-3 rounded-xl border border-gov-border bg-gov-canvas/60 text-center space-y-2 shrink-0">
            <span className="text-[10px] font-bold uppercase text-gov-muted block tracking-wider">
              Scannable Barcode
            </span>
            <div className="bg-white p-2 rounded-lg border border-gov-border inline-block shadow-2xs">
              <img
                src={`http://localhost:4000/api/v1/barcode/generate/${file.barcode}`}
                alt={file.barcode}
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="font-mono text-[10px] font-bold text-gov-slate">{file.barcode}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Folio Register or Live PDF Preview */}
      {viewMode === "preview" ? (
        <div className="p-6 rounded-bento bg-white border border-gov-border shadow-gov space-y-4">
          <div className="flex items-center justify-between border-b border-gov-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-gov-slate">Live Dossier PDF Compilation Book</h2>
              <p className="text-xs text-gov-muted">
                Assembled dynamic PDF with official government cover index, table of contents, and folio separators.
              </p>
            </div>
            <a
              href={api.getMergePdfUrl(fileId, selectedLetters)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gov-emerald text-white text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5 text-gov-gold" />
              <span>Open in New Tab</span>
            </a>
          </div>

          <div className="w-full h-[750px] rounded-xl overflow-hidden border border-gov-border bg-gov-canvas">
            <iframe
              src={api.getMergePdfUrl(fileId, selectedLetters)}
              className="w-full h-full border-none"
              title="Compiled Dossier PDF Preview"
            />
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-bento bg-white border border-gov-border shadow-gov space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gov-border pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-gov-slate">
                  Table of Contents & Folio Register
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gov-emerald-soft text-gov-emerald">
                  {letterLinks.length} Documents Attached
                </span>
              </div>
              <p className="text-xs text-gov-muted mt-0.5">
                Official chronological page register of letters, court notices, and orders indexed in this physical file jacket.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <button
                onClick={toggleSelectAll}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gov-border bg-gov-canvas hover:bg-gov-border/50 text-gov-slate font-semibold"
              >
                {selectedLetters.length === letterLinks.length ? (
                  <CheckSquare className="w-4 h-4 text-gov-emerald" />
                ) : (
                  <Square className="w-4 h-4 text-gov-muted" />
                )}
                <span>Select All ({letterLinks.length})</span>
              </button>
            </div>
          </div>

          {/* Table of Contents Register Table */}
          {letterLinks.length === 0 ? (
            <div className="py-12 text-center text-gov-muted space-y-2">
              <FileText className="w-8 h-8 mx-auto text-gov-border" />
              <p className="text-xs font-semibold">No correspondence has been linked to this file jacket yet.</p>
              <p className="text-[11px]">Attach letters via Inward Dak Intake or the Document Drawer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gov-border text-gov-muted font-bold tracking-wider uppercase text-[10px] bg-gov-canvas/40">
                    <th className="py-2.5 px-3 w-10 text-center">Select</th>
                    <th className="py-2.5 px-3">Folio No</th>
                    <th className="py-2.5 px-3">Diary No</th>
                    <th className="py-2.5 px-3">Type & Priority</th>
                    <th className="py-2.5 px-3">Subject & Context</th>
                    <th className="py-2.5 px-3">Issuing Authority</th>
                    <th className="py-2.5 px-3">Letter Date</th>
                    <th className="py-2.5 px-3">Physical Custody</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gov-border">
                  {letterLinks.map((link) => {
                    const letter: Letter = link.letter;
                    const isSelected = selectedLetters.includes(letter.id);

                    return (
                      <tr
                        key={link.id}
                        onClick={() => {
                          setActiveLetter(letter);
                          setIsDrawerOpen(true);
                        }}
                        className={`hover:bg-gov-emerald-soft/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-gov-emerald-soft/20" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectLetter(letter.id);
                            }}
                            className="text-gov-emerald hover:opacity-80 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-gov-emerald" />
                            ) : (
                              <Square className="w-4 h-4 text-gov-border" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-gov-emerald px-2 py-0.5 rounded bg-gov-emerald-soft">
                            {link.folioNumber || "Folio —"}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-gov-slate">
                          {letter.diaryNumber}
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-gov-slate block">
                              {letter.letterType?.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded inline-block ${
                                letter.priority === "MOST_IMMEDIATE" || letter.priority === "IMMEDIATE"
                                  ? "bg-gov-crimson-light text-gov-crimson"
                                  : "bg-gov-slate/5 text-gov-muted"
                              }`}
                            >
                              {letter.priority}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <p className="font-semibold text-gov-slate line-clamp-1">{letter.subject}</p>
                          <p className="text-[11px] text-gov-muted line-clamp-1">{letter.briefReason}</p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-gov-slate">{letter.senderOrganization}</p>
                          <p className="text-[10px] text-gov-muted">{letter.senderName}</p>
                        </td>

                        <td className="py-3 px-3 text-gov-muted whitespace-nowrap">
                          {formatDate(letter.letterDate)}
                        </td>

                        <td className="py-3 px-3">
                          {letter.isAttachedInPhysicalFile ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-gov-emerald">
                              <span>✓ In File</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-gov-crimson">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{letter.physicalHolderName || "Issued Out"}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setActiveLetter(letter);
                              setIsDrawerOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-gov-emerald hover:bg-gov-emerald-soft transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Split-View Letter Inspection Drawer */}
      <LetterSplitDrawer
        letter={activeLetter}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveLetter(null);
        }}
        onRefresh={loadDossier}
      />
    </div>
  );
}

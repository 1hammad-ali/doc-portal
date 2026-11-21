"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sparkles,
  FileText,
  Filter,
  Calendar,
  Building,
  Tag,
  ArrowRight,
  Eye,
  RefreshCw,
  Clock,
  Layers,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { Letter } from "@/types";
import { formatDate } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") || "");
  const [letterType, setLetterType] = useState(searchParams.get("letterType") || "");
  const [priority, setPriority] = useState(searchParams.get("priority") || "");

  const [departments, setDepartments] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [conceptTokens, setConceptTokens] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [activeLetter, setActiveLetter] = useState<Letter | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    api.getDepartments().then((res) => {
      setDepartments(res?.all || res?.departments || []);
    });
  }, []);

  const performSearch = async (searchTerm = query) => {
    try {
      setLoading(true);
      const res = await api.searchLetters({
        q: searchTerm,
        year: year || undefined,
        departmentId: departmentId || undefined,
        letterType: letterType || undefined,
        priority: priority || undefined,
      });

      setResults(res.results || []);
      setConceptTokens(res.conceptTokens || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    } else {
      performSearch("");
    }
  }, [initialQuery, year, departmentId, letterType, priority]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    performSearch(query.trim());
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Search Header Banner */}
      <div className="p-6 rounded-bento bg-white border border-gov-border shadow-gov space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-gov-gold" />
            <h1 className="text-xl font-bold text-gov-slate">
              Intelligent Story & Archival Search Engine
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gov-emerald text-white">
              Semantic OCR + Trigram
            </span>
          </div>
          <p className="text-xs text-gov-muted mt-1">
            Search 10+ years of ministerial archives by narrative context, story phrases (e.g. &quot;letter jo roads k liye aya tha&quot; or &quot;solar streetlight tender dispute&quot;), or OCR content.
          </p>
        </div>

        {/* Query Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gov-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what you are looking for (e.g. 'solar lighting inquiry parawise comments' or 'roads budget')..."
              className="w-full text-xs pl-10 pr-4 py-3 rounded-xl border border-gov-border bg-gov-canvas/60 text-gov-slate focus:bg-white focus:outline-none focus:ring-2 focus:ring-gov-emerald/30 focus:border-gov-emerald transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-sm shrink-0"
          >
            Search Archive
          </button>
        </form>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gov-border text-xs">
          <span className="text-[11px] font-bold text-gov-muted flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </span>

          {/* Year Filter */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="p-1.5 rounded-lg border border-gov-border bg-white text-xs text-gov-slate"
          >
            <option value="">All Years (2016-2026)</option>
            {Array.from({ length: 11 }, (_, i) => 2026 - i).map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="p-1.5 rounded-lg border border-gov-border bg-white text-xs text-gov-slate"
          >
            <option value="">All Departments & Wings</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Letter Type */}
          <select
            value={letterType}
            onChange={(e) => setLetterType(e.target.value)}
            className="p-1.5 rounded-lg border border-gov-border bg-white text-xs text-gov-slate"
          >
            <option value="">All Correspondence Types</option>
            <option value="ACTION_REQUIRED">ACTION_REQUIRED</option>
            <option value="LEGAL_COURT_NOTICE">LEGAL_COURT_NOTICE</option>
            <option value="DIRECTIVE_ORDER">DIRECTIVE_ORDER</option>
            <option value="FINANCIAL_AUDIT">FINANCIAL_AUDIT</option>
            <option value="NOTIFICATION_SRO">NOTIFICATION_SRO</option>
            <option value="CC_INFORMATION_ONLY">CC_INFORMATION_ONLY</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="p-1.5 rounded-lg border border-gov-border bg-white text-xs text-gov-slate"
          >
            <option value="">All Priorities</option>
            <option value="MOST_IMMEDIATE">MOST_IMMEDIATE</option>
            <option value="IMMEDIATE">IMMEDIATE</option>
            <option value="URGENT">URGENT</option>
            <option value="ROUTINE">ROUTINE</option>
          </select>

          {(year || departmentId || letterType || priority) && (
            <button
              onClick={() => {
                setYear("");
                setDepartmentId("");
                setLetterType("");
                setPriority("");
              }}
              className="text-[11px] font-bold text-gov-crimson hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Query Breakdown & Results Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gov-muted px-1">
        <div>
          <span>Found </span>
          <strong className="text-gov-slate">{total}</strong>
          <span> archived record{total !== 1 ? "s" : ""}</span>
          {conceptTokens.length > 0 && (
            <span> matching concepts: </span>
          )}
          {conceptTokens.map((tok) => (
            <span
              key={tok}
              className="inline-block px-2 py-0.5 rounded-md bg-gov-emerald-soft text-gov-emerald font-bold font-mono text-[11px] mr-1"
            >
              #{tok}
            </span>
          ))}
        </div>
      </div>

      {/* Search Results List */}
      {loading ? (
        <div className="p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gov-emerald mx-auto" />
          <p className="text-xs font-semibold text-gov-muted">Scanning ministerial OCR vaults & archives...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="p-12 text-center rounded-bento bg-white border border-gov-border shadow-gov space-y-3">
          <FileText className="w-8 h-8 text-gov-muted mx-auto" />
          <h3 className="text-sm font-bold text-gov-slate">No matching historical records found</h3>
          <p className="text-xs text-gov-muted max-w-md mx-auto">
            Try adjusting your search keywords, broadening the date range, or querying by issuing department.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((letter) => {
            const meta = letter.searchMeta || {};
            const linkedFiles: any[] = letter.fileLinks || [];

            return (
              <div
                key={letter.id}
                className="p-5 rounded-bento bg-white border border-gov-border shadow-gov hover:border-gov-emerald/40 transition-all space-y-3"
              >
                {/* Result Card Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-gov-emerald bg-gov-emerald-soft px-2 py-0.5 rounded">
                      {letter.diaryNumber}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-canvas border border-gov-border text-gov-slate">
                      {letter.letterType?.replace(/_/g, " ")}
                    </span>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        letter.priority === "MOST_IMMEDIATE" || letter.priority === "IMMEDIATE"
                          ? "bg-gov-crimson-light text-gov-crimson"
                          : "bg-gov-slate/5 text-gov-muted"
                      }`}
                    >
                      {letter.priority}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-gov-muted">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(letter.letterDate)}</span>
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-gold/15 text-gov-gold border border-gov-gold/30">
                      Relevance Score: {meta.relevanceScore || 1}
                    </span>
                  </div>
                </div>

                {/* Subject & Authority */}
                <div>
                  <h3 className="text-sm font-bold text-gov-slate">{letter.subject}</h3>
                  <p className="text-xs text-gov-muted mt-0.5">
                    From: <strong className="text-gov-slate">{letter.senderName}</strong> ({letter.senderOrganization}) → Addressed To:{" "}
                    <strong className="text-gov-slate">{letter.addressedToName}</strong> ({letter.addressedToPost})
                  </p>
                </div>

                {/* Contextual Snippet with reason/OCR match */}
                {meta.snippet && (
                  <div className="p-3 rounded-xl bg-gov-canvas/60 border border-gov-border/80 text-xs text-gov-slate space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gov-emerald">
                        Matched in: {meta.matchField === "ocrExtractedText" ? "📄 Full Document OCR Text" : "📝 Government Summary Note"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed italic text-gov-slate/90">
                      &quot;{meta.snippet}&quot;
                    </p>
                  </div>
                )}

                {/* Linked Dossiers & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gov-border text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gov-muted uppercase">Attached In:</span>
                    {linkedFiles.length === 0 ? (
                      <span className="text-[11px] text-gov-muted italic">Unfiled Inward Letter</span>
                    ) : (
                      linkedFiles.map((link) => (
                        <Link
                          key={link.file?.id || link.fileId}
                          href={`/files/${link.file?.id || link.fileId}`}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-gov-emerald-soft text-gov-emerald font-semibold text-[10px] hover:underline"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{link.file?.fileNumber || "File Dossier"}</span>
                          {link.folioNumber && (
                            <span className="text-gov-muted">({link.folioNumber})</span>
                          )}
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setActiveLetter(letter);
                        setIsDrawerOpen(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-gov-gold" />
                      <span>Inspect Letter</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Split-View Letter Drawer */}
      <LetterSplitDrawer
        letter={activeLetter}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveLetter(null);
        }}
        onRefresh={() => performSearch()}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-gov-muted">Loading search engine...</div>}>
      <SearchContent />
    </Suspense>
  );
}

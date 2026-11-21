"use client";

import { useState, useEffect } from "react";
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  FileText,
  ArrowRight,
  Filter,
  RefreshCw,
  Building,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { Letter } from "@/types";
import { formatDate, formatDateTime, isPastDate } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

export default function CustodyAlertsPage() {
  const [overdueLetters, setOverdueLetters] = useState<Letter[]>([]);
  const [custodyLogs, setCustodyLogs] = useState<any[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overdueRes, registerRes] = await Promise.all([
        api.getOverdueCustody(),
        api.getCustodyRegister({
          status: statusFilter === "ALL" ? "" : statusFilter,
        }),
      ]);
      if (Array.isArray(overdueRes)) setOverdueLetters(overdueRes);
      if (registerRes?.logs) {
        setCustodyLogs(registerRes.logs);
        setTotalLogs(registerRes.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleReturn = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.checkinPhysical(id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gov-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gov-slate">Physical Paper Custody & Out-Register</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gov-crimson text-white">
              Sovereign Hardcopy Audit
            </span>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Real-time tracking of original paper documents removed from physical file jackets, recipient officer designations, and overdue return alarms.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {overdueLetters.length > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gov-crimson text-white shadow-xs animate-gov-pulse flex items-center space-x-1.5">
              <AlertOctagon className="w-4 h-4" />
              <span>{overdueLetters.length} OVERDUE ORIGINALS</span>
            </span>
          )}
        </div>
      </div>

      {/* Overdue Urgent Action Cards */}
      {overdueLetters.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-gov-crimson" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gov-crimson">
              Critical Red Overdue Alerts (Requires Immediate Retrieval)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overdueLetters.map((l) => (
              <div
                key={l.id}
                onClick={() => setSelectedLetter(l)}
                className="p-5 rounded-bento bg-white border border-gov-crimson/50 shadow-gov hover:shadow-gov-md cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-gov-crimson bg-gov-crimson-light px-2 py-0.5 rounded">
                      {l.diaryNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-crimson text-white">
                      OVERDUE RETURN
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gov-slate line-clamp-2">
                    {l.subject}
                  </h3>

                  <div className="p-3 rounded-xl bg-gov-crimson-light/40 border border-gov-crimson/20 mt-3 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gov-muted font-medium">Currently Held By:</span>
                      <strong className="text-gov-slate text-right">{l.physicalHolderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gov-muted font-medium">Expected Return Due Date:</span>
                      <strong className="text-gov-crimson">{formatDateTime(l.physicalDueReturnDate)}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gov-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gov-muted truncate max-w-[200px]">
                    {l.fileLinks?.[0]?.file?.fileNumber || "Primary File"}
                  </span>

                  <button
                    onClick={(e) => handleReturn(l.id, e)}
                    className="px-3.5 py-1.5 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark transition-all shadow-xs"
                  >
                    Confirm Physical Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Physical File Movement Out-Register Table */}
      <div className="p-6 rounded-bento bg-white border border-gov-border shadow-gov space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gov-border pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-gov-slate">Physical File Movement Out-Register</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gov-canvas text-gov-muted border border-gov-border">
                {totalLogs} Ledger Entries
              </span>
            </div>
            <p className="text-xs text-gov-muted mt-0.5">
              Comprehensive log recording every physical hardcopy removal, recipient officer designation, and return timestamp.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 border border-gov-border bg-gov-canvas p-1 rounded-xl text-xs font-semibold">
            {[
              { id: "ALL", label: "All Movements" },
              { id: "OVERDUE", label: "Overdue" },
              { id: "OUT", label: "Currently Out" },
              { id: "RETURNED", label: "Returned to File" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? "bg-gov-emerald text-white shadow-2xs font-bold"
                    : "text-gov-muted hover:text-gov-slate"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="py-12 text-center text-gov-muted space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-gov-emerald mx-auto" />
            <p className="text-xs font-semibold">Loading physical movement register...</p>
          </div>
        ) : custodyLogs.length === 0 ? (
          <div className="py-12 text-center text-gov-muted space-y-2">
            <CheckCircle2 className="w-8 h-8 text-gov-emerald mx-auto" />
            <h4 className="text-sm font-bold text-gov-slate">All physical original copies are safely filed</h4>
            <p className="text-xs text-gov-muted">No checked-out hardcopy records match the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gov-border text-gov-muted font-bold tracking-wider uppercase text-[10px] bg-gov-canvas/40">
                  <th className="py-3 px-3">Out Date & Time</th>
                  <th className="py-3 px-3">Document / Diary No</th>
                  <th className="py-3 px-3">Taken By (Name & Designation)</th>
                  <th className="py-3 px-3">Purpose & Justification</th>
                  <th className="py-3 px-3">Expected Return</th>
                  <th className="py-3 px-3">Return Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border">
                {custodyLogs.map((log) => {
                  const letter = log.letter;
                  const isOverdue = log.movementStatus === "OVERDUE";
                  const isOut = log.movementStatus === "OUT_TO_OFFICER";
                  const isReturned = log.movementStatus === "RETURNED_IN_FILE";

                  return (
                    <tr key={log.id} className="hover:bg-gov-canvas/60 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-gov-slate">
                          {formatDateTime(log.checkedOutAt)}
                        </span>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <span className="font-mono font-bold text-gov-emerald block">
                          {letter?.diaryNumber || "DAK-RECORD"}
                        </span>
                        <p className="font-semibold text-gov-slate line-clamp-1">{letter?.subject}</p>
                        {letter?.fileLinks?.[0]?.file && (
                          <span className="text-[10px] text-gov-muted font-mono">
                            {letter.fileLinks[0].file.fileNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gov-slate">{log.officerName}</p>
                        <p className="text-[11px] text-gov-emerald font-semibold">
                          {log.officerDesignation}
                        </p>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <p className="text-gov-slate line-clamp-2">&quot;{log.purpose}&quot;</p>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            isOverdue ? "text-gov-crimson font-bold" : "text-gov-slate"
                          }`}
                        >
                          {formatDateTime(log.expectedReturnAt)}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {isReturned ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gov-emerald-soft text-gov-emerald">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Returned {formatDate(log.returnedAt)}</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gov-crimson-light text-gov-crimson animate-gov-pulse">
                            <AlertOctagon className="w-3 h-3" />
                            <span>OVERDUE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gov-amber-light text-gov-amber">
                            <Clock className="w-3 h-3" />
                            <span>Out with Officer</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {!log.returnedAt && letter && (
                          <button
                            onClick={(e) => handleReturn(letter.id, e)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gov-emerald text-white hover:bg-gov-emerald-dark shadow-2xs"
                          >
                            Check-In
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Drawer */}
      <LetterSplitDrawer
        letter={selectedLetter}
        isOpen={Boolean(selectedLetter)}
        onClose={() => setSelectedLetter(null)}
        onRefresh={loadData}
      />
    </div>
  );
}

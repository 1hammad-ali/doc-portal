"use client";

import { useState, useEffect } from "react";
import { Send, FileText, CheckCircle2, ChevronRight, Printer, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Letter } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

export default function OutwardDispatchPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchOutwardLetters = async () => {
      try {
        const res = await api.getLetters({ direction: "OUTWARD" });
        if (res?.letters) setLetters(res.letters);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOutwardLetters();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gov-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-gov-slate">Outward Dispatch Register</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Official communications dispatched from this Secretariat node with dispatch barcodes & carrier receipts.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/dak-inward")}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gov-emerald text-white text-xs font-bold hover:bg-gov-emerald-dark shadow-xs"
        >
          <Send className="w-4 h-4 text-gov-gold" />
          <span>New Outward Dispatch</span>
        </button>
      </div>

      <div className="bg-white p-6 rounded-bento border border-gov-border shadow-gov space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate">
            Dispatched Correspondence Ledger
          </h3>
          <div className="w-72 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gov-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Diary, Recipient, or Subject..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-gov-border bg-gov-canvas text-gov-slate"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gov-border text-gov-muted uppercase text-[10px] tracking-wider font-bold">
                <th className="pb-3">Dispatch Diary No</th>
                <th className="pb-3">Subject / Document</th>
                <th className="pb-3">Addressee Authority</th>
                <th className="pb-3">Dispatch Date</th>
                <th className="pb-3">Priority</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border/60">
              {letters.length > 0 ? (
                letters.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLetter(l)}
                    className="hover:bg-gov-canvas/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono font-bold text-gov-emerald">{l.diaryNumber}</td>
                    <td className="py-3 font-medium text-gov-slate max-w-sm truncate">{l.subject}</td>
                    <td className="py-3 text-gov-muted">{l.addressedToName} ({l.addressedToPost})</td>
                    <td className="py-3 text-gov-muted">{formatDate(l.receivedOrSentDate)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-emerald-soft text-gov-emerald">
                        {l.priority}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] font-semibold text-gov-emerald hover:underline">
                        View Dossier
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gov-muted">
                    No outward dispatches logged today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LetterSplitDrawer
        letter={selectedLetter}
        isOpen={!!selectedLetter}
        onClose={() => setSelectedLetter(null)}
      />
    </div>
  );
}

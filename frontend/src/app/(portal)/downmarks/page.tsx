"use client";

import { useState, useEffect } from "react";
import { GitBranch, Clock, User, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Letter } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

export default function DownmarksPage() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  const loadDownmarked = async () => {
    try {
      const res = await api.getLetters({ letterType: "DIRECTIVE_ORDER" });
      if (res?.letters) setLetters(res.letters);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDownmarked();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gov-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-gov-slate">Down-Marked Executive Tasks</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Correspondence routed down the hierarchy from Prime Minister, Federal Secretaries, and Directors with SLAs.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-gov-emerald text-white">
          ACTIVE DELEGATIONS
        </span>
      </div>

      <div className="bg-white p-6 rounded-bento border border-gov-border shadow-gov space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gov-border text-gov-muted uppercase text-[10px] tracking-wider font-bold">
                <th className="pb-3">Diary No</th>
                <th className="pb-3">Subject / Directive</th>
                <th className="pb-3">From Authority</th>
                <th className="pb-3">Latest Instruction</th>
                <th className="pb-3">Action SLA</th>
                <th className="pb-3 text-right">Action</th>
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
                    <td className="py-3 font-medium text-gov-slate max-w-xs truncate">{l.subject}</td>
                    <td className="py-3 text-gov-muted">{l.senderName}</td>
                    <td className="py-3 text-gov-slate italic max-w-xs truncate">
                      {l.downmarkings?.[0]?.instructions || "Under examination"}
                    </td>
                    <td className="py-3 font-semibold text-gov-crimson">
                      {l.dueDate ? formatDateTime(l.dueDate) : "24h Standard"}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] font-semibold text-gov-emerald hover:underline">
                        Process & Respond
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gov-muted">
                    No pending down-marked directives.
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
        onRefresh={loadDownmarked}
      />
    </div>
  );
}

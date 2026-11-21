"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search, Download, ExternalLink, Calendar, Building } from "lucide-react";
import { api } from "@/lib/api";
import { Letter } from "@/types";
import { formatDate } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  useEffect(() => {
    const fetchSROs = async () => {
      try {
        const res = await api.getLetters({ letterType: "NOTIFICATION_SRO" });
        if (res?.letters) setNotifications(res.letters);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSROs();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gov-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-gov-slate">Gazettes, Circulars & SRO Repository</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Central repository of official Gazette notifications, statutory regulatory orders, and standing policy rules.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-gov-emerald text-white">
          NATIONAL GAZETTE INDEX
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => setSelectedLetter(n)}
              className="p-5 rounded-bento bg-white border border-gov-border shadow-gov hover:border-gov-emerald/40 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                    SRO / CIRCULAR
                  </span>
                  <span className="font-mono text-xs text-gov-muted">{n.diaryNumber}</span>
                </div>
                <h3 className="text-sm font-bold text-gov-slate line-clamp-2 mt-1">{n.subject}</h3>
                <p className="text-xs text-gov-muted line-clamp-2 mt-2 leading-relaxed">{n.briefReason}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-gov-border text-xs flex justify-between items-center text-gov-muted">
                <span>Issued: {formatDate(n.letterDate)}</span>
                <span className="text-gov-emerald font-semibold flex items-center space-x-1">
                  <span>View Gazette</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-16 bg-white rounded-bento border border-gov-border text-xs text-gov-muted">
            No official notifications logged in this section.
          </div>
        )}
      </div>

      <LetterSplitDrawer
        letter={selectedLetter}
        isOpen={!!selectedLetter}
        onClose={() => setSelectedLetter(null)}
      />
    </div>
  );
}

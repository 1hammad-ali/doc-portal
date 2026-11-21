"use client";

import { Clock, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export function RightTimelineRail() {
  const timelineEvents = [
    {
      id: "1",
      type: "ALERT_OVERDUE",
      title: "Physical Original Overdue",
      description: "WP-1420/2026 court notice held by Engr. Salman Farooq (Project Director) due back Nov 19.",
      timestamp: "Overdue by 38 hours",
      urgent: true,
    },
    {
      id: "2",
      type: "DOWNMARK",
      title: "PM Directive Down-Marked",
      description: "Federal Secretary Dr. Ayesha Noor marked DAK-001001 to Project Director with 48h SLA.",
      timestamp: "Today, 10:15 AM",
    },
    {
      id: "3",
      type: "INTAKE",
      title: "Inward Dak Registered",
      description: "New Legal Court Notice received and linked to Case File #042 & Master File #001.",
      timestamp: "Today, 09:30 AM",
    },
    {
      id: "4",
      type: "AUDIT",
      title: "Forensic Access Logged",
      description: "Super Admin inspected cross-department access matrix for LG&CDD PMU.",
      timestamp: "Yesterday, 04:12 PM",
    },
  ];

  return (
    <aside className="w-72 bg-white border-l border-gov-border h-screen flex flex-col shrink-0">
      <div className="p-4 border-b border-gov-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gov-emerald" />
          <span className="text-xs font-bold text-gov-slate uppercase tracking-wider">
            Live Action Rail
          </span>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {timelineEvents.map((evt) => (
          <div
            key={evt.id}
            className={`p-3 rounded-xl border transition-all ${
              evt.urgent
                ? "bg-gov-crimson-light/40 border-gov-crimson/30 hover:border-gov-crimson"
                : "bg-gov-canvas/60 border-gov-border hover:border-gov-emerald/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  evt.urgent
                    ? "bg-gov-crimson text-white"
                    : "bg-gov-emerald-soft text-gov-emerald"
                }`}
              >
                {evt.type}
              </span>
              <span className="text-[10px] text-gov-muted">{evt.timestamp}</span>
            </div>
            <h4
              className={`text-xs font-bold mt-1.5 ${
                evt.urgent ? "text-gov-crimson" : "text-gov-slate"
              }`}
            >
              {evt.title}
            </h4>
            <p className="text-[11px] text-gov-muted mt-1 leading-relaxed">
              {evt.description}
            </p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gov-border bg-gov-canvas/30 text-center">
        <button className="text-[11px] font-semibold text-gov-emerald hover:underline flex items-center justify-center space-x-1 w-full">
          <span>View Comprehensive Timeline</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
}

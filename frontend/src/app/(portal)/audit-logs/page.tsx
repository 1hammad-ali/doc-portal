"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Download, Filter, Search, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { AuditLog } from "@/types";
import { formatDateTime } from "@/lib/utils";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.getAuditLogs({ limit: "50" });
        if (res?.logs) {
          setLogs(res.logs);
          setTotal(res.total);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gov-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-gov-slate">Forensic Audit & Compliance Ledger</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Immutable system record of every document view, download, down-mark, hardcopy checkout, and admin deletion.
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-gov-slate text-white">
          {total} IMMUTABLE LOGS
        </span>
      </div>

      <div className="bg-white p-6 rounded-bento border border-gov-border shadow-gov space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gov-border text-gov-muted uppercase text-[10px] tracking-wider font-bold">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Officer / User</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Entity Type</th>
                <th className="pb-3">IP Address</th>
                <th className="pb-3">Details / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gov-canvas/60">
                  <td className="py-3 font-mono text-gov-muted">{formatDateTime(log.createdAt)}</td>
                  <td className="py-3">
                    <span className="font-bold text-gov-slate">{log.user?.fullName || "System Engine"}</span>
                    <span className="block text-[10px] text-gov-muted">{log.user?.designation}</span>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-emerald-soft text-gov-emerald">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-gov-slate">{log.entityType}</td>
                  <td className="py-3 font-mono text-gov-muted">{log.ipAddress || "127.0.0.1"}</td>
                  <td className="py-3 text-gov-slate max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "Standard operation"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

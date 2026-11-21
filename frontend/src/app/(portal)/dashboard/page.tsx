"use client";

import { useEffect, useState } from "react";
import {
  Inbox,
  Send,
  AlertTriangle,
  FolderKanban,
  GitBranch,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  FileCheck2,
  ChevronRight,
  Calendar,
  AlertOctagon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import { Letter, DashboardKPIs } from "@/types";
import { formatDate, formatDateTime, isPastDate } from "@/lib/utils";
import { LetterSplitDrawer } from "@/components/letters/LetterSplitDrawer";

const TYPE_COLORS: Record<string, string> = {
  ACTION_REQUIRED: "#0B4F32",
  DIRECTIVE_ORDER: "#C59B27",
  CC_INFORMATION_ONLY: "#5A6B64",
  NOTIFICATION_SRO: "#0D6EFD",
  LEGAL_COURT_NOTICE: "#B42318",
  FINANCIAL_AUDIT: "#6F42C1",
};

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalInwardToday: 18,
    totalOutwardToday: 6,
    pendingDownmarkedCount: 7,
    urgentDownmarkedCount: 3,
    checkedOutPhysicalCount: 2,
    overdueCustodyCount: 1,
    activeCasesAndProjectsCount: 14,
    slaComplianceRate: 94.2,
  });

  const [weeklyData, setWeeklyData] = useState([
    { day: "Mon", inward: 14, processed: 12 },
    { day: "Tue", inward: 22, processed: 19 },
    { day: "Wed", inward: 18, processed: 16 },
    { day: "Thu", inward: 25, processed: 23 },
    { day: "Fri", inward: 30, processed: 28 },
    { day: "Sat", inward: 8, processed: 8 },
  ]);

  const [breakdownData, setBreakdownData] = useState([
    { name: "Action Required", value: 42, color: "#0B4F32" },
    { name: "Directives", value: 16, color: "#C59B27" },
    { name: "Legal / Court", value: 8, color: "#B42318" },
    { name: "CC / Info Only", value: 24, color: "#5A6B64" },
    { name: "Notifications / SRO", value: 12, color: "#0D6EFD" },
  ]);

  const [recentLetters, setRecentLetters] = useState<Letter[]>([]);
  const [overdueLetters, setOverdueLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [chartPeriod, setChartPeriod] = useState<"week" | "month">("week");

  const loadData = async () => {
    try {
      const [kpiRes, letterRes, overdueRes] = await Promise.all([
        api.getDashboardKPIs().catch(() => null),
        api.getLetters({ limit: "5" }).catch(() => null),
        api.getOverdueCustody().catch(() => null),
      ]);

      if (kpiRes) setKpis(kpiRes);
      if (letterRes?.letters) setRecentLetters(letterRes.letters);
      if (overdueRes && Array.isArray(overdueRes)) setOverdueLetters(overdueRes);
    } catch {
      // Fallback state preserves high UX
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Prime Minister & Cabinet Executive Alert Bar (Conditional Overdue Banner) */}
      {kpis.overdueCustodyCount > 0 && (
        <div className="rounded-2xl bg-gov-crimson-light border border-gov-crimson/30 p-4 flex items-center justify-between text-gov-crimson shadow-xs animate-gov-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gov-crimson text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Physical Hardcopy Custody Red Alert ({kpis.overdueCustodyCount} Document Overdue)
              </h4>
              <p className="text-xs text-gov-crimson/90 mt-0.5">
                Physical original documents have been checked out past their scheduled return date. Central Documentation Controller must initiate immediate retrieval.
              </p>
            </div>
          </div>
          <button
            onClick={() => (window.location.href = "/custody-alerts")}
            className="px-3 py-1.5 rounded-xl bg-gov-crimson text-white text-xs font-bold hover:bg-gov-crimson/90 shrink-0"
          >
            Review Watchlist
          </button>
        </div>
      )}

      {/* Top Bento KPI Grid (4 Rounded Cards, 16px radius, Sovereign Emerald / Gold accents) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Highlighted Executive Card (Total Dak Today) */}
        <div className="p-5 rounded-bento bg-gov-gold-light border border-gov-gold/40 shadow-gov flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-slate uppercase tracking-wider">
              Total Dak Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-gov-gold/20 flex items-center justify-center text-gov-gold">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-gov-slate">
              {kpis.totalInwardToday + kpis.totalOutwardToday}
            </span>
            <span className="text-xs text-gov-muted ml-2 font-medium">Receipts & Dispatches</span>
          </div>
          <div className="flex items-center space-x-3 text-xs pt-2 border-t border-gov-gold/30">
            <span className="font-semibold text-gov-emerald">Inward: {kpis.totalInwardToday}</span>
            <span className="text-gov-muted">•</span>
            <span className="font-semibold text-gov-slate">Outward: {kpis.totalOutwardToday}</span>
          </div>
        </div>

        {/* Card 2: Pending Down-Marked Tasks */}
        <div className="p-5 rounded-bento bg-white border border-gov-border shadow-gov flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-slate uppercase tracking-wider">
              Pending Down-Marked
            </span>
            <div className="w-8 h-8 rounded-xl bg-gov-emerald-soft flex items-center justify-center text-gov-emerald">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-gov-slate">
              {kpis.pendingDownmarkedCount}
            </span>
            <span className="text-xs text-gov-muted ml-2 font-medium">Under Action</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gov-crimson font-semibold pt-2 border-t border-gov-border">
            <Clock className="w-3.5 h-3.5" />
            <span>{kpis.urgentDownmarkedCount} Immediate Priority (SLA &lt; 24h)</span>
          </div>
        </div>

        {/* Card 3: Physical Originals Checked Out */}
        <div className={`p-5 rounded-bento border shadow-gov flex flex-col justify-between ${
          kpis.overdueCustodyCount > 0
            ? "bg-gov-crimson-light/40 border-gov-crimson/40"
            : "bg-white border-gov-border"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-slate uppercase tracking-wider">
              Physical Originals Out
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              kpis.overdueCustodyCount > 0
                ? "bg-gov-crimson text-white"
                : "bg-gov-amber-light text-gov-amber"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className={`text-3xl font-extrabold ${kpis.overdueCustodyCount > 0 ? "text-gov-crimson" : "text-gov-slate"}`}>
              {kpis.checkedOutPhysicalCount}
            </span>
            <span className="text-xs text-gov-muted ml-2 font-medium">Removed from Jacket</span>
          </div>
          <div className="text-xs pt-2 border-t border-gov-border">
            {kpis.overdueCustodyCount > 0 ? (
              <span className="font-bold text-gov-crimson flex items-center space-x-1">
                <span>⚠️ {kpis.overdueCustodyCount} Overdue for Return!</span>
              </span>
            ) : (
              <span className="font-medium text-emerald-700">✓ All hardcopies within due SLA</span>
            )}
          </div>
        </div>

        {/* Card 4: Active Cases & Projects */}
        <div className="p-5 rounded-bento bg-white border border-gov-border shadow-gov flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gov-slate uppercase tracking-wider">
              Cases & Projects
            </span>
            <div className="w-8 h-8 rounded-xl bg-gov-emerald-soft flex items-center justify-center text-gov-emerald">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-extrabold text-gov-slate">
              {kpis.activeCasesAndProjectsCount}
            </span>
            <span className="text-xs text-gov-muted ml-2 font-medium">Active Dossiers</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gov-emerald font-semibold pt-2 border-t border-gov-border">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{kpis.slaComplianceRate}% Federal SLA Compliance</span>
          </div>
        </div>
      </div>

      {/* Middle Analytics Section (65% Resolution Chart, 35% Correspondence Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Correspondence Volume & Resolution */}
        <div className="lg:col-span-8 bg-white p-6 rounded-bento border border-gov-border shadow-gov">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gov-slate">Correspondence & Resolution Performance</h3>
              <p className="text-xs text-gov-muted">Inward Dak received vs processed by secretariat staff</p>
            </div>
            <div className="flex bg-gov-canvas rounded-xl p-1 border border-gov-border text-xs font-semibold">
              <button
                onClick={() => setChartPeriod("week")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartPeriod === "week" ? "bg-white text-gov-emerald shadow-xs" : "text-gov-muted"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setChartPeriod("month")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  chartPeriod === "month" ? "bg-white text-gov-emerald shadow-xs" : "text-gov-muted"
                }`}
              >
                Month
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8E5" />
                <XAxis dataKey="day" stroke="#5A6B64" fontSize={11} tickLine={false} />
                <YAxis stroke="#5A6B64" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #E2E8E5",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="inward" name="Inward Received" fill="#C59B27" radius={[6, 6, 0, 0]} />
                <Bar dataKey="processed" name="Actioned / Dispatched" fill="#0B4F32" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Correspondence Classification Breakdown */}
        <div className="lg:col-span-4 bg-white p-6 rounded-bento border border-gov-border shadow-gov flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gov-slate">Dak Type Distribution</h3>
            <p className="text-xs text-gov-muted">Actionable vs Archival Correspondence</p>
          </div>

          <div className="h-44 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gov-border text-xs">
            {breakdownData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gov-slate text-xs font-medium">{d.name}</span>
                </div>
                <span className="font-mono font-bold text-gov-slate">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Operational Section (Recent Letters + Physical Custody Watchlist) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent High-Priority & Down-Marked Letters */}
        <div className="lg:col-span-7 bg-white p-6 rounded-bento border border-gov-border shadow-gov">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gov-slate">Urgent & Executive Correspondence</h3>
              <p className="text-xs text-gov-muted">Active downward routing & pending compliance</p>
            </div>
            <button
              onClick={() => (window.location.href = "/dak-inward")}
              className="text-xs font-semibold text-gov-emerald hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gov-border text-gov-muted uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3">Diary No</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Sender Org</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border/60">
                {recentLetters.length > 0 ? (
                  recentLetters.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLetter(l)}
                      className="hover:bg-gov-canvas/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 font-mono font-bold text-gov-emerald">{l.diaryNumber}</td>
                      <td className="py-3 font-medium text-gov-slate max-w-xs truncate">{l.subject}</td>
                      <td className="py-3 text-gov-muted truncate">{l.senderOrganization}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.priority === "MOST_IMMEDIATE" || l.priority === "IMMEDIATE"
                              ? "bg-gov-crimson text-white"
                              : "bg-gov-emerald-soft text-gov-emerald"
                          }`}
                        >
                          {l.priority}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-[11px] font-semibold text-gov-emerald group-hover:underline">
                          Open Split Drawer
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gov-muted">
                      No active letters in queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Physical Custody Watchlist (Original Papers Outside Physical Files) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-bento border border-gov-border shadow-gov">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gov-slate">Physical Paper Custody Watchlist</h3>
              <p className="text-xs text-gov-muted">Hardcopies currently removed from physical file jackets</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-amber-light text-gov-amber border border-gov-amber/30">
              Live Auditing
            </span>
          </div>

          <div className="space-y-3">
            {overdueLetters.length > 0 ? (
              overdueLetters.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedLetter(item)}
                  className="p-3.5 rounded-xl border border-gov-crimson/30 bg-gov-crimson-light/30 hover:bg-gov-crimson-light/50 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-gov-crimson">
                      {item.diaryNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-crimson text-white animate-pulse">
                      OVERDUE RETURN
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gov-slate truncate">{item.subject}</h4>
                  <div className="flex items-center justify-between text-[11px] text-gov-muted">
                    <span>Holder: <strong className="text-gov-slate">{item.physicalHolderName}</strong></span>
                    <span className="text-gov-crimson font-bold">
                      Due: {formatDate(item.physicalDueReturnDate)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gov-muted text-xs">
                ✓ All physical hardcopies are safely attached in their file jackets.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-Over Document Drawer */}
      <LetterSplitDrawer
        letter={selectedLetter}
        isOpen={!!selectedLetter}
        onClose={() => setSelectedLetter(null)}
        onRefresh={loadData}
      />
    </div>
  );
}

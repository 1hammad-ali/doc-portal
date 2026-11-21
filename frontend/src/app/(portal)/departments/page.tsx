"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Shield, Plus, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Department } from "@/types";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.getDepartments();
        if (res?.departments) setDepartments(res.departments);
        if (res?.all) setAllDepartments(res.all);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepartments();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gov-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-gov-slate">Departments & Multi-Department Access Matrix</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Federal Secretariat hierarchy, attached wings, sections, and cross-departmental RBAC authorizations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Department Tree */}
        <div className="bg-white p-6 rounded-bento border border-gov-border shadow-gov space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate border-b border-gov-border pb-2">
            Secretariat Organizational Tree
          </h3>

          <div className="space-y-3">
            {allDepartments.map((dept) => (
              <div
                key={dept.id}
                className="p-3.5 rounded-xl border border-gov-border bg-gov-canvas/40 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-gov-emerald">{dept.code}</span>
                    <span className="text-xs font-bold text-gov-slate">{dept.shortName}</span>
                  </div>
                  <p className="text-[11px] text-gov-muted mt-0.5">{dept.name}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Multi-Department Role Architecture */}
        <div className="bg-white p-6 rounded-bento border border-gov-border shadow-gov space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-slate border-b border-gov-border pb-2">
            Cross-Department RBAC Rules (Requirement 7)
          </h3>

          <div className="space-y-3 text-xs leading-relaxed text-gov-slate">
            <div className="p-3.5 rounded-xl bg-gov-canvas/60 border border-gov-border">
              <strong className="block font-bold text-gov-emerald">1 User Managing Multiple Departments:</strong>
              <p className="text-gov-muted mt-1">
                Via <code className="font-mono text-gov-slate">UserDepartmentAccess</code>, senior officers (e.g. Project Director Engr. Salman Farooq) administer multiple departments simultaneously with granular rights (<code className="font-mono">canCreate</code>, <code className="font-mono">canEdit</code>, <code className="font-mono">canDownmark</code>).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gov-canvas/60 border border-gov-border">
              <strong className="block font-bold text-gov-emerald">Confidential Folder Permissions:</strong>
              <p className="text-gov-muted mt-1">
                Via <code className="font-mono text-gov-slate">UserFolderPermission</code>, access to sensitive cases and confidential officer jackets is restricted to authorized officers only.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gov-canvas/60 border border-gov-border">
              <strong className="block font-bold text-gov-crimson">Admin-Only Deletion Enforcement:</strong>
              <p className="text-gov-muted mt-1">
                Regular clerks and officers cannot delete records. Only <code className="font-mono">SUPER_ADMIN</code> and <code className="font-mono">DEPT_ADMIN</code> can soft-delete with a mandatory reason.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

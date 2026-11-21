# COPY-PASTE MASTER PROMPT FOR YOUR AI DEVELOPER (ANTIGRAVITY / CLAUDE / CURSOR)

Copy the prompt below and paste it directly into your AI coding agent to begin building the portal step-by-step while maintaining persistent memory in `/brain`:

---

```text
You are acting as a Principal Full-Stack Architect & Lead Government Systems Engineer. We are building **GovEDMS** — an enterprise, multi-user National Government Document & e-File Management System (e-Office) designed for Prime Minister Secretariat, Ministerial, and Departmental scale.

### STEP 1: INITIALIZE REPOSITORY & PERSISTENT BRAIN MEMORY
Before writing application code, inspect the attached architectural markdown specifications (`00_MASTER_CONTEXT.md`, `01_DATABASE_ARCHITECTURE.md`, `02_CORE_WORKFLOWS_AND_FEATURES.md`, `03_UI_UX_DESIGN_SYSTEM.md`, `04_API_AND_SECURITY_SPEC.md`).
Create the project workspace with a dedicated `/brain/` directory containing:
1. `brain/ARCHITECTURE_DECISIONS.md`
2. `brain/PROGRESS_TRACKER.md`
3. `brain/SCHEMA_CHANGELOG.md`
4. `brain/KNOWN_ISSUES_LOG.md`
And place `00_MASTER_CONTEXT.md` in the root directory. After EVERY completed milestone, you MUST update `brain/PROGRESS_TRACKER.md` and `brain/ARCHITECTURE_DECISIONS.md` so any future AI session has complete context.

### STEP 2: TECH STACK TO SCAFFOLD
- **Frontend:** Next.js 15 (App Router, TypeScript, Tailwind CSS, Shadcn/UI, Lucide Icons, Recharts)
- **Backend:** Node.js + NestJS (or Express + TypeScript) + Prisma ORM
- **Database:** PostgreSQL 16 (with full-text search)
- **Storage:** MinIO (S3-compatible) with SHA-256 checksums
- **OCR & Barcode Worker:** Python FastAPI (`PyMuPDF`, `pyzbar`, `pytesseract`)

### STEP 3: NON-NEGOTIABLE CORE REQUIREMENTS
1. **Multi-File Letter Linking:** One uploaded letter (Inward Dak / Outward Dispatch / Internal Memo) must be linkable to **multiple files simultaneously** (e.g., Main Organizational File + Addressee Officer File + Case File + Project File) with per-file folio numbers.
2. **Case & Project Creation:** Users can open dedicated Case Files and Project Files under any Department, attach tags, and auto-rename uploaded files cleanly.
3. **Correspondence Types:** Support `ACTION_REQUIRED`, `CC_INFORMATION_ONLY` (no action needed), `NOTIFICATION_SRO`, `DIRECTIVE_ORDER`, `FINANCIAL_AUDIT`, and `LEGAL_COURT_NOTICE`.
4. **Hierarchical Down-Marking:** Senior officials can down-mark letters to subordinate officers with instructions, SLA deadlines, and real-time visibility into who currently holds responsibility and closure status.
5. **Physical Hardcopy Custody & Overdue Alerts:** Every document has physical verification controls (`Attached in Physical File` vs `Original Copy Removed / Issued Out`). When a physical original is removed and handed to someone, track the holder and due return date, and trigger **Red Overdue Alerts** on the main Dashboard until returned.
6. **Barcode System (Print + USB Scanner + Camera):** Auto-generate printable Code-128/QR barcodes for every File and Letter. Implement both a global USB hardware barcode scanner listener AND a webcam/mobile camera QR/barcode scanner modal.
7. **Multi-Department RBAC & Admin-Only Delete:** Support users managing 1 or multiple departments/folders. Only `SUPER_ADMIN` / `DEPT_ADMIN` can delete documents (with mandatory deletion reason). Every view, download, checkout, down-mark, and deletion must be recorded in an immutable `AuditLog`.
8. **Executive Government UI:** Follow `03_UI_UX_DESIGN_SYSTEM.md` — modern floating left sidebar, rounded bento KPI cards, top search bar, right-hand live timeline rail, and an official **Sovereign Emerald (`#0B4F32`), Gold (`#C59B27`), and Slate (`#111C18`)** government palette.

### EXECUTION ORDER (BUILD PHASE BY PHASE & UPDATE `/brain` AFTER EACH):
- **Phase 1:** Scaffold monorepo (`/frontend`, `/backend`, `/ocr-worker`, `/brain`), Docker Compose (PostgreSQL, MinIO, Redis), and complete `prisma/schema.prisma` + database seed script.
- **Phase 2:** Build Backend Auth, Multi-Department/Folder RBAC Guards, Departments/Files/Cases API, and Immutable Audit Logging middleware.
- **Phase 3:** Build Letter Intake (MinIO upload + structured renaming + Multi-File Linking), Hierarchical Down-Marking API, and Physical Custody Checkout/Overdue Alert API.
- **Phase 4:** Build Executive Government UI (Command Dashboard, Split-View Document Drawer, USB + Camera Barcode Scanner, Down-Marking Timeline, Physical Custody Alerts, and Audit Log Explorer).
- **Phase 5:** Integrate Python FastAPI OCR & Barcode verification worker.

Start immediately with **Phase 1**: initialize the `/brain/` memory files, `docker-compose.yml`, and the complete `prisma/schema.prisma`, then summarize your progress in `brain/PROGRESS_TRACKER.md`.
```

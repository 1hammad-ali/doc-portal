# MASTER PROJECT CONTEXT — NATIONAL E-FILE & GOVERNMENT DOCUMENT MANAGEMENT SYSTEM (GovEDMS)

## 1. Executive Vision & System Identity
**GovEDMS** is an enterprise-grade, multi-tenant, high-security **Government Electronic Document & File Management System (e-Office / EDMS)** designed to scale from a single secretariat department (e.g., PMU / LG&CDD) up to a national federal/provincial infrastructure (Cabinet & Prime Minister's Secretariat level).

It digitizes, tracks, routes, and audits physical and digital official correspondence (Dak / Letters / Directives / Notifications) while maintaining a **1-to-1 digital twin** of physical office files, barcodes, physical custody chains, and administrative down-marking workflows.

---

## 2. Core Problem Statement & Real-World Government Workflow
In government departments, physical letters arrive daily (Inward Dak) and are issued (Outward Dispatch). A single physical letter often impacts multiple files simultaneously (e.g., the **Main Organizational Correspondence File**, the **Addressee/Officer's Personal/Section File**, a **Case File**, or a **Project File**). Furthermore:
1. **Physical-Digital Synchronization:** Officers frequently pull a physical original letter out of a physical file folder for meetings or signatures and forget to return it. The system must track whether a document is physically **Attached in File** or **Checked Out / Issued Out**, raising automated overdue return alerts on the dashboard.
2. **Hierarchical Down-Marking (Dak Routing):** Letters addressed to senior leadership (e.g., Prime Minister, Chief Secretary, Secretary, Project Director) are "down-marked" through the chain of command (Director -> Deputy Director -> Section Officer -> Dealing Assistant) with specific remarks, priority flags, and SLA deadlines.
3. **Correspondence Categorization:** Not every letter requires an action. The system distinguishes between **Action Required**, **For Information / CC Only**, **Government Notification / Gazette**, **Directive / Order**, **Legal / Court Notice**, and **Financial / Audit Memo**.
4. **Zero-Trust Audit & Custody:** Every view, download, print, physical checkout, down-mark, or admin-only soft/hard deletion is immutably logged.

---

## 3. Recommended Production Tech Stack (High-Speed & Scalable)
* **Frontend:** **Next.js 15 (App Router)** + **TypeScript** + **Tailwind CSS** + **Shadcn/UI** + **Lucide Icons** + **TanStack Table** + **Recharts** (for executive dashboard analytics).
* **Backend API:** **Node.js (v20+)** with **NestJS** (or Express + TypeScript modular architecture) for strict RBAC, REST/WebSocket real-time alerts, and clean service layers.
* **Document & OCR Microservice (Python):** **Python 3.11 (FastAPI)** worker using `PyMuPDF`, `Tesseract OCR / PaddleOCR`, and `pyzbar` to auto-extract text from scanned PDFs/images for full-text search and verify barcode scans.
* **Primary Database:** **PostgreSQL 16** with `pg_trgm` & `tsvector` (full-text search across Urdu/English letter subjects, diary numbers, and OCR text) + **Prisma ORM**.
* **File & Object Storage:** **MinIO** (S3-compatible self-hosted government cloud storage) with AES-256 server-side encryption and SHA-256 file integrity hashing.
* **Caching & Job Queues:** **Redis** + **BullMQ** (for background OCR processing, SLA overdue notifications, and audit log batching).
* **Barcode & Hardware Integration:**
  * **USB Barcode Scanners:** Keyboard-wedge HID listener hook (`useBarcodeScanner`) capturing rapid keystrokes ending in `Enter` anywhere in the portal.
  * **Web Camera Barcode/QR Scanner:** `html5-qrcode` / `@zxing/browser` integrated directly into the intake/checkout modal for mobile/webcam scanning.
  * **Label Generation:** `bwip-js` / `JsBarcode` generating printable Code-128 / QR stickers for physical file covers and inward letters.

---

## 4. Directory & Repository Blueprint
```text
gov-edms/
├── brain/                          # AI Persistent Memory & Execution Ledger
│   ├── ARCHITECTURE_DECISIONS.md   # Logged technical & schema choices
│   ├── PROGRESS_TRACKER.md         # Module-by-module build checklist
│   ├── SCHEMA_CHANGELOG.md         # Database migrations & model updates
│   └── KNOWN_ISSUES_LOG.md         # Bugs, edge cases & resolutions
├── backend/                        # Node.js + NestJS / Express API
│   ├── prisma/
│   │   ├── schema.prisma           # Complete PostgreSQL schema
│   │   └── seed.ts                 # Roles, Departments, Letter Types, SuperAdmin
│   ├── src/
│   │   ├── auth/                   # JWT + Refresh Tokens, 2FA, Session Logs
│   │   ├── rbac/                   # Department & Folder-level ACL guards
│   │   ├── departments/            # Ministries, Wings, Sections, Posts
│   │   ├── files/                  # Physical/Digital File Jackets, Cases, Projects
│   │   ├── letters/                # Inward/Outward Dak, Multi-File Linking
│   │   ├── downmarking/            # Hierarchical routing & SLA tracking
│   │   ├── physical-custody/       # Real-copy file attachment & checkout alerts
│   │   ├── barcode/                # Barcode generator & lookup resolver
│   │   └── audit/                  # Immutable activity & access ledger
├── ocr-worker/                     # Python FastAPI Microservice
│   ├── main.py                     # PDF/Image OCR + Barcode extraction endpoint
│   └── requirements.txt
├── frontend/                       # Next.js 15 Government Executive UI
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   └── (portal)/
│   │   │       ├── dashboard/      # Prime Minister / Executive Command View
│   │   │       ├── dak-inward/     # Letter Intake + Camera/USB Barcode Scan
│   │   │       ├── dak-outward/    # Dispatch Register
│   │   │       ├── files/          # Department Files, Cases & Projects
│   │   │       ├── custody-alerts/ # Missing / Checked-Out Physical Originals
│   │   │       ├── departments/    # Org Chart, Folders & User Access Matrix
│   │   │       └── audit-logs/     # Forensic Access & Admin Delete Logs
│   │   ├── components/
│   │   │   ├── layout/             # Floating Sidebar, Top Search, Right Rail
│   │   │   ├── scanner/            # USB HID Hook + Webcam QR/Barcode Modal
│   │   │   └── letters/            # Multi-File Linker & Down-Mark Drawer
│   │   └── styles/theme.css        # Official Emerald/Slate/Gold Gov Palette
└── 00_MASTER_CONTEXT.md            # Root AI Context Entrypoint
```

---

## 5. AI Agent Operating Protocol (Mandatory Rules for Any AI Working on This Repo)
1. **Read First:** Before writing any code, read `00_MASTER_CONTEXT.md` and all files inside `/brain/`.
2. **Update Memory After Every Task:** After completing any feature, endpoint, migration, or UI component, immediately update `brain/PROGRESS_TRACKER.md` and `brain/ARCHITECTURE_DECISIONS.md` so any future AI session has 100% context continuity.
3. **Never Break Multi-File Integrity:** A single `Letter` record must never be duplicated when placed in multiple files; always use the `LetterFileLink` junction table with `link_role` (`PRIMARY_ORG_FILE`, `OFFICER_FILE`, `CASE_FILE`, `PROJECT_FILE`, `CC_REFERENCE`).
4. **Enforce Strict RBAC:** Every query for letters or files must filter through `UserDepartmentAccess` and `UserFolderPermission` unless the user holds `SUPER_ADMIN` clearance.
5. **Physical Custody Guardrails:** Whenever `is_attached_in_physical_file` is toggled to `false` (checked out to an officer), a `PhysicalCustodyLog` record with `expected_return_date` is mandatory, triggering dashboard alerts upon expiration.

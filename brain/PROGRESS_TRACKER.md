# PROJECT BUILD & EXECUTION TRACKER

## Phase 1: Foundation, Database & Brain Memory
- [x] Master architectural specifications verified (`00_MASTER_CONTEXT.md` through `05_AI_MASTER_EXECUTION_PROMPT.md`)
- [x] Persistent `/brain/` memory directory and ledger initialized:
  - `brain/ARCHITECTURE_DECISIONS.md`
  - `brain/PROGRESS_TRACKER.md`
  - `brain/SCHEMA_CHANGELOG.md`
  - `brain/KNOWN_ISSUES_LOG.md`
- [x] Monorepo scaffolded (`/frontend`, `/backend`, `/ocr-worker`, `/brain`)
- [x] `docker-compose.yml` configured (PostgreSQL 16, MinIO, Redis, Backend, Frontend, OCR Worker)
- [x] Root `.env.example` & `.gitignore` configured
- [x] Complete Prisma schema `prisma/schema.prisma` defined, validated, and client generated (`npx prisma generate`)
- [x] Comprehensive database seed script authored (`prisma/seed.ts`) with SuperAdmin, Departments hierarchy, Users across 6 roles, File Jackets (Main Org, Officer, Case, Project, Policy), Letters, Multi-File Links, Downmarks, and Custody Logs

## Phase 2: Security, Multi-Department RBAC & Core File Jackets
- [x] JWT Authentication + Refresh Token rotation (`backend/src/routes/auth.routes.ts`)
- [x] Multi-Department & Folder-Level RBAC Guards (`backend/src/middleware/rbac.ts`):
  - `requireRole`: System-wide clearance check with `SUPER_ADMIN` override
  - `requireDepartmentAccess`: Cross-department check (`canCreate`, `canEdit`, `canDownmark`, `canExport`)
  - `requireFolderAccess`: Folder/File ACL guard for confidential files (`canRead`, `canWrite`, `canCheckout`)
  - `requireAdminDelete`: Enforces admin-only deletion with mandatory recorded reason
- [x] Department & Sub-Wing Hierarchy CRUD (`backend/src/routes/departments.routes.ts`)
- [x] File Jacket / Case File / Project File CRUD (`backend/src/routes/files.routes.ts`) with auto-generated `fileNumber` and scannable `barcode`
- [x] Barcode Resolver endpoint (`backend/src/routes/barcode.routes.ts`) for instant USB/Camera scanning
- [x] Immutable Forensic `AuditLog` Interceptor (`backend/src/middleware/audit.ts`)

## Phase 3: Dak Intake, Multi-File Linking, Down-Marking & Physical Custody
- [x] MinIO document vault streaming with structured government filename & SHA-256 integrity checksum (`backend/src/routes/letters.routes.ts`)
- [x] Multi-File Letter Linking junction engine (`backend/src/routes/letters.routes.ts`):
  - 1 letter attached to multiple files (Master Org + Officer File + Case File + Project File)
  - Independent folio numbering per file jacket (`folioNumber`)
- [x] Hierarchical Down-Marking workflow & SLA tracking (`backend/src/routes/downmarking.routes.ts`)
- [x] Physical Hardcopy Custody State Machine (`backend/src/routes/custody.routes.ts`):
  - Checkout logging with holder, purpose, and return deadline
  - Re-filing check-in logic
  - Red Overdue Alert engine (`/api/v1/custody/overdue`)
- [x] Admin-Only Soft Deletion with mandatory compliance reason recording

## Phase 4: Executive Government Frontend (Next.js 15)
- [x] Sovereign Emerald (`#0B4F32`), Gold (`#C59B27`), Slate (`#111C18`) Design System & CSS variables
- [x] Executive Government 3-Zone Layout (`Sidebar.tsx`, `Header.tsx`, `RightTimelineRail.tsx`, `PortalLayout`)
- [x] Prime Minister & Executive Command Dashboard (`app/(portal)/dashboard/page.tsx`):
  - 4 Rounded Bento KPI Cards with gold highlight
  - Departmental Correspondence & Resolution Recharts Bar Chart
  - Correspondence Classification Distribution Donut Chart
  - High-Priority & Urgent Letters Table
  - Physical Paper Custody Watchlist with Red Overdue Alert banner
- [x] Inward Dak Intake & Registration Wizard (`app/(portal)/dak-inward/page.tsx`) with Multi-File Linker
- [x] Outward Dispatch Register (`app/(portal)/dak-outward/page.tsx`)
- [x] Files, Cases & Projects Dossier Explorer (`app/(portal)/files/page.tsx`) with "Open New File/Case" modal
- [x] Physical Paper Custody & Overdue Alerts Page (`app/(portal)/custody-alerts/page.tsx`)
- [x] Down-Marked Executive Tasks Queue (`app/(portal)/downmarks/page.tsx`)
- [x] Gazettes, Circulars & SRO Repository (`app/(portal)/notifications/page.tsx`)
- [x] Departments & Multi-Department Access Matrix (`app/(portal)/departments/page.tsx`)
- [x] Forensic Audit & Compliance Ledger (`app/(portal)/audit-logs/page.tsx`)
- [x] Dual-Mode Barcode Scanner (`BarcodeScannerModal.tsx`) with USB HID keyboard-wedge listener hook (`useBarcodeScanner.ts`) and Camera/Webcam viewfinder
- [x] Document Split-View Drawer (`LetterSplitDrawer.tsx`) with Interactive Left Document Preview and Right Workflows (Multi-File Links, Down-Marking, Physical Custody, Audit Log)
- [x] Executive One-Click Login Page (`app/(auth)/login/page.tsx`) with 6 pre-configured roles

## Phase 5: Python OCR & Barcode Microservice
- [x] FastAPI microservice (`ocr-worker/main.py`)
- [x] High-fidelity text extraction via PyMuPDF
- [x] Barcode scanning & detection via `pyzbar` and regex patterns
- [x] Standalone containerized `Dockerfile` & `requirements.txt`
- [x] Standalone HTTP fallback microservice running on port 8000 (`ocr-worker/server.js`)

## Phase 6: Automated End-to-End Verification & Autonomous Smoke Testing
- [x] Automated test suite executed (`backend/scripts/smoke-test.js`) with 100% pass rate:
  - [x] Test 0: Health status verified for Frontend (port 3000), OCR worker (port 8000), and Backend API (port 4000)
  - [x] Test 1: Authentication for `superadmin@govedms.gov` with JWT token generation and role claim validation
  - [x] Test 2: Live dashboard executive KPIs (totalDakToday, pendingDownmarked, urgentLetters, checkedOutPhysical, overdueCustody)
  - [x] Test 3: Overdue custody live query returning active alert `DAK-2026-001002` (Engr. Salman Farooq)
  - [x] Test 4: Creation of Department Case File `GOV/2026/CASE-0006` with scannable barcode `FILE-2026-100006`
  - [x] Test 5: Inward Dak Intake with SHA-256 calculation and simultaneous Multi-File Linking (`Folio 1/A`, `Folio 84/C`)
  - [x] Test 6: Hierarchical Down-Marking from SuperAdmin to Dealing Assistant with instructions and SLA deadline
  - [x] Test 7: Subordinate officer response and status transition to `IN_PROGRESS` with progress remarks
  - [x] Test 8: Physical Hardcopy Custody: Checkout to officer followed by verification checkin back into physical jacket
  - [x] Test 9: Universal Barcode Resolver: Dual test resolving both Letter barcode (`LTR-2026-000004`) and File barcode (`FILE-2026-100006`)
  - [x] Test 10: Sovereign Forensic Audit Trail: 14 immutable event logs queried and verified
  - [x] Test 11: Admin-Only Soft Delete: Enforced mandatory compliance justification and recorded audit trail entry

## Phase 7: GovEDMS v2.0 Enterprise Upgrades (Autonomous Verification)
- [x] **Upgrade 1: User Management & Granular Access Control Center (`/users` & `/departments`)**:
  - [x] Full User CRUD: Create, Edit, Toggle Active/Disabled status, Reset Password, Assign Primary Designation & Employee Code.
  - [x] Granular Multi-Department Permission Matrix: Admin drawer with 7 independent toggles (`canView`, `canCreate`, `canEdit`, `canDownmark`, `canCheckoutPhysical`, `canExport`, `canDelete`).
  - [x] Folder & File-Level Clearances (`UserFolderPermission`): Select any Case File/Project/Dossier and assign `canRead`, `canWrite`, `canCheckout`.
  - [x] Strict Backend RBAC Enforcement across `GET /files`, `GET /letters`, `POST /letters`, `POST /downmark`, `POST /physical-checkout`, and `DELETE /letters`.
- [x] **Upgrade 2: Interactive File Dossier Workspace & Combined PDF Merging (`/files/[id]`)**:
  - [x] Clickable File Jackets in `/files` navigating to dynamic dossier `/files/[id]`.
  - [x] Physical File Cover Header (File Number, Barcode badge, Almirah/Rack Location, Category, Status, Custodian, Opened Date).
  - [x] Indexed Table of Contents & Folio Register chronologically ordered with folio numbers, diary numbers, and selection checkboxes.
  - [x] In-Memory Combined PDF Merging Engine (`pdf-lib`) generating official Government Cover Index, dynamic Table of Contents, and Folio Separator Pages with OCR previews (`POST /api/v1/files/:id/merge-pdf`).
  - [x] Built-in Dossier Book live preview mode and custom subset compilation.
- [x] **Upgrade 3: Intelligent Story & Archival Search Engine (`/search` & `Ctrl + K`)**:
  - [x] Multi-token concept extractor filtering conversational stop words in English and Roman Urdu.
  - [x] Weighted multi-field matching across `subject`, `briefReason`, `ocrExtractedText`, `senderOrganization`, `addressedToPost`, and `fileLinks`.
  - [x] Contextual Snippet generation with highlighted token windows.
  - [x] Year, Department, Correspondence Type, and Priority filters.
  - [x] Global `Ctrl + K` shortcut in navigation header.
- [x] **Upgrade 4: Enhanced Physical Custody Out-Register & Auto-Timestamping**:
  - [x] Mandatory Recipient Officer Full Name and Designation/Post capture (`issuedToDesignation`).
  - [x] Automatic server-side out-timestamping (`checkedOutAt: NOW()`).
  - [x] Comprehensive Physical File Movement Ledger (`/custody-alerts` and `LetterSplitDrawer`).
  - [x] Real-time tracking of movement states (`OUT_TO_OFFICER`, `OVERDUE`, `RETURNED_IN_FILE`).
- [x] **Automated v2.0 Test Suite (`backend/scripts/smoke-test-v2.js`)**: All 6 end-to-end integration tests verified with 100% pass rate.

## Phase 8: GovEDMS v3.0 Production Overhaul (Autonomous Verification)
- [x] **Critical Bug Fixes & Session Security**:
  - [x] Implemented `POST /api/v1/auth/logout`: Clears session tokens, invalidates cache, logs `USER_LOGOUT` in `AuditLog`, and redirects cleanly to `/login`.
  - [x] Session lifecycle protection: Client-side route guard automatically redirects unauthenticated users to `/login`.
  - [x] Profile Management & Password Reset: Implemented `PATCH /api/v1/auth/profile` and `PATCH /api/v1/auth/change-password` with bcrypt encryption.
  - [x] Super Admin Dynamic Multi-Department Access Management: Implemented `PUT /api/v1/admin/users/:id/permissions` and `DELETE /api/v1/users/:id/access-matrix/:deptId` enabling instant adding, editing, toggling, and removal of department permissions and folder clearances.
- [x] **Modern Eye-Comfort Executive Glassmorphism UI & Branding**:
  - [x] Refined translucent frosted glass theme (`.glass-panel`, `.glass-card`, `.glass-header`, `.glass-modal`) with `backdrop-filter: blur(16px)` over mist-sage alabaster canvas `#EEF2F0`.
  - [x] Preserved Sovereign Emerald (`#0B4F32`), Warm Gold (`#C59B27`), and Deep Slate (`#13201B`) palette with zero glare.
  - [x] Dedicated User Profile & Branding Page (`/profile`): Personal profile updates, password change, assigned department matrix view, and Super Admin state logo upload & watermark configuration (`SystemSettings`).
  - [x] Interactive Header & Sidebar Profile menu with active officer badge, department clearance indicator, and one-click session sign-out.
- [x] **Real Inline PDF / Document Streaming & Official Minute Notes Sheet**:
  - [x] Guaranteed inline PDF streaming endpoint (`GET /api/v1/letters/:id/stream`): Streams MinIO documents or dynamically synthesizes official certified government letterhead PDFs with cryptographic SHA-256 stamp.
  - [x] Official Minute Notes Sheet: Implemented `LetterNote` table, `POST /api/v1/letters/:id/notes`, and `GET /api/v1/letters/:id/notes`.
  - [x] Integrated Minute Notes tab into `LetterSplitDrawer` with chronological officer annotations, internal flags, and authorship metadata.
- [x] **Secure Time-Bound, Password-Protected Letter Sharing**:
  - [x] Models `SecureShareLink` and `ShareAccessLog` with random 48-char crypto token and bcrypt hashed passwords.
  - [x] External Share Modal: Expiration selector (1h to 30d), view-only vs allow-download toggle, and recipient label.
  - [x] Public Secure Viewer (`/shared/[token]`): Password verification modal, document metadata strip, and embedded PDF stream.
  - [x] Anti-Screenshot / View-Only Hardening: Right-click disable, key traps (`Ctrl+S`, `Ctrl+P`, `PrintScreen`), window focus loss blur protection, and dynamic diagonal forensic watermark (`IP + Timestamp`).
  - [x] Conditional download (`GET /api/v1/shared/:token/download`) with forensic audit log recording (`PASSWORD_FAILED`, `VIEWED`, `DOWNLOADED`).
  - [x] Instant revocation endpoint (`DELETE /api/v1/letters/:id/shares/:shareId`).
- [x] **Department-Wise Dak Inward Register, Date Range Filters & 1-Click Dossier Download**:
  - [x] Dual-view `/dak-inward`: Central & Departmental Dak Inward Register (Table) + New Inward Dak Intake (Wizard).
  - [x] Department filter tabs (`All Departments` and wings) + Date range filter (`From Date` — `To Date`).
  - [x] 100% clickable letter rows opening `LetterSplitDrawer` across Register, Files, and Search.
  - [x] Single-Click Complete File Dossier Download: "Download Complete File (1 PDF)" button (`GET /api/v1/files/:id/download-all`) on each file card in `/files` and within `/files/[id]`.
- [x] **Automated v3.0 Test Suite (`backend/scripts/smoke-test-v3.js`)**: All 25 end-to-end integration tests verified with 100% pass rate.

## Phase 9: Vercel Production Deployment & Security Patching
- [x] **Next.js 15.x Security Advisory Upgrade**:
  - Upgraded `frontend/package.json` and `frontend/package-lock.json` from `next@15.1.0` to `next@15.5.29`.
  - Resolved critical/high security advisories (Authorization Bypass in Next.js Middleware GHSA-f82v-jwr5-mffw, DoS via Image Optimizer GHSA-9g9p-9gw9-jx7f, HTTP request smuggling in rewrites GHSA-ggv3-7p47-pfv8).
  - Executed `npm run build` with 100% success across all 17 static & dynamic routes.
  - Committed and pushed upstream to `main` branch on GitHub (`https://github.com/1hammad-ali/doc-portal.git`).

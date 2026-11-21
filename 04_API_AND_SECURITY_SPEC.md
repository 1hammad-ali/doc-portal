# REST API SPECIFICATION & GOVERNMENT SECURITY ARCHITECTURE

## 1. Security & Compliance Architecture
1. **Authentication:** Short-lived JWT Access Tokens (`15m`) + HttpOnly Secure Refresh Tokens (`7d`), optional TOTP 2FA for `SUPER_ADMIN` and `EXECUTIVE_OFFICER` roles.
2. **Row-Level & Folder-Level Authorization Guard:**
   - Middleware inspects `req.user` -> verifies `UserDepartmentAccess` for the target `departmentId` AND `UserFolderPermission` if the file is marked `isConfidential = true`.
3. **File Integrity & Storage Security:**
   - Files are streamed to MinIO private buckets (never publicly exposed URLs).
   - Downloads/Previews generate time-limited signed URLs (`expiresIn: 300s`) and trigger an asynchronous `AuditLog` write (`VIEW_DOCUMENT` or `DOWNLOAD_PDF`).
   - SHA-256 checksum computed on upload to prove no document tampering occurred.

---

## 2. Core REST API Endpoints (`/api/v1`)

### Authentication & Access Control
- `POST /auth/login` — Authenticate officer, issue tokens, log session IP/device.
- `GET /auth/me` — Return profile, assigned departments, and role capabilities.
- `POST /admin/users` — Create user & assign multi-department / specific folder permissions.
- `PATCH /admin/users/:id/permissions` — Update multi-department or folder ACLs.

### Departments & File Jackets (Regular, Case, Project)
- `GET /departments` — Tree list of Ministries/Departments/Wings.
- `POST /departments` — Create new department or sub-wing.
- `GET /files` — Filter files by department, category (`MAIN_ORG_FILE`, `CASE_FILE`, `PROJECT_FILE`), status, or barcode.
- `POST /files` — Create a new File Jacket / Case / Project (auto-generates unique `fileNumber` and scannable `barcode`).
- `GET /files/barcode/:code` — Instant lookup by USB/Camera barcode scan.

### Letters (Inward Dak / Outward Dispatch / Multi-File Linking)
- `POST /letters` — Multipart upload: saves document with structured filename, links to multiple `fileIds` (`LetterFileLink[]`), generates letter `barcode`, sets physical custody status, and dispatches background OCR job.
- `GET /letters` — Paginated search across subject, diary number, reference number, sender, letter type, priority, tags, and PostgreSQL full-text `ocrExtractedText`.
- `GET /letters/:id` — Full letter detail including linked files, down-marking history, physical custody status, and access log count.
- `POST /letters/:id/link-files` — Attach an existing letter into additional files (e.g., linking an inward letter to a newly opened Case File or Officer File).
- `DELETE /letters/:id` — **Admin-Only Soft Delete** (Requires `role === SUPER_ADMIN || DEPT_ADMIN` and non-empty `deletionReason`).

### Hierarchical Down-Marking & Responsibility
- `POST /letters/:id/downmark` — Forward/mark letter to subordinate user(s) with instructions and SLA deadline.
- `PATCH /downmarkings/:id/respond` — Subordinate submits progress remarks or marks action `COMPLETED_CLOSED`.

### Physical Hardcopy Custody & Overdue Alerts
- `POST /letters/:id/physical-checkout` — Mark original hardcopy removed from physical file, log recipient officer, purpose, and `expectedReturnAt`.
- `POST /letters/:id/physical-checkin` — Confirm original hardcopy returned and re-attached in physical file jacket.
- `GET /custody/overdue` — Fetch all checked-out originals past `expectedReturnAt` for Dashboard Red Alerts.

### Forensic Audit Logs
- `GET /audit-logs` — Queryable audit trail filterable by user, letter, file, action type, and date range (exportable to CSV/PDF for inspections).

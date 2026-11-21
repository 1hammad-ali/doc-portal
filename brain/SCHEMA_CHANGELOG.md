# DATABASE SCHEMA CHANGELOG

## v1.0.0 — Initial Sovereign Government Schema
- **Department**: Hierarchical tree structure supporting Ministry -> Wing -> Section -> Post with `code`, `name`, `shortName`, and `parentId`.
- **User**: Multi-role system (`SUPER_ADMIN`, `DEPT_ADMIN`, `EXECUTIVE_OFFICER`, `DOC_CONTROLLER`, `DEALING_ASSISTANT`, `AUDITOR`) with `employeeCode`, `designation`, and `passwordHash`.
- **UserDepartmentAccess**: Explicit M:N mapping allowing 1 user to administer/view 2 or more departments simultaneously with granular rights (`canCreate`, `canEdit`, `canDownmark`, `canExport`).
- **UserFolderPermission**: Folder/File-level ACL for confidential files (`canRead`, `canWrite`, `canCheckout`).
- **GovFile**: Physical/Digital File Jackets (`MAIN_ORG_FILE`, `OFFICER_FILE`, `CASE_FILE`, `PROJECT_FILE`, `POLICY_FILE`) with unique `fileNumber` and scannable `barcode`.
- **Letter**: Complete correspondence metadata (Inward/Outward/Memo), `letterType` (`ACTION_REQUIRED`, `CC_INFORMATION_ONLY`, `NOTIFICATION_SRO`, `DIRECTIVE_ORDER`, `FINANCIAL_AUDIT`, `LEGAL_COURT_NOTICE`, `MEETING_NOTICE`), `priority`, `storageKey`, `sha256Checksum`, and `ocrExtractedText`.
- **LetterFileLink**: Enables 1 letter to be attached to multiple files with independent `folioNumber` and `linkRole`.
- **LetterDownmarking**: Multi-hop executive routing chain with sequence tracking, `instructions`, `deadline`, and closure status.
- **PhysicalCustodyLog**: Physical paper removal tracking (`ATTACHED_IN_FILE` vs `ISSUED_OUT_TO_OFFICER`) with `expectedReturnAt` for automated overdue alerts.
- **Tag & LetterTag**: Cross-cutting topic and project tagging.
- **AuditLog**: Immutable ledger capturing all view, download, checkout, down-marking, and admin delete events.

## v2.0.0 — Enterprise Access Control, Dossier Engine & Out-Register Schema
- **UserDepartmentAccess**:
  - Added `canView Boolean @default(true)` for cross-department visibility filtering.
  - Added `canCheckoutPhysical Boolean @default(false)` for departmental hardcopy file removal authorization.
  - Added `canDelete Boolean @default(false)` for admin-only departmental soft-deletion clearance.
- **PhysicalCustodyLog**:
  - Added `issuedToDesignation String?` capturing the official post/designation of the recipient officer (e.g., "Director General (Admin & Reforms)", "Deputy Secretary").
  - Automated server-side checkout timestamping (`checkedOutAt: now()`).
- **Database Status**: Synchronized via `npx prisma db push` with 100% data preservation.

## v3.0.0 — Executive Glassmorphism, Minute Notes Sheet, Secure External Sharing & Portal Settings
- **LetterNote**:
  - Added official minute notes register model (`id`, `letterId`, `authorId`, `noteText`, `isInternal`, `createdAt`).
  - Relations attached to `Letter.notes` and `User.notesCreated`.
- **SecureShareLink**:
  - Added time-bound, password-protected external letter sharing model (`id`, `letterId`, `token`, `passwordHash`, `recipientLabel`, `expiresAt`, `allowDownload`, `isRevoked`, `createdById`, `createdAt`).
  - Cryptographic 48-char random hex token with bcrypt hashed passcode.
  - Configurable download permission (default `allowDownload: false` for view-only anti-screenshot mode).
- **ShareAccessLog**:
  - Immutable access forensics ledger tracking all public verification and download attempts (`id`, `shareLinkId`, `action`, `ipAddress`, `userAgent`, `accessedAt`).
  - Captures `PASSWORD_FAILED`, `VIEWED`, and `DOWNLOADED` events with client IP and browser user-agent.
- **SystemSettings**:
  - Dynamic portal-wide configuration model (`id: "default"`, `portalTitle`, `logoUrl`, `logoBase64`, `watermarkText`, `updatedAt`).
- **Database Status**: Synchronized via `npx prisma db push` and Prisma Client generated (v5.22.0) with zero schema regressions.

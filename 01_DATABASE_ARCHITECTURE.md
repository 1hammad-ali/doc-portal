# POSTGRESQL DATABASE ARCHITECTURE & SCHEMA SPECIFICATION

## 1. Design Philosophy
- **Relational Integrity:** PostgreSQL 16 with UUID primary keys (`gen_random_uuid()`), strict foreign keys, and `TIMESTAMPTZ` for all timestamps.
- **Many-to-Many Multi-File Architecture:** One physical/scanned letter enters the system once (`letters` table) and is dynamically linked to 1 or many files (`files` table) via `letter_file_links`.
- **Granular Cross-Department Access:** A user belongs to a primary designation/post (`users`) and can be granted explicit read/write/downmark permissions across multiple departments and specific file folders (`user_department_access`, `user_folder_permissions`).
- **Soft-Delete + Forensic Audit:** Only `SUPER_ADMIN` / `ADMIN` can soft-delete (`deleted_at`, `deleted_by`, `deletion_reason`), while the original record and `audit_logs` remain preserved for forensic accountability.

---

## 2. Core Entity-Relationship Overview
1. `departments` (Hierarchical tree: Ministry/Division -> Department -> Wing -> Section)
2. `users` & `roles` (Super Admin, Department Admin, Senior Officer / Authority, Documentation Controller, Dealing Clerk, Read-Only Auditor)
3. `user_department_access` & `user_folder_permissions` (Supports 1 user managing 2+ departments or specific folders)
4. `files` (Physical/Digital File Jackets: `DEPARTMENT_FILE`, `CASE_FILE`, `PROJECT_FILE`, `PERSONAL_OFFICER_FILE`)
5. `letters` (Inward & Outward Correspondence with Diary No, Letter No, Type, Priority, OCR Text, Barcode)
6. `letter_file_links` (Maps 1 Letter -> Multiple Files with folio/page numbers inside each file)
7. `letter_downmarkings` (Hierarchical forwarding chain from PM/Secretary down to Dealing Assistant with status & SLA)
8. `physical_custody_logs` (Tracks whether the hardcopy is attached in the physical file or handed out to an officer, with return due dates)
9. `tags` & `letter_tags` (Cross-cutting project/topic tags)
10. `audit_logs` (Immutable log of every view, download, print, edit, checkout, and admin delete)

---

## 3. Complete Prisma Schema (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SystemRole {
  SUPER_ADMIN          // Full national/system control, permanent/soft delete rights, audit override
  DEPT_ADMIN           // Manages users, folders, and files within assigned departments
  EXECUTIVE_OFFICER    // PM, Secretary, Director: views dashboards, down-marks letters, approves actions
  DOC_CONTROLLER       // Diary/Dispatch intake, scanning, multi-file linking, physical custody tracking
  DEALING_ASSISTANT    // Processes down-marked letters, drafts responses, updates case notes
  AUDITOR              // Read-only access to files and forensic audit trails
}

enum FileCategory {
  MAIN_ORG_FILE        // Master organizational correspondence file
  OFFICER_FILE         // Specific officer/addressee file
  CASE_FILE            // Legal, inquiry, HR, or citizen complaint case file
  PROJECT_FILE         // Development or IT/infrastructure project file
  POLICY_FILE          // Standing orders, notifications & SROs
}

enum FileStatus {
  ACTIVE
  UNDER_ACTION
  DORMANT
  CLOSED
  ARCHIVED
}

enum CorrespondenceDirection {
  INWARD               // Received from external/internal source
  OUTWARD              // Dispatched from this department/office
  INTERNAL_MEMO        // Inter-wing note/minute sheet
}

enum LetterType {
  ACTION_REQUIRED      // Needs formal reply, approval, or execution
  CC_INFORMATION_ONLY  // Endorsed for information only (No action needed)
  NOTIFICATION_SRO     // Official Gazette, Statutory Regulatory Order, Circular
  DIRECTIVE_ORDER      // High-priority order from PM / Chief Secretary / Minister
  FINANCIAL_AUDIT      // Budget, sanction, tender, or audit para
  LEGAL_COURT_NOTICE   // Court summons, writ petition, legal opinion
  MEETING_NOTICE       // Agenda, minutes of meeting (MoM)
}

enum PriorityLevel {
  ROUTINE
  URGENT
  IMMEDIATE
  MOST_IMMEDIATE       // Top-level executive priority (24h SLA)
  SECRET_CONFIDENTIAL
}

enum LinkRole {
  PRIMARY_MASTER       // Main organizational record file
  ADDRESSEE_COPY       // File of the officer to whom letter is addressed
  CASE_RECORD          // Linked to a specific case file
  PROJECT_RECORD       // Linked to a specific project file
  CROSS_REFERENCE      // Secondary reference attachment
}

enum PhysicalCustodyStatus {
  ATTACHED_IN_FILE     // Hardcopy safely tagged/filed inside physical jacket
  ISSUED_OUT_TO_OFFICER // Pulled from physical file & handed to an officer (Alert trigger)
  IN_TRANSIT_DISPATCH  // Sent via physical messenger/dak rider
  MISSING_UNTRACED     // Flagged missing during physical audit
}

enum DownmarkStatus {
  PENDING_VIEW
  IN_PROGRESS
  COMMENTED_RETURNED
  COMPLETED_CLOSED
  ESCALATED_OVERDUE
}

model Department {
  id          String       @id @default(uuid())
  code        String       @unique // e.g., "PMO-01", "LGCDD-PMU", "FIN-BUD"
  name        String
  shortName   String
  parentId    String?
  parent      Department?  @relation("DeptHierarchy", fields: [parentId], references: [id])
  children    Department[] @relation("DeptHierarchy")
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  users       User[]
  deptAccess  UserDepartmentAccess[]
  files       GovFile[]
  letters     Letter[]
}

model User {
  id              String     @id @default(uuid())
  employeeCode    String     @unique
  fullName        String
  designation     String     // e.g., "Documentation Controller", "Deputy Secretary"
  email           String     @unique
  phone           String?
  passwordHash    String
  role            SystemRole @default(DOC_CONTROLLER)
  primaryDeptId   String
  primaryDept     Department @relation(fields: [primaryDeptId], references: [id])
  avatarUrl       String?
  isActive        Boolean    @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  deptAccess        UserDepartmentAccess[]
  folderPermissions UserFolderPermission[]
  uploadedLetters   Letter[]               @relation("UploadedBy")
  downmarksSent     LetterDownmarking[]    @relation("MarkedBy")
  downmarksReceived LetterDownmarking[]    @relation("MarkedTo")
  custodyHoldings   PhysicalCustodyLog[]   @relation("IssuedToUser")
  auditLogs         AuditLog[]
}

// Supports 1 user managing 2 or more departments seamlessly
model UserDepartmentAccess {
  id           String     @id @default(uuid())
  userId       String
  departmentId String
  canCreate    Boolean    @default(true)
  canEdit      Boolean    @default(true)
  canDownmark  Boolean    @default(false)
  canExport    Boolean    @default(true)
  grantedAt    DateTime   @default(now())

  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([userId, departmentId])
}

// Granular folder/file-level access control
model UserFolderPermission {
  id          String   @id @default(uuid())
  userId      String
  fileId      String
  canRead     Boolean  @default(true)
  canWrite    Boolean  @default(false)
  canCheckout Boolean  @default(false)
  grantedAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  file        GovFile  @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([userId, fileId])
}

// Physical + Digital File Jacket (Covers Regular Files, Cases, and Projects)
model GovFile {
  id              String       @id @default(uuid())
  fileNumber      String       @unique // e.g., "PMU/LGCDD/2026/CASE-042"
  barcode         String       @unique // Scannable Code-128 / QR barcode ID
  title           String
  description     String?
  category        FileCategory @default(MAIN_ORG_FILE)
  status          FileStatus   @default(ACTIVE)
  departmentId    String
  department      Department   @relation(fields: [departmentId], references: [id])
  custodianName   String?      // Physical almirah/rack location & clerk
  rackLocation    String?      // e.g., "Cabinet-A / Shelf-3"
  openedDate      DateTime     @default(now())
  closedDate      DateTime?
  isConfidential  Boolean      @default(false)
  deletedAt       DateTime?
  deletedById     String?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  letterLinks       LetterFileLink[]
  folderPermissions UserFolderPermission[]
}

model Letter {
  id                  String                  @id @default(uuid())
  diaryNumber         String                  @unique // Auto-generated: "DAK-2026-000841"
  referenceNumber     String?                 // Official letter number written on document
  barcode             String                  @unique // Unique barcode printed/stuck on letter
  direction           CorrespondenceDirection @default(INWARD)
  letterType          LetterType              @default(ACTION_REQUIRED)
  priority            PriorityLevel           @default(ROUTINE)
  subject             String
  briefReason         String                  // Summary/reason entered by Doc Controller
  senderName          String                  // Issuing authority / person
  senderOrganization  String                  // Ministry / Dept / External Org
  addressedToName     String                  // Primary recipient officer
  addressedToPost     String                  // Recipient designation
  letterDate          DateTime                // Date printed on letter
  receivedOrSentDate  DateTime                @default(now()) // Date arrived/dispatched
  dueDate             DateTime?               // SLA response deadline

  // Digital Storage & OCR
  storageKey          String                  // MinIO S3 object key
  originalFileName    String                  // Stored cleanly under structured title
  mimeType            String
  fileSizeBytes       Int
  sha256Checksum      String                  // Tamper-proof hash verification
  ocrExtractedText    String?                 @db.Text

  // Physical Hardcopy Verification Flags (Core Requirement)
  isAttachedInPhysicalFile Boolean            @default(true)
  physicalCustodyStatus    PhysicalCustodyStatus @default(ATTACHED_IN_FILE)
  physicalHolderName       String?            // Name/Post currently holding original paper
  physicalDueReturnDate    DateTime?          // Alert trigger if overdue

  // Ownership & Admin Soft Delete
  departmentId        String
  department          Department              @relation(fields: [departmentId], references: [id])
  uploadedById        String
  uploadedBy          User                    @relation("UploadedBy", fields: [uploadedById], references: [id])
  isClosed            Boolean                 @default(false)
  deletedAt           DateTime?               // Only Admin can populate
  deletedById         String?
  deletionReason      String?
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt

  fileLinks           LetterFileLink[]
  downmarkings        LetterDownmarking[]
  custodyLogs         PhysicalCustodyLog[]
  tags                LetterTag[]
}

// Links 1 Letter into Multiple Files simultaneously (Org File + Officer File + Case + Project)
model LetterFileLink {
  id            String   @id @default(uuid())
  letterId      String
  fileId        String
  linkRole      LinkRole @default(PRIMARY_MASTER)
  folioNumber   String?  // Physical page/folio number inside that specific file (e.g., "Folio 14-16")
  attachedNote  String?
  linkedAt      DateTime @default(now())

  letter        Letter   @relation(fields: [letterId], references: [id], onDelete: Cascade)
  file          GovFile  @relation(fields: [fileId], references: [id], onDelete: Cascade)

  @@unique([letterId, fileId])
}

// Hierarchical Down-Marking & Accountability Chain
model LetterDownmarking {
  id              String         @id @default(uuid())
  letterId        String
  sequenceOrder   Int            @default(1) // Step 1: PM -> Secy, Step 2: Secy -> Director
  markedById      String
  markedToId      String
  instructions    String         // Official minute/remarks (e.g., "Please examine & put up draft reply within 48 hrs")
  status          DownmarkStatus @default(PENDING_VIEW)
  deadline        DateTime?
  viewedAt        DateTime?
  completedAt     DateTime?
  closingRemarks  String?
  createdAt       DateTime       @default(now())

  letter          Letter         @relation(fields: [letterId], references: [id], onDelete: Cascade)
  markedBy        User           @relation("MarkedBy", fields: [markedById], references: [id])
  markedTo        User           @relation("MarkedTo", fields: [markedToId], references: [id])
}

// Tracks Physical Original Copy Removal & Return Alerts
model PhysicalCustodyLog {
  id                 String    @id @default(uuid())
  letterId           String
  actionType         String    // "REMOVED_FROM_FILE" | "RETURNED_TO_FILE" | "VERIFIED_IN_FILE"
  issuedToUserId     String?
  issuedToExternal   String?   // If handed to an officer outside portal
  purpose            String    // e.g., "Required for Cabinet Briefing / Signature"
  checkedOutAt       DateTime  @default(now())
  expectedReturnAt   DateTime
  returnedAt         DateTime?
  verifiedByClerkId  String

  letter             Letter    @relation(fields: [letterId], references: [id], onDelete: Cascade)
  issuedToUser       User?     @relation("IssuedToUser", fields: [issuedToUserId], references: [id])
}

model Tag {
  id        String      @id @default(uuid())
  name      String      @unique
  colorHex  String      @default("#0F5132")
  letters   LetterTag[]
}

model LetterTag {
  letterId String
  tagId    String
  letter   Letter @relation(fields: [letterId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([letterId, tagId])
}

// Immutable Forensic Access & Action Ledger
model AuditLog {
  id           String   @id @default(uuid())
  userId       String
  action       String   // "VIEW_DOCUMENT", "DOWNLOAD_PDF", "CREATE_LETTER", "DOWNMARK", "CHECKOUT_PHYSICAL", "ADMIN_DELETE"
  entityType   String   // "LETTER", "FILE", "USER", "DEPARTMENT"
  entityId     String
  ipAddress    String?
  userAgent    String?
  metadata     Json?    // Stores before/after state or target recipient
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])

  @@index([entityType, entityId])
  @@index([userId, createdAt])
}
```

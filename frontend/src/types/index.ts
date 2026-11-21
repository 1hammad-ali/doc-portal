export type SystemRole =
  | 'SUPER_ADMIN'
  | 'DEPT_ADMIN'
  | 'EXECUTIVE_OFFICER'
  | 'DOC_CONTROLLER'
  | 'DEALING_ASSISTANT'
  | 'AUDITOR';

export type FileCategory =
  | 'MAIN_ORG_FILE'
  | 'OFFICER_FILE'
  | 'CASE_FILE'
  | 'PROJECT_FILE'
  | 'POLICY_FILE';

export type FileStatus =
  | 'ACTIVE'
  | 'UNDER_ACTION'
  | 'DORMANT'
  | 'CLOSED'
  | 'ARCHIVED';

export type CorrespondenceDirection =
  | 'INWARD'
  | 'OUTWARD'
  | 'INTERNAL_MEMO';

export type LetterType =
  | 'ACTION_REQUIRED'
  | 'CC_INFORMATION_ONLY'
  | 'NOTIFICATION_SRO'
  | 'DIRECTIVE_ORDER'
  | 'FINANCIAL_AUDIT'
  | 'LEGAL_COURT_NOTICE'
  | 'MEETING_NOTICE';

export type PriorityLevel =
  | 'ROUTINE'
  | 'URGENT'
  | 'IMMEDIATE'
  | 'MOST_IMMEDIATE'
  | 'SECRET_CONFIDENTIAL';

export type LinkRole =
  | 'PRIMARY_MASTER'
  | 'ADDRESSEE_COPY'
  | 'CASE_RECORD'
  | 'PROJECT_RECORD'
  | 'CROSS_REFERENCE';

export type PhysicalCustodyStatus =
  | 'ATTACHED_IN_FILE'
  | 'ISSUED_OUT_TO_OFFICER'
  | 'IN_TRANSIT_DISPATCH'
  | 'MISSING_UNTRACED';

export type DownmarkStatus =
  | 'PENDING_VIEW'
  | 'IN_PROGRESS'
  | 'COMMENTED_RETURNED'
  | 'COMPLETED_CLOSED'
  | 'ESCALATED_OVERDUE';

export interface Department {
  id: string;
  code: string;
  name: string;
  shortName: string;
  parentId?: string | null;
  parent?: Department | null;
  children?: Department[];
  isActive: boolean;
}

export interface User {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  email: string;
  phone?: string | null;
  role: SystemRole;
  primaryDeptId: string;
  primaryDept?: Department;
  avatarUrl?: string | null;
  isActive: boolean;
  deptAccess?: UserDepartmentAccess[];
}

export interface UserDepartmentAccess {
  id: string;
  userId: string;
  departmentId: string;
  department?: Department;
  canCreate: boolean;
  canEdit: boolean;
  canDownmark: boolean;
  canExport: boolean;
}

export interface GovFile {
  id: string;
  fileNumber: string;
  barcode: string;
  title: string;
  description?: string | null;
  category: FileCategory;
  status: FileStatus;
  departmentId: string;
  department?: Department;
  custodianName?: string | null;
  rackLocation?: string | null;
  openedDate: string;
  closedDate?: string | null;
  isConfidential: boolean;
  _count?: {
    letterLinks: number;
  };
}

export interface LetterFileLink {
  id: string;
  letterId: string;
  fileId: string;
  linkRole: LinkRole;
  folioNumber?: string | null;
  attachedNote?: string | null;
  linkedAt: string;
  file: GovFile;
}

export interface LetterDownmarking {
  id: string;
  letterId: string;
  sequenceOrder: number;
  markedById: string;
  markedToId: string;
  instructions: string;
  status: DownmarkStatus;
  deadline?: string | null;
  viewedAt?: string | null;
  completedAt?: string | null;
  closingRemarks?: string | null;
  createdAt: string;
  markedBy: User;
  markedTo: User;
}

export interface PhysicalCustodyLog {
  id: string;
  letterId: string;
  actionType: string;
  issuedToUserId?: string | null;
  issuedToExternal?: string | null;
  purpose: string;
  checkedOutAt: string;
  expectedReturnAt: string;
  returnedAt?: string | null;
  verifiedByClerkId: string;
  issuedToUser?: User | null;
}

export interface Tag {
  id: string;
  name: string;
  colorHex: string;
}

export interface Letter {
  id: string;
  diaryNumber: string;
  referenceNumber?: string | null;
  barcode: string;
  direction: CorrespondenceDirection;
  letterType: LetterType;
  priority: PriorityLevel;
  subject: string;
  briefReason: string;
  senderName: string;
  senderOrganization: string;
  addressedToName: string;
  addressedToPost: string;
  letterDate: string;
  receivedOrSentDate: string;
  dueDate?: string | null;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  ocrExtractedText?: string | null;
  isAttachedInPhysicalFile: boolean;
  physicalCustodyStatus: PhysicalCustodyStatus;
  physicalHolderName?: string | null;
  physicalDueReturnDate?: string | null;
  departmentId: string;
  department?: Department;
  uploadedById: string;
  uploadedBy?: User;
  isClosed: boolean;
  fileLinks?: LetterFileLink[];
  downmarkings?: LetterDownmarking[];
  custodyLogs?: PhysicalCustodyLog[];
  tags?: { tag: Tag }[];
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  createdAt: string;
  user?: User;
}

export interface DashboardKPIs {
  totalInwardToday: number;
  totalOutwardToday: number;
  pendingDownmarkedCount: number;
  urgentDownmarkedCount: number;
  checkedOutPhysicalCount: number;
  overdueCustodyCount: number;
  activeCasesAndProjectsCount: number;
  slaComplianceRate: number;
}

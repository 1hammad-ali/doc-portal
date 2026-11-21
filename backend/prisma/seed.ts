import { PrismaClient, SystemRole, FileCategory, FileStatus, CorrespondenceDirection, LetterType, PriorityLevel, LinkRole, PhysicalCustodyStatus, DownmarkStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Initializing GovEDMS National Database Seeding...');

  // Hash standard government development password
  const defaultPassword = await bcrypt.hash('GovSecurePassword2026!', 10);

  // 1. Clean existing records in correct foreign-key order
  await prisma.auditLog.deleteMany({});
  await prisma.physicalCustodyLog.deleteMany({});
  await prisma.letterDownmarking.deleteMany({});
  await prisma.letterTag.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.letterFileLink.deleteMany({});
  await prisma.userFolderPermission.deleteMany({});
  await prisma.letter.deleteMany({});
  await prisma.govFile.deleteMany({});
  await prisma.userDepartmentAccess.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Seed Departments Hierarchy
  console.log('🏢 Seeding Sovereign Departments Hierarchy...');
  
  const pmo = await prisma.department.create({
    data: {
      code: 'PMO-01',
      name: "Prime Minister's Secretariat",
      shortName: 'PM Secretariat',
      isActive: true,
    },
  });

  const cabinetDiv = await prisma.department.create({
    data: {
      code: 'CAB-DIV',
      name: 'Cabinet Division, Federal Secretariat',
      shortName: 'Cabinet Division',
      parentId: pmo.id,
      isActive: true,
    },
  });

  const lgCdd = await prisma.department.create({
    data: {
      code: 'LGCDD-MIN',
      name: 'Ministry of Local Government & Community Development',
      shortName: 'LG&CDD',
      parentId: pmo.id,
      isActive: true,
    },
  });

  const pmu = await prisma.department.create({
    data: {
      code: 'LGCDD-PMU',
      name: 'Program Management Unit (PMU) — Urban & Infrastructure',
      shortName: 'PMU Head Office',
      parentId: lgCdd.id,
      isActive: true,
    },
  });

  const adminDept = await prisma.department.create({
    data: {
      code: 'PMU-ADMIN',
      name: 'Central Administration & Diary Dispatch Section',
      shortName: 'Central Dak Section',
      parentId: pmu.id,
      isActive: true,
    },
  });

  const finDept = await prisma.department.create({
    data: {
      code: 'PMU-FIN',
      name: 'Finance, Accounts & Audit Compliance Wing',
      shortName: 'Finance Wing',
      parentId: pmu.id,
      isActive: true,
    },
  });

  const legalDept = await prisma.department.create({
    data: {
      code: 'PMU-LEGAL',
      name: 'Legal Affairs, Litigation & Court Compliance Cell',
      shortName: 'Legal Cell',
      parentId: pmu.id,
      isActive: true,
    },
  });

  // 3. Seed Users Across Roles
  console.log('👤 Seeding Executive Government Users...');

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      employeeCode: 'EMP-001',
      fullName: 'Malik Tariq Aziz',
      designation: 'Chief Information Officer & National System Controller',
      email: 'superadmin@govedms.gov',
      phone: '+92 51 9201001',
      passwordHash: defaultPassword,
      role: SystemRole.SUPER_ADMIN,
      primaryDeptId: pmo.id,
      isActive: true,
    },
  });

  // Executive Officer (Federal Secretary)
  const secretary = await prisma.user.create({
    data: {
      employeeCode: 'EMP-002',
      fullName: 'Dr. Ayesha Noor, PAS',
      designation: 'Federal Secretary to Government',
      email: 'secretary@govedms.gov',
      phone: '+92 51 9202002',
      passwordHash: defaultPassword,
      role: SystemRole.EXECUTIVE_OFFICER,
      primaryDeptId: lgCdd.id,
      isActive: true,
    },
  });

  // Department Admin (Project Director)
  const director = await prisma.user.create({
    data: {
      employeeCode: 'EMP-003',
      fullName: 'Engr. Salman Farooq',
      designation: 'Project Director / Additional Secretary',
      email: 'director@govedms.gov',
      phone: '+92 42 99203003',
      passwordHash: defaultPassword,
      role: SystemRole.DEPT_ADMIN,
      primaryDeptId: pmu.id,
      isActive: true,
    },
  });

  // Documentation Controller (Central Dak & Diary Officer)
  const docController = await prisma.user.create({
    data: {
      employeeCode: 'EMP-004',
      fullName: 'Muhammad Rizwan',
      designation: 'Senior Documentation Controller & Diary Officer',
      email: 'doccontroller@govedms.gov',
      phone: '+92 42 99203004',
      passwordHash: defaultPassword,
      role: SystemRole.DOC_CONTROLLER,
      primaryDeptId: adminDept.id,
      isActive: true,
    },
  });

  // Dealing Assistant
  const dealingAssistant = await prisma.user.create({
    data: {
      employeeCode: 'EMP-005',
      fullName: 'Khurram Shahzad',
      designation: 'Assistant Director (Technical) / Dealing Officer',
      email: 'dealing@govedms.gov',
      phone: '+92 42 99203005',
      passwordHash: defaultPassword,
      role: SystemRole.DEALING_ASSISTANT,
      primaryDeptId: pmu.id,
      isActive: true,
    },
  });

  // Auditor
  const auditor = await prisma.user.create({
    data: {
      employeeCode: 'EMP-006',
      fullName: 'Saira Banu',
      designation: 'Senior Audit Inspector (Auditor General Wing)',
      email: 'auditor@govedms.gov',
      phone: '+92 51 9206006',
      passwordHash: defaultPassword,
      role: SystemRole.AUDITOR,
      primaryDeptId: finDept.id,
      isActive: true,
    },
  });

  // 4. Multi-Department User Access Setup
  console.log('🔐 Configuring Multi-Department & Folder Access...');
  
  // Project Director manages PMU, Finance, and Legal
  await prisma.userDepartmentAccess.createMany({
    data: [
      { userId: director.id, departmentId: pmu.id, canCreate: true, canEdit: true, canDownmark: true, canExport: true },
      { userId: director.id, departmentId: finDept.id, canCreate: true, canEdit: true, canDownmark: true, canExport: true },
      { userId: director.id, departmentId: legalDept.id, canCreate: true, canEdit: true, canDownmark: true, canExport: true },
      { userId: docController.id, departmentId: adminDept.id, canCreate: true, canEdit: true, canDownmark: true, canExport: true },
      { userId: docController.id, departmentId: pmu.id, canCreate: true, canEdit: true, canDownmark: false, canExport: true },
    ],
  });

  // 5. Seed File Jackets (Regular, Case Files, Projects, Policy)
  console.log('📁 Seeding File Jackets (Cases & Projects)...');

  const file1 = await prisma.govFile.create({
    data: {
      fileNumber: 'PMU/ADMIN/2026/001-GEN',
      barcode: 'FILE-2026-000101',
      title: 'Master Organizational Correspondence & Central Dak Register 2026',
      description: 'Central chronological file jacket for all general correspondence and administrative circulars.',
      category: FileCategory.MAIN_ORG_FILE,
      status: FileStatus.ACTIVE,
      departmentId: adminDept.id,
      custodianName: 'Muhammad Rizwan (Doc Controller)',
      rackLocation: 'Almirah 4, Shelf B-1',
      isConfidential: false,
    },
  });

  const file2 = await prisma.govFile.create({
    data: {
      fileNumber: 'PMU/PD/OFFICER/2026/012',
      barcode: 'FILE-2026-000102',
      title: 'Project Director Executive Secretarial File',
      description: 'Addressee personal jacket for notes and direct instructions marked to Project Director.',
      category: FileCategory.OFFICER_FILE,
      status: FileStatus.ACTIVE,
      departmentId: pmu.id,
      custodianName: 'Private Secretary to PD',
      rackLocation: 'Room 101, Executive Secure Cabinet',
      isConfidential: true,
    },
  });

  const file3 = await prisma.govFile.create({
    data: {
      fileNumber: 'PMU/LEGAL/2026/CASE-042',
      barcode: 'FILE-2026-000103',
      title: 'Writ Petition No. 1420/2026: Municipal Land Encroachment Dispute',
      description: 'Litigation dossier before High Court regarding commercial land encroachment at Sector G.',
      category: FileCategory.CASE_FILE,
      status: FileStatus.UNDER_ACTION,
      departmentId: legalDept.id,
      custodianName: 'Assistant Director Legal',
      rackLocation: 'Legal Archives, Almirah L-2',
      isConfidential: false,
    },
  });

  const file4 = await prisma.govFile.create({
    data: {
      fileNumber: 'PMU/DEV/2026/PROJ-108',
      barcode: 'FILE-2026-000104',
      title: 'Urban Infrastructure & Solid Waste Modernization Project',
      description: 'Capital development project financed under Public Sector Development Programme (PSDP).',
      category: FileCategory.PROJECT_FILE,
      status: FileStatus.ACTIVE,
      departmentId: pmu.id,
      custodianName: 'Executive Engineer Infrastructure',
      rackLocation: 'Engineering Bay 7, Cabinet E',
      isConfidential: false,
    },
  });

  const file5 = await prisma.govFile.create({
    data: {
      fileNumber: 'PMO/POL/2026/SRO-007',
      barcode: 'FILE-2026-000105',
      title: 'Standing Orders & Digital Governance Guidelines (SRO 2026)',
      description: 'Gazette notifications, regulatory orders, and paperless secretariat standing policies.',
      category: FileCategory.POLICY_FILE,
      status: FileStatus.ACTIVE,
      departmentId: pmo.id,
      custodianName: 'Registrar PM Secretariat',
      rackLocation: 'Policy Vault, Shelf Alpha',
      isConfidential: false,
    },
  });

  // 6. Seed Tags
  console.log('🏷️ Seeding Topic & Priority Tags...');
  const tagUrgent = await prisma.tag.create({ data: { name: 'Urgent Action', colorHex: '#B42318' } });
  const tagPMO = await prisma.tag.create({ data: { name: 'PM Secretariat Directive', colorHex: '#C59B27' } });
  const tagAudit = await prisma.tag.create({ data: { name: 'Audit Compliance', colorHex: '#0B4F32' } });
  const tagLegal = await prisma.tag.create({ data: { name: 'Court Matter', colorHex: '#7A271A' } });

  // 7. Seed Letters with Multi-File Linking & Downmarking
  console.log('✉️ Seeding Letters with Multi-File Junction Links...');

  // Letter 1: High Priority PM Directive (Linked to 3 Files: Main Org + Officer File + Project File)
  const letter1 = await prisma.letter.create({
    data: {
      diaryNumber: 'DAK-2026-001001',
      referenceNumber: 'PMO/DIR/2026/894',
      barcode: 'LTR-2026-001001',
      direction: CorrespondenceDirection.INWARD,
      letterType: LetterType.DIRECTIVE_ORDER,
      priority: PriorityLevel.MOST_IMMEDIATE,
      subject: 'Immediate Directive: Accelerated Review of Urban Infrastructure Project Milestones',
      briefReason: 'Prime Minister directive instructing 48-hour compliance review of development funds and civil works.',
      senderName: 'Principal Secretary to the Prime Minister',
      senderOrganization: "Prime Minister's Secretariat, Islamabad",
      addressedToName: 'Dr. Ayesha Noor, PAS',
      addressedToPost: 'Federal Secretary, LG&CDD',
      letterDate: new Date('2026-11-18T09:00:00Z'),
      receivedOrSentDate: new Date('2026-11-18T10:30:00Z'),
      dueDate: new Date('2026-11-22T17:00:00Z'),
      storageKey: 'documents/2026/11/DAK-2026-001001_DIRECTIVE_ORDER_PM-Directive-Urban-Review_2026-11-18.pdf',
      originalFileName: 'DAK-2026-001001_DIRECTIVE_ORDER_PM-Directive-Urban-Review_2026-11-18.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 245812,
      sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      ocrExtractedText: 'GOVERNMENT OF THE FEDERATION. PRIME MINISTERS SECRETARIAT. SUBJECT: ACCELERATED REVIEW OF INFRASTRUCTURE MILESTONES. The Prime Minister has been pleased to direct that all provincial and federal executing agencies furnish progress reports within 48 hours...',
      isAttachedInPhysicalFile: true,
      physicalCustodyStatus: PhysicalCustodyStatus.ATTACHED_IN_FILE,
      physicalHolderName: null,
      physicalDueReturnDate: null,
      departmentId: adminDept.id,
      uploadedById: docController.id,
      isClosed: false,
    },
  });

  // Link Letter 1 to 3 files simultaneously
  await prisma.letterFileLink.createMany({
    data: [
      {
        letterId: letter1.id,
        fileId: file1.id,
        linkRole: LinkRole.PRIMARY_MASTER,
        folioNumber: 'Folio 14-16',
        attachedNote: 'Filed in central chronological register.',
      },
      {
        letterId: letter1.id,
        fileId: file2.id,
        linkRole: LinkRole.ADDRESSEE_COPY,
        folioNumber: 'Folio 04',
        attachedNote: 'Copy tagged for Project Director executive briefing.',
      },
      {
        letterId: letter1.id,
        fileId: file4.id,
        linkRole: LinkRole.PROJECT_RECORD,
        folioNumber: 'Folio 52-54',
        attachedNote: 'Directly applicable to Milestone 3 civil work timelines.',
      },
    ],
  });

  // Attach Tags
  await prisma.letterTag.createMany({
    data: [
      { letterId: letter1.id, tagId: tagUrgent.id },
      { letterId: letter1.id, tagId: tagPMO.id },
    ],
  });

  // Downmarking Chain for Letter 1: Secretary -> Project Director -> Dealing Assistant
  const downmark1 = await prisma.letterDownmarking.create({
    data: {
      letterId: letter1.id,
      sequenceOrder: 1,
      markedById: secretary.id,
      markedToId: director.id,
      instructions: 'Please urgently examine and prepare a consolidated briefing note for the PM Secretariat by tomorrow noon.',
      status: DownmarkStatus.IN_PROGRESS,
      deadline: new Date('2026-11-20T12:00:00Z'),
      viewedAt: new Date('2026-11-18T11:15:00Z'),
    },
  });

  await prisma.letterDownmarking.create({
    data: {
      letterId: letter1.id,
      sequenceOrder: 2,
      markedById: director.id,
      markedToId: dealingAssistant.id,
      instructions: 'Khurram, compile expenditure and physical verification sheets for Project 108 immediately and place on my desk.',
      status: DownmarkStatus.PENDING_VIEW,
      deadline: new Date('2026-11-20T10:00:00Z'),
    },
  });

  // Letter 2: Legal Court Notice with Physical Copy CHECKED OUT & OVERDUE (Triggers Red Alert)
  console.log('🚨 Seeding Overdue Physical Custody Alert Record...');

  const letter2 = await prisma.letter.create({
    data: {
      diaryNumber: 'DAK-2026-001002',
      referenceNumber: 'HC/WP-1420/2026',
      barcode: 'LTR-2026-001002',
      direction: CorrespondenceDirection.INWARD,
      letterType: LetterType.LEGAL_COURT_NOTICE,
      priority: PriorityLevel.IMMEDIATE,
      subject: 'High Court Notice: Urgent Hearing in Land Encroachment Matter (WP 1420/2026)',
      briefReason: 'Summons from Registrar High Court requiring appearance of Project Director along with original revenue record.',
      senderName: 'Deputy Registrar (Judicial)',
      senderOrganization: 'High Court of Judicature',
      addressedToName: 'Engr. Salman Farooq',
      addressedToPost: 'Project Director, PMU',
      letterDate: new Date('2026-11-15T08:00:00Z'),
      receivedOrSentDate: new Date('2026-11-15T10:00:00Z'),
      dueDate: new Date('2026-11-23T09:30:00Z'),
      storageKey: 'documents/2026/11/DAK-2026-001002_LEGAL_COURT_NOTICE_High-Court-Notice-WP-1420_2026-11-15.pdf',
      originalFileName: 'DAK-2026-001002_LEGAL_COURT_NOTICE_High-Court-Notice-WP-1420_2026-11-15.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 412090,
      sha256Checksum: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      ocrExtractedText: 'IN THE HIGH COURT OF JUDICATURE. WRIT PETITION NO. 1420 OF 2026. NOTICE TO RESPONDENTS. TAKE NOTICE that the above titled petition came on for hearing before the Honourable Court...',
      // PHYSICAL CUSTODY OVERDUE STATE:
      isAttachedInPhysicalFile: false,
      physicalCustodyStatus: PhysicalCustodyStatus.ISSUED_OUT_TO_OFFICER,
      physicalHolderName: 'Engr. Salman Farooq (Project Director)',
      physicalDueReturnDate: new Date('2026-11-19T17:00:00Z'), // Past date => OVERDUE ALERT!
      departmentId: legalDept.id,
      uploadedById: docController.id,
      isClosed: false,
    },
  });

  // Link Letter 2 to Case File & Master File
  await prisma.letterFileLink.createMany({
    data: [
      {
        letterId: letter2.id,
        fileId: file3.id,
        linkRole: LinkRole.CASE_RECORD,
        folioNumber: 'Folio 01-04',
        attachedNote: 'Core court notice in active litigation case file.',
      },
      {
        letterId: letter2.id,
        fileId: file1.id,
        linkRole: LinkRole.PRIMARY_MASTER,
        folioNumber: 'Folio 22-25',
        attachedNote: 'Central legal correspondence record.',
      },
    ],
  });

  await prisma.letterTag.create({
    data: { letterId: letter2.id, tagId: tagLegal.id },
  });

  // Create Physical Custody Log showing it was checked out and is now overdue
  await prisma.physicalCustodyLog.create({
    data: {
      letterId: letter2.id,
      actionType: 'REMOVED_FROM_FILE',
      issuedToUserId: director.id,
      issuedToExternal: null,
      purpose: 'Original hardcopy pulled for Advocate General legal conference and court attendance.',
      checkedOutAt: new Date('2026-11-16T14:00:00Z'),
      expectedReturnAt: new Date('2026-11-19T17:00:00Z'),
      returnedAt: null,
      verifiedByClerkId: docController.id,
    },
  });

  // Letter 3: Routine Notification / Information Only (No Action Required)
  const letter3 = await prisma.letter.create({
    data: {
      diaryNumber: 'DAK-2026-001003',
      referenceNumber: 'FD/REG-2026/304',
      barcode: 'LTR-2026-001003',
      direction: CorrespondenceDirection.INWARD,
      letterType: LetterType.CC_INFORMATION_ONLY,
      priority: PriorityLevel.ROUTINE,
      subject: 'Notification: Revision of Travelling Allowance & Per Diem Rates for Government Officers',
      briefReason: 'Finance Division circular notifying new standard per diem and travel reimbursement rates.',
      senderName: 'Deputy Secretary (Regulations)',
      senderOrganization: 'Finance Division, Government of the Federation',
      addressedToName: 'All Heads of Attached Departments',
      addressedToPost: 'Heads of Departments & PMUs',
      letterDate: new Date('2026-11-10T10:00:00Z'),
      receivedOrSentDate: new Date('2026-11-12T11:00:00Z'),
      dueDate: null,
      storageKey: 'documents/2026/11/DAK-2026-001003_CC_INFORMATION_ONLY_Revision-Per-Diem-Rates_2026-11-10.pdf',
      originalFileName: 'DAK-2026-001003_CC_INFORMATION_ONLY_Revision-Per-Diem-Rates_2026-11-10.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 184520,
      sha256Checksum: '9f8e7d6c5b4a3928170e1d2c3b4a596877e6d5c4b3a219081726354433221100',
      ocrExtractedText: 'GOVERNMENT OF THE FEDERATION. FINANCE DIVISION (REGULATIONS WING). NOTIFICATION. The competent authority has approved revised rates of Travelling Allowance...',
      isAttachedInPhysicalFile: true,
      physicalCustodyStatus: PhysicalCustodyStatus.ATTACHED_IN_FILE,
      departmentId: finDept.id,
      uploadedById: docController.id,
      isClosed: true,
    },
  });

  await prisma.letterFileLink.createMany({
    data: [
      {
        letterId: letter3.id,
        fileId: file1.id,
        linkRole: LinkRole.PRIMARY_MASTER,
        folioNumber: 'Folio 29-30',
        attachedNote: 'Central administrative register.',
      },
      {
        letterId: letter3.id,
        fileId: file5.id,
        linkRole: LinkRole.CROSS_REFERENCE,
        folioNumber: 'Folio 12',
        attachedNote: 'Archived in Standing Orders & Policy folder.',
      },
    ],
  });

  // 8. Seed Audit Logs for Compliance Ledger
  console.log('📜 Seeding Forensic Audit Trail...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: 'SYSTEM_INITIALIZATION',
        entityType: 'SYSTEM',
        entityId: 'SYSTEM-ROOT',
        ipAddress: '10.0.0.1',
        userAgent: 'GovEDMS Deployment Engine/1.0',
        metadata: { status: 'Database seeded with initial ministries and baseline roles' },
      },
      {
        userId: docController.id,
        action: 'CREATE_LETTER',
        entityType: 'LETTER',
        entityId: letter1.id,
        ipAddress: '192.168.10.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GovEDMS Intake Console',
        metadata: { diaryNumber: letter1.diaryNumber, linkedFilesCount: 3 },
      },
      {
        userId: docController.id,
        action: 'CHECKOUT_PHYSICAL',
        entityType: 'LETTER',
        entityId: letter2.id,
        ipAddress: '192.168.10.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GovEDMS Intake Console',
        metadata: { issuedTo: 'Engr. Salman Farooq', purpose: 'Court Hearing Conference' },
      },
      {
        userId: secretary.id,
        action: 'DOWNMARK',
        entityType: 'LETTER',
        entityId: letter1.id,
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) GovEDMS Executive',
        metadata: { markedTo: 'Engr. Salman Farooq', deadline: '2026-11-20T12:00:00Z' },
      },
    ],
  });

  console.log('✅ Seeding Completed Successfully!');
  console.log('================================================================');
  console.log('🏛️  GovEDMS Enterprise Credentials & Baseline Accounts:');
  console.log('----------------------------------------------------------------');
  console.log('1. Super Admin:        superadmin@govedms.gov    (GovSecurePassword2026!)');
  console.log('2. Federal Secretary:  secretary@govedms.gov     (GovSecurePassword2026!)');
  console.log('3. Project Director:   director@govedms.gov      (GovSecurePassword2026!)');
  console.log('4. Doc Controller:     doccontroller@govedms.gov (GovSecurePassword2026!)');
  console.log('5. Dealing Assistant:  dealing@govedms.gov       (GovSecurePassword2026!)');
  console.log('6. Senior Auditor:     auditor@govedms.gov       (GovSecurePassword2026!)');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

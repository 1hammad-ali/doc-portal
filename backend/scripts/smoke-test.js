/**
 * GovEDMS End-to-End Automated Verification & Smoke Test Suite
 * Tests all required Phase 1 - Phase 5 flows against real running services.
 */

const BASE_URL = 'http://localhost:4000/api/v1';
const OCR_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

let authToken = '';
let currentUserId = '';
let createdFileId = '';
let createdLetterId = '';
let createdDownmarkId = '';
let createdLetterBarcode = '';
let createdFileBarcode = '';

async function run() {
  console.log('🏛️  Starting GovEDMS End-to-End Autonomous Smoke Tests...\n');

  try {
    // 0. Verify Frontend & OCR microservices
    console.log('[Test 0] Checking Service Healths...');
    const feRes = await fetch(FRONTEND_URL);
    if (!feRes.ok) throw new Error(`Frontend returned status ${feRes.status}`);
    console.log(`  ✅ Frontend Portal is ONLINE (status ${feRes.status})`);

    const ocrRes = await fetch(`${OCR_URL}/health`);
    if (!ocrRes.ok) throw new Error(`OCR service returned status ${ocrRes.status}`);
    const ocrHealth = await ocrRes.json();
    console.log(`  ✅ OCR & Barcode Microservice is ONLINE: ${JSON.stringify(ocrHealth)}`);

    const apiHealth = await fetch(`${BASE_URL}/health`);
    if (!apiHealth.ok) throw new Error(`Backend API returned status ${apiHealth.status}`);
    const apiData = await apiHealth.json();
    console.log(`  ✅ Backend Express API is ONLINE: ${apiData.service}\n`);

    // 1. Authentication
    console.log('[Test 1] Logging in as Super Admin (superadmin@govedms.gov)...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@govedms.gov',
        password: 'GovSecurePassword2026!',
      }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${await loginRes.text()}`);
    const loginData = await loginRes.json();
    authToken = loginData.token;
    currentUserId = loginData.user.id;
    console.log(`  ✅ Logged in successfully! Role: ${loginData.user.role}, Name: ${loginData.user.fullName}\n`);

    const authHeaders = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    // 2. Dashboard KPIs & Overdue Custody Alerts
    console.log('[Test 2] Fetching Live Dashboard KPIs...');
    const kpiRes = await fetch(`${BASE_URL}/dashboard/kpis`, { headers: authHeaders });
    if (!kpiRes.ok) throw new Error(`KPI fetch failed: ${await kpiRes.text()}`);
    const kpis = await kpiRes.json();
    console.log(`  ✅ Dashboard KPIs received:`);
    console.log(`     - Total Dak Today: ${kpis.totalDakToday}`);
    console.log(`     - Pending Downmarked: ${kpis.pendingDownmarkedCount}`);
    console.log(`     - Urgent Letters: ${kpis.urgentLettersCount}`);
    console.log(`     - Checked-out Physical Originals: ${kpis.checkedOutPhysicalCount}`);
    console.log(`     - Overdue Physical Custody Alerts: ${kpis.overdueCustodyCount}\n`);

    // 3. Overdue Custody Check
    console.log('[Test 3] Fetching Overdue Custody Letters...');
    const custodyRes = await fetch(`${BASE_URL}/custody/overdue`, { headers: authHeaders });
    if (!custodyRes.ok) throw new Error(`Custody fetch failed: ${await custodyRes.text()}`);
    const overdueList = await custodyRes.json();
    console.log(`  ✅ Overdue letters count: ${overdueList.length}`);
    if (overdueList.length > 0) {
      console.log(`     - Sample Overdue Letter: ${overdueList[0].diaryNumber} (Holder: ${overdueList[0].physicalHolderName})`);
    }
    console.log('');

    // 4. Create Department Case File
    console.log('[Test 4] Creating a new Case File under LGCDD-MIN...');
    // Find LGCDD-MIN department id
    const deptRes = await fetch(`${BASE_URL}/departments`, { headers: authHeaders });
    const deptData = await deptRes.json();
    const depts = Array.isArray(deptData) ? deptData : (deptData.all || deptData.departments || []);
    const lgcdd = depts.find((d) => d.code === 'LGCDD-MIN') || depts[0];

    const filePayload = {
      title: 'Investigation into Solar Streetlight Procurement Discrepancies',
      description: 'High-priority inquiry dossier into Division-III vendor tenders',
      category: 'CASE_FILE',
      departmentId: lgcdd.id,
      custodianName: 'Assistant Director (Legal)',
      rackLocation: 'Room 402, Cabinet L-3',
      isConfidential: true,
    };

    const createFileRes = await fetch(`${BASE_URL}/files`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(filePayload),
    });
    if (!createFileRes.ok) throw new Error(`File creation failed: ${await createFileRes.text()}`);
    const createdFile = await createFileRes.json();
    createdFileId = createdFile.id;
    createdFileBarcode = createdFile.barcode;
    console.log(`  ✅ Case File Created successfully:`);
    console.log(`     - File Number: ${createdFile.fileNumber}`);
    console.log(`     - Barcode: ${createdFile.barcode}`);
    console.log(`     - Category: ${createdFile.category}\n`);

    // 5. Create Dak Letter with Multi-File Linking
    console.log('[Test 5] Inward Dak Intake with Multi-File Linking & Checksum...');
    const existingFilesRes = await fetch(`${BASE_URL}/files`, { headers: authHeaders });
    const allFiles = await existingFilesRes.json();
    const secondFile = allFiles.find((f) => f.id !== createdFileId) || allFiles[0];

    const letterPayload = {
      direction: 'INWARD',
      letterType: 'LEGAL_COURT_NOTICE',
      priority: 'MOST_IMMEDIATE',
      subject: 'Supreme Court Summons Regarding Solar Lighting Tender Writ #4928/2026',
      briefReason: 'Formal notice to Secretary LGCDD to submit parawise comments within 72 hours',
      senderName: 'Registrar, Supreme Court of Pakistan',
      senderOrganization: 'Supreme Court of Pakistan',
      addressedToName: 'Federal Secretary',
      addressedToPost: 'Secretary LGCDD',
      referenceNumber: 'SC/Writ-4928/2026-Notice',
      departmentId: lgcdd.id,
      isAttachedInPhysicalFile: 'true',
      fileLinks: JSON.stringify([
        {
          fileId: createdFileId,
          linkRole: 'PRIMARY_MASTER',
          folioNumber: 'Folio 1/A',
          attachedNote: 'Original summons envelope attached in physical dossier',
        },
        {
          fileId: secondFile.id,
          linkRole: 'CROSS_REFERENCE',
          folioNumber: 'Folio 84/C',
          attachedNote: 'Cross-referenced in Ministerial master record',
        },
      ]),
    };

    const createLetterRes = await fetch(`${BASE_URL}/letters`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(letterPayload),
    });
    if (!createLetterRes.ok) throw new Error(`Letter intake failed: ${await createLetterRes.text()}`);
    const createdLetter = await createLetterRes.json();
    createdLetterId = createdLetter.id;
    createdLetterBarcode = createdLetter.barcode;
    console.log(`  ✅ Letter Inward Intake Created:`);
    console.log(`     - Diary Number: ${createdLetter.diaryNumber}`);
    console.log(`     - Barcode: ${createdLetter.barcode}`);
    console.log(`     - Storage Key: ${createdLetter.storageKey}`);
    console.log(`     - SHA-256: ${createdLetter.sha256Checksum}`);
    console.log(`     - Linked Files Count: ${createdLetter.fileLinks?.length || 0}\n`);

    // 6. Hierarchical Down-Marking
    console.log('[Test 6] Down-marking letter to Dealing Assistant...');
    // Find dealing assistant user
    const usersRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    // Let's get dealing assistant user id from database through departments or auth
    // Let's login as dealing assistant to get ID or query
    const dealingLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dealing@govedms.gov',
        password: 'GovSecurePassword2026!',
      }),
    });
    const dealingData = await dealingLogin.json();
    const dealingUserId = dealingData.user.id;

    const downmarkPayload = {
      markedToId: dealingUserId,
      instructions: 'Prepare parawise comments and retrieve historical tender files immediately for Legal Directorate.',
      deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };

    const downmarkRes = await fetch(`${BASE_URL}/letters/${createdLetterId}/downmark`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(downmarkPayload),
    });
    if (!downmarkRes.ok) throw new Error(`Down-marking failed: ${await downmarkRes.text()}`);
    const downmarkObj = await downmarkRes.json();
    createdDownmarkId = downmarkObj.id;
    console.log(`  ✅ Down-marking created successfully:`);
    console.log(`     - Step Sequence: ${downmarkObj.sequenceOrder}`);
    console.log(`     - Status: ${downmarkObj.status}`);
    console.log(`     - Marked To: ${downmarkObj.markedTo?.fullName} (${downmarkObj.markedTo?.designation})\n`);

    // 7. Subordinate Officer Responding to Down-Mark
    console.log('[Test 7] Subordinate officer updating down-mark progress...');
    const dealingHeaders = {
      Authorization: `Bearer ${dealingData.token}`,
      'Content-Type': 'application/json',
    };
    const respondRes = await fetch(`${BASE_URL}/downmarkings/${createdDownmarkId}/respond`, {
      method: 'PATCH',
      headers: dealingHeaders,
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        closingRemarks: 'Retrieved tender dossier from archive; drafting parawise response.',
      }),
    });
    if (!respondRes.ok) throw new Error(`Respond failed: ${await respondRes.text()}`);
    const updatedDownmark = await respondRes.json();
    console.log(`  ✅ Down-mark status updated to: ${updatedDownmark.status}`);
    console.log(`     - Remarks: ${updatedDownmark.closingRemarks}\n`);

    // 8. Physical Hardcopy Custody: Checkout and Checkin
    console.log('[Test 8] Physical Custody: Removing original hardcopy from file jacket...');
    const checkoutPayload = {
      issuedToUserId: dealingUserId,
      purpose: 'Presented to High Court advocate for briefing session',
      expectedReturnAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    const checkoutRes = await fetch(`${BASE_URL}/letters/${createdLetterId}/physical-checkout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(checkoutPayload),
    });
    if (!checkoutRes.ok) throw new Error(`Checkout failed: ${await checkoutRes.text()}`);
    const checkoutData = await checkoutRes.json();
    console.log(`  ✅ Hardcopy Checked Out:`);
    console.log(`     - Custody Status: ${checkoutData.letter.physicalCustodyStatus}`);
    console.log(`     - Current Holder: ${checkoutData.letter.physicalHolderName}`);
    console.log(`     - Due Date: ${checkoutData.letter.physicalDueReturnDate}`);

    console.log('  Returning original hardcopy back into physical file jacket...');
    const checkinRes = await fetch(`${BASE_URL}/letters/${createdLetterId}/physical-checkin`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (!checkinRes.ok) throw new Error(`Checkin failed: ${await checkinRes.text()}`);
    const checkinData = await checkinRes.json();
    console.log(`  ✅ Hardcopy Checked In:`);
    console.log(`     - Custody Status: ${checkinData.letter.physicalCustodyStatus}`);
    console.log(`     - Attached In Physical File: ${checkinData.letter.isAttachedInPhysicalFile}\n`);

    // 9. Universal Barcode Resolver
    console.log('[Test 9] Universal Barcode Resolver...');
    console.log(`  Resolving Letter Barcode: ${createdLetterBarcode}`);
    const barcodeLetterRes = await fetch(`${BASE_URL}/barcode/${createdLetterBarcode}`, {
      headers: authHeaders,
    });
    if (!barcodeLetterRes.ok) throw new Error(`Barcode lookup for letter failed: ${await barcodeLetterRes.text()}`);
    const barcodeLetterData = await barcodeLetterRes.json();
    console.log(`  ✅ Barcode matched Type: ${barcodeLetterData.type}, Subject: ${barcodeLetterData.data.subject}`);

    console.log(`  Resolving File Barcode: ${createdFileBarcode}`);
    const barcodeFileRes = await fetch(`${BASE_URL}/barcode/${createdFileBarcode}`, {
      headers: authHeaders,
    });
    if (!barcodeFileRes.ok) throw new Error(`Barcode lookup for file failed: ${await barcodeFileRes.text()}`);
    const barcodeFileData = await barcodeFileRes.json();
    console.log(`  ✅ Barcode matched Type: ${barcodeFileData.type}, Title: ${barcodeFileData.data.title}\n`);

    // 10. Audit Log Ledger
    console.log('[Test 10] Querying Immutable Forensic Audit Trail...');
    const auditRes = await fetch(`${BASE_URL}/audit-logs?limit=10`, { headers: authHeaders });
    if (!auditRes.ok) throw new Error(`Audit log query failed: ${await auditRes.text()}`);
    const auditData = await auditRes.json();
    console.log(`  ✅ Total Audit Logs in Sovereign Ledger: ${auditData.total}`);
    console.log('  Recent recorded events:');
    auditData.logs.slice(0, 5).forEach((log) => {
      console.log(`     - [${log.action}] on [${log.entityType}] by ${log.user?.fullName} (${log.user?.role})`);
    });
    console.log('');

    // 11. Admin-Only Soft Delete with Reason
    console.log('[Test 11] Admin-Only Soft Delete with mandatory justification...');
    const deleteRes = await fetch(`${BASE_URL}/letters/${createdLetterId}`, {
      method: 'DELETE',
      headers: authHeaders,
      body: JSON.stringify({
        reason: 'Automated test cleanup: Letter duplicated during emergency dispatch simulation.',
      }),
    });
    if (!deleteRes.ok) throw new Error(`Admin delete failed: ${await deleteRes.text()}`);
    const deleteData = await deleteRes.json();
    console.log(`  ✅ Soft Delete Succeeded: ${deleteData.message}\n`);

    console.log('================================================================');
    console.log('🎉 ALL 11 END-TO-END AUTONOMOUS SMOKE TESTS PASSED PERFECTLY!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ SMOKE TEST FAILED:', error);
    process.exit(1);
  }
}

run();

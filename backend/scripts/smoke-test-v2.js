/**
 * GovEDMS v2.0 Autonomous Verification & End-to-End Smoke Test Suite
 * Tests:
 * 1. User Management & Multi-Department Access Matrix + Folder Overrides
 * 2. Interactive File Dossier Workspace & Combined PDF Merging (pdf-lib)
 * 3. Intelligent Story/Concept-Based & Archival Search with OCR/Reason Snippets
 * 4. Enhanced Physical Custody Out-Register with Officer Designation & Auto-Timestamps
 */

const BASE_URL = 'http://localhost:4000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

let adminToken = '';
let newUserId = '';
let testFileId = '';
let testLetterId = '';

async function runV2Tests() {
  console.log('🏛️  Starting GovEDMS v2.0 Enterprise Autonomous Verification...\n');

  try {
    // 0. Verify Service Statuses
    console.log('[Test 0] Verifying Frontend and Backend v2.0 Status...');
    const feRes = await fetch(FRONTEND_URL);
    if (!feRes.ok) throw new Error(`Frontend returned HTTP ${feRes.status}`);
    console.log(`  ✅ Next.js 15 Frontend is ONLINE (Status ${feRes.status})`);

    const apiHealth = await fetch(`${BASE_URL}/health`);
    if (!apiHealth.ok) throw new Error(`Backend returned HTTP ${apiHealth.status}`);
    console.log(`  ✅ Express API is ONLINE\n`);

    // 1. Authenticate as Super Admin
    console.log('[Test 1] Authenticating as Super Admin...');
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
    adminToken = loginData.token;
    console.log(`  ✅ Super Admin authenticated: ${loginData.user.fullName} (${loginData.user.role})\n`);

    const authHeaders = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    // 2. Test User Lifecycle: Create Officer
    console.log('[Test 2] User Management: Registering New Officer with Primary Designation...');
    const deptsRes = await fetch(`${BASE_URL}/departments`, { headers: authHeaders });
    const deptsData = await deptsRes.json();
    const allDepts = Array.isArray(deptsData) ? deptsData : (deptsData.all || deptsData.departments || []);
    const primaryDept = allDepts[0];

    const empCode = `EMP-${Date.now().toString().slice(-4)}`;
    const officerEmail = `officer.${empCode.toLowerCase()}@govedms.gov`;

    const createUserRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        employeeCode: empCode,
        fullName: 'Dr. Tariq Mehmood Bajwa',
        designation: 'Director General (Admin & Reforms)',
        email: officerEmail,
        phone: '+92-300-5551234',
        role: 'DEPT_ADMIN',
        primaryDeptId: primaryDept.id,
        password: 'GovSecurePassword2026!',
      }),
    });
    if (!createUserRes.ok) throw new Error(`User creation failed: ${await createUserRes.text()}`);
    const createdOfficer = await createUserRes.json();
    newUserId = createdOfficer.id;
    console.log(`  ✅ Officer Created:`);
    console.log(`     - Name & Post: ${createdOfficer.fullName} (${createdOfficer.designation})`);
    console.log(`     - Code & Email: ${createdOfficer.employeeCode} • ${createdOfficer.email}`);
    console.log(`     - Role: ${createdOfficer.role}\n`);

    // 3. Test Multi-Department Access Matrix & Folder Overrides
    console.log('[Test 3] Assigning Multi-Department Access Matrix & Folder Overrides...');
    // Target 2 departments
    const secondDept = allDepts[1] || allDepts[0];
    const permissionsPayload = [
      {
        departmentId: primaryDept.id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDownmark: true,
        canCheckoutPhysical: true,
        canExport: true,
        canDelete: true,
      },
      {
        departmentId: secondDept.id,
        canView: true,
        canCreate: true,
        canEdit: false,
        canDownmark: true,
        canCheckoutPhysical: true,
        canExport: true,
        canDelete: false,
      },
    ];

    const matrixRes = await fetch(`${BASE_URL}/users/${newUserId}/access-matrix`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ permissions: permissionsPayload }),
    });
    if (!matrixRes.ok) throw new Error(`Matrix update failed: ${await matrixRes.text()}`);
    const updatedMatrix = await matrixRes.json();
    console.log(`  ✅ Multi-Department Access Matrix Updated (${updatedMatrix.deptAccess?.length} wings authorized):`);
    updatedMatrix.deptAccess?.forEach((da) => {
      console.log(`     - Wing: ${da.department?.code} -> canView: ${da.canView}, canCreate: ${da.canCreate}, canDownmark: ${da.canDownmark}, canCheckoutPhysical: ${da.canCheckoutPhysical}`);
    });

    // Assign Folder Permission Override
    const filesRes = await fetch(`${BASE_URL}/files`, { headers: authHeaders });
    const filesList = await filesRes.json();
    const targetFile = filesList[0];
    testFileId = targetFile.id;

    const folderPermRes = await fetch(`${BASE_URL}/users/${newUserId}/folder-permissions`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        fileId: testFileId,
        canRead: true,
        canWrite: true,
        canCheckout: true,
      }),
    });
    if (!folderPermRes.ok) throw new Error(`Folder permission failed: ${await folderPermRes.text()}`);
    const folderPerm = await folderPermRes.json();
    console.log(`  ✅ Folder Permission Override Granted:`);
    console.log(`     - File: ${folderPerm.file?.fileNumber} (${folderPerm.file?.title})`);
    console.log(`     - Clearances: canRead=${folderPerm.canRead}, canWrite=${folderPerm.canWrite}, canCheckout=${folderPerm.canCheckout}\n`);

    // 4. Test Interactive Dossier View & Combined PDF Merging Engine
    console.log('[Test 4] Interactive File Dossier Workspace & "Merge into 1 PDF" Engine...');
    const dossierRes = await fetch(`${BASE_URL}/files/${testFileId}`, { headers: authHeaders });
    if (!dossierRes.ok) throw new Error(`Dossier fetch failed: ${await dossierRes.text()}`);
    const dossier = await dossierRes.json();
    console.log(`  ✅ File Dossier Retrieved:`);
    console.log(`     - File Number: ${dossier.fileNumber}`);
    console.log(`     - Category: ${dossier.category}`);
    console.log(`     - Almirah / Rack: ${dossier.rackLocation || 'General Archive'}`);
    console.log(`     - Attached Letters Count: ${dossier.letterLinks?.length || 0}`);

    if (dossier.letterLinks && dossier.letterLinks.length > 0) {
      testLetterId = dossier.letterLinks[0].letterId;
      console.log(`     - Sample Folio: ${dossier.letterLinks[0].folioNumber} -> ${dossier.letterLinks[0].letter.diaryNumber} (${dossier.letterLinks[0].letter.subject.slice(0, 45)}...)`);
    }

    console.log('  Generating Combined Dossier PDF Book via pdf-lib...');
    const mergePdfRes = await fetch(`${BASE_URL}/files/${testFileId}/merge-pdf`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    if (!mergePdfRes.ok) throw new Error(`PDF Merge failed: ${await mergePdfRes.text()}`);
    const pdfBuffer = await mergePdfRes.arrayBuffer();
    const contentType = mergePdfRes.headers.get('content-type');
    const disposition = mergePdfRes.headers.get('content-disposition');
    console.log(`  ✅ Merged Dossier PDF Generated Successfully:`);
    console.log(`     - Content-Type: ${contentType}`);
    console.log(`     - Header Disposition: ${disposition}`);
    console.log(`     - Assembled PDF Size: ${pdfBuffer.byteLength} bytes\n`);

    // 5. Test Intelligent Story / Concept-Based Search
    console.log('[Test 5] Intelligent Story / Concept-Based Search Engine...');
    const storyQueries = [
      'roads k liye jo aya tha',
      'solar streetlight tender dispute',
      'Court Notice',
    ];

    for (const sq of storyQueries) {
      const searchRes = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(sq)}`, {
        headers: authHeaders,
      });
      if (!searchRes.ok) throw new Error(`Search failed for "${sq}": ${await searchRes.text()}`);
      const searchData = await searchRes.json();
      console.log(`  🔎 Query: "${sq}"`);
      console.log(`     - Extracted Concept Tokens: [${searchData.conceptTokens.join(', ')}]`);
      console.log(`     - Matched Records: ${searchData.total}`);
      if (searchData.results.length > 0) {
        const topMatch = searchData.results[0];
        console.log(`     - Top Hit: ${topMatch.diaryNumber} | Score: ${topMatch.searchMeta?.relevanceScore} | Matched In: ${topMatch.searchMeta?.matchField}`);
        console.log(`     - Contextual Snippet: "${topMatch.searchMeta?.snippet?.slice(0, 85)}..."`);
      }
    }
    console.log('');

    // 6. Test Enhanced Physical Custody Out-Register
    console.log('[Test 6] Enhanced Physical Custody Out-Register (Auto-Timestamp & Designation)...');
    if (!testLetterId && dossier.letterLinks?.[0]?.letterId) {
      testLetterId = dossier.letterLinks[0].letterId;
    }

    // Checkout hardcopy with mandatory designation and auto-timestamp
    const checkoutRes = await fetch(`${BASE_URL}/letters/${testLetterId}/physical-checkout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        issuedToUserId: newUserId,
        issuedToDesignation: 'Director General (Admin & Reforms)',
        purpose: 'Review of procurement parawise comments for Parliamentary Standing Committee',
        expectedReturnAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
      }),
    });
    if (!checkoutRes.ok) throw new Error(`Physical checkout failed: ${await checkoutRes.text()}`);
    const checkoutData = await checkoutRes.json();
    console.log(`  ✅ Original Hardcopy Checked Out:`);
    console.log(`     - Recipient Officer: ${checkoutData.letter.physicalHolderName}`);
    console.log(`     - Auto Server Out-Timestamp: ${checkoutData.log?.checkedOutAt}`);
    console.log(`     - Designation Stamped: ${checkoutData.log?.issuedToDesignation}`);
    console.log(`     - Return Deadline: ${checkoutData.log?.expectedReturnAt}`);

    // Query full movement ledger
    const ledgerRes = await fetch(`${BASE_URL}/custody/register?letterId=${testLetterId}`, {
      headers: authHeaders,
    });
    if (!ledgerRes.ok) throw new Error(`Ledger query failed: ${await ledgerRes.text()}`);
    const ledgerData = await ledgerRes.json();
    console.log(`  ✅ Physical Out-Register Ledger Queried (${ledgerData.total} entries found):`);
    const latestLog = ledgerData.logs[0];
    console.log(`     - Movement Status: ${latestLog.movementStatus}`);
    console.log(`     - Officer Formatted: ${latestLog.officerFormatted}`);
    console.log(`     - Purpose: "${latestLog.purpose}"`);

    // Check-in hardcopy
    console.log('  Returning original hardcopy back to file jacket...');
    const checkinRes = await fetch(`${BASE_URL}/letters/${testLetterId}/physical-checkin`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (!checkinRes.ok) throw new Error(`Checkin failed: ${await checkinRes.text()}`);
    const checkinData = await checkinRes.json();
    console.log(`  ✅ Hardcopy Checked In:`);
    console.log(`     - Physical Status: ${checkinData.letter.physicalCustodyStatus}`);
    console.log(`     - Returned Timestamp: ${checkinData.returnedAt}\n`);

    console.log('================================================================');
    console.log('🎉 ALL GOVEDMS v2.0 ENTERPRISE UPGRADE TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ GOVEDMS v2.0 TEST FAILED:', err);
    process.exit(1);
  }
}

runV2Tests();

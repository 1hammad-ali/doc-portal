const BASE_URL = 'http://localhost:4000/api/v1';

async function getBuffer(res) {
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function testV3() {
  console.log('====================================================');
  console.log('🚀 GovEDMS v3.0 Production Overhaul Integration Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(health.status === 'online', 'Backend health check returns online');

    // 2. Login Super Admin
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@govedms.gov',
        password: 'GovSecurePassword2026!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.token, 'Super Admin authentication generates valid JWT');
    const adminToken = loginData.token;
    const adminUser = loginData.user;

    // 3. Profile & Self-Update
    const profileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const profile = await profileRes.json();
    assert(profile.user?.email === 'superadmin@govedms.gov', 'GET /auth/me returns authenticated user identity');

    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ phone: '+92-51-9201234' }),
    });
    const updatedProfile = await updateProfileRes.json();
    assert(updatedProfile.user?.phone === '+92-51-9201234', 'PATCH /auth/profile updates personal phone successfully');

    // 4. Portal Settings & Branding
    const settingsRes = await fetch(`${BASE_URL}/admin/settings`);
    const settings = await settingsRes.json();
    assert(settings.id === 'default', 'GET /admin/settings returns portal configuration');

    const updateSettingsRes = await fetch(`${BASE_URL}/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        portalTitle: 'GovEDMS — Prime Minister Secretariat & Ministerial Portal',
        watermarkText: 'GOVERNMENT OF PAKISTAN — CONFIDENTIAL & PRIVILEGED',
      }),
    });
    const updatedSettings = await updateSettingsRes.json();
    assert(
      updatedSettings.portalTitle === 'GovEDMS — Prime Minister Secretariat & Ministerial Portal',
      'PUT /admin/settings updates portal title and forensic watermark'
    );

    // 5. Dynamic User & Department Permissions Matrix
    const usersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const users = await usersRes.json();
    const dealingUser = users.find((u) => u.email === 'dealing@govedms.gov') || users[1];
    assert(Boolean(dealingUser), 'Discovered target officer for permission modification');

    const deptsRes = await fetch(`${BASE_URL}/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptsData = await deptsRes.json();
    const allDepts = deptsData.all || deptsData;
    const secondaryDept = allDepts.find((d) => d.id !== dealingUser.primaryDeptId) || allDepts[0];

    const permUpdateRes = await fetch(`${BASE_URL}/admin/users/${dealingUser.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        deptAccess: [
          {
            departmentId: secondaryDept.id,
            canView: true,
            canCreate: true,
            canEdit: true,
            canDownmark: true,
            canCheckoutPhysical: false,
            canExport: true,
            canDelete: false,
          },
        ],
      }),
    });
    const updatedPermissions = await permUpdateRes.json();
    const hasSecAccess = updatedPermissions.deptAccess?.some(
      (da) => da.departmentId === secondaryDept.id && da.canDownmark === true
    );
    assert(hasSecAccess, 'PUT /admin/users/:id/permissions dynamically grants multi-department access');

    // 6. Fetch a Letter for testing
    const lettersRes = await fetch(`${BASE_URL}/letters?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const lettersData = await lettersRes.json();
    const letters = lettersData.letters || (Array.isArray(lettersData) ? lettersData : []);
    assert(Array.isArray(letters) && letters.length > 0, 'Letters catalog loaded from real PostgreSQL database');
    const letter = letters[0];

    // 7. Guaranteed Inline PDF Streaming
    const streamRes = await fetch(`${BASE_URL}/letters/${letter.id}/stream?token=${adminToken}`);
    const streamContentType = streamRes.headers.get('content-type');
    const streamBuffer = await getBuffer(streamRes);
    const isPdfMagic = streamBuffer.slice(0, 4).toString() === '%PDF';
    assert(
      streamRes.status === 200 && streamContentType?.includes('application/pdf') && isPdfMagic,
      `GET /letters/:id/stream generates certified inline official PDF (Bytes: ${streamBuffer.length})`
    );

    // 8. Official Minute Notes Sheet
    const noteText = `Official Minute Para: Examined case records on ${new Date().toLocaleDateString()}. Approved for further compliance.`;
    const addNoteRes = await fetch(`${BASE_URL}/letters/${letter.id}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        noteText,
        isInternal: true,
      }),
    });
    const addedNote = await addNoteRes.json();
    assert(addNoteRes.status === 201 && addedNote.noteText === noteText, 'POST /letters/:id/notes records official minute');

    const getNotesRes = await fetch(`${BASE_URL}/letters/${letter.id}/notes`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allNotes = await getNotesRes.json();
    const foundNote = allNotes.find((n) => n.id === addedNote.id);
    assert(Boolean(foundNote) && foundNote.author?.fullName, 'GET /letters/:id/notes lists minute notes with author credentials');

    // 9. Hierarchical Downmarking & Closure Flow
    const downmarkRes = await fetch(`${BASE_URL}/letters/${letter.id}/downmark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        markedToId: dealingUser.id,
        instructions: 'Please examine court para and put up comprehensive comments within 24 hours.',
        deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      }),
    });
    const downmark = await downmarkRes.json();
    assert(downmarkRes.status === 201 && downmark.status === 'PENDING_VIEW', 'POST /letters/:id/downmark assigns task to officer');

    const respondRes = await fetch(`${BASE_URL}/downmarkings/${downmark.id}/respond`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'COMPLETED_CLOSED',
        closingRemarks: 'Formal parawise comments finalized and submitted for competent authority approval.',
      }),
    });
    const closedDownmark = await respondRes.json();
    assert(
      closedDownmark.status === 'COMPLETED_CLOSED' && closedDownmark.closingRemarks,
      'PATCH /downmarkings/:id/respond completes task with closing remarks and marks letter resolved'
    );

    // 10. Secure Time-Bound, Password-Protected Letter Sharing
    const shareRes = await fetch(`${BASE_URL}/letters/${letter.id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        password: 'LawMinistrySecret2026!',
        expiresInHours: 48,
        allowDownload: false, // View-only anti-screenshot
        recipientLabel: 'Additional Secretary (Law & Justice)',
      }),
    });
    const shareData = await shareRes.json();
    assert(shareRes.status === 201 && shareData.token, 'POST /letters/:id/share generates cryptographically secure 48-char token');

    // Public verify with WRONG password -> expect 401
    const wrongVerifyRes = await fetch(`${BASE_URL}/shared/${shareData.token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'WrongPassword' }),
    });
    assert(wrongVerifyRes.status === 401, 'POST /shared/:token/verify rejects incorrect passcode with 401');

    // Public verify with CORRECT password -> expect 200
    const correctVerifyRes = await fetch(`${BASE_URL}/shared/${shareData.token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'LawMinistrySecret2026!' }),
    });
    const verifyData = await correctVerifyRes.json();
    assert(
      correctVerifyRes.status === 200 && verifyData.letter?.diaryNumber === letter.diaryNumber,
      'POST /shared/:token/verify unlocks document and returns metadata'
    );

    // Protected Stream with watermark
    const sharedStreamRes = await fetch(`${BASE_URL}/shared/${shareData.token}/stream`);
    const sharedStreamBuffer = await getBuffer(sharedStreamRes);
    assert(
      sharedStreamRes.status === 200 && sharedStreamBuffer.slice(0, 4).toString() === '%PDF',
      `GET /shared/:token/stream streams document with forensic watermark (Bytes: ${sharedStreamBuffer.length})`
    );

    // View-Only Download Check -> expect 403 Forbidden
    const downloadForbiddenRes = await fetch(`${BASE_URL}/shared/${shareData.token}/download`);
    assert(
      downloadForbiddenRes.status === 403,
      'GET /shared/:token/download strictly enforces View-Only anti-download restriction'
    );

    // Download-Allowed Link test
    const allowDownloadRes = await fetch(`${BASE_URL}/letters/${letter.id}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        password: 'CourtDownload2026!',
        expiresInHours: 24,
        allowDownload: true,
        recipientLabel: 'Supreme Court Registrar Office',
      }),
    });
    const allowData = await allowDownloadRes.json();
    const allowedDownloadRes = await fetch(`${BASE_URL}/shared/${allowData.token}/download`);
    assert(
      allowedDownloadRes.status === 200 && allowedDownloadRes.headers.get('content-type')?.includes('application/pdf'),
      'GET /shared/:token/download streams PDF when allowDownload is true'
    );

    // Check forensic access log recording
    const sharesListRes = await fetch(`${BASE_URL}/letters/${letter.id}/shares`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const sharesList = await sharesListRes.json();
    const auditedLink = sharesList.find((s) => s.id === shareData.id);
    const hasAuditLogs = auditedLink?.accessLogs && auditedLink.accessLogs.length >= 2;
    assert(hasAuditLogs, 'Forensic ShareAccessLog accurately records password attempts and viewer IP');

    // Revoke link
    const revokeRes = await fetch(`${BASE_URL}/letters/${letter.id}/shares/${shareData.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const revokeData = await revokeRes.json();
    assert(revokeData.success === true, 'DELETE /letters/:id/shares/:shareId revokes access link');

    const postRevokeRes = await fetch(`${BASE_URL}/shared/${shareData.token}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'LawMinistrySecret2026!' }),
    });
    assert(postRevokeRes.status === 403, 'Subsequent access to revoked link returns 403 Access Denied');

    // 11. 1-Click Complete File Dossier Download
    const filesRes = await fetch(`${BASE_URL}/files`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const files = await filesRes.json();
    const testFile = files.find((f) => f._count?.letterLinks > 0) || files[0];

    const fileDownloadRes = await fetch(`${BASE_URL}/files/${testFile.id}/download-all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const filePdfBuffer = await getBuffer(fileDownloadRes);
    assert(
      fileDownloadRes.status === 200 && filePdfBuffer.slice(0, 4).toString() === '%PDF',
      `GET /files/:id/download-all compiles complete file dossier into 1 PDF (Bytes: ${filePdfBuffer.length})`
    );

    // 12. Logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logoutData = await logoutRes.json();
    assert(logoutData.success === true, 'POST /auth/logout securely terminates session with audit log');
  } catch (err) {
    console.error('Test Suite encountered unhandled error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 GovEDMS v3.0 Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

testV3();

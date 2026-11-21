# KNOWN ISSUES & EDGE CASES LOG

| Issue ID | Component | Description | Mitigation / Resolution |
| :--- | :--- | :--- | :--- |
| ISS-001 | Barcode Scanner | Rapid USB keyboard-wedge keystrokes can collide with user typing in input fields | Implement dedicated `useBarcodeScanner` hook filtering keystrokes by prefix, inter-character latency (<30ms), and terminating Enter key. |
| ISS-002 | Physical Custody | Letter physically returned but record not updated | Visual amber alert countdown on dashboard prompting Documentation Controller to verify custody status prior to file archive. |
| ISS-003 | Multi-File Folio | Physical page numbering differs across file jackets | Each `LetterFileLink` maintains an independent `folioNumber` string (e.g., "Folio 22-25" in Case File, "Folio 8" in Master File). |
| ISS-004 | Admin Deletion | Accidental or malicious deletion of government records | Soft deletion only (`deletedAt`, `deletedById`, `deletionReason`) restricted to `SUPER_ADMIN` and `DEPT_ADMIN`, logged immutably in `AuditLog`. |
| ISS-005 | Barcode Route Aliasing | Hardware scanners and web hooks querying `/api/v1/barcode/:code` vs `/lookup/:code` | Added dual router bindings and positioned `/generate/:code` first to prevent collision with parameter capture. |
| ISS-006 | Windows Non-Elevated Execution | Docker installation on standard Windows user consoles can prompt UAC | Integrated autonomous native database engine (`embedded-postgres`) ensuring zero manual intervention. |

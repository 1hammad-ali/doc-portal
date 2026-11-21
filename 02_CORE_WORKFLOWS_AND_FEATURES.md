# CORE GOVERNMENT WORKFLOWS & FUNCTIONAL SPECIFICATIONS

## 1. Intelligent Dak Intake & Multi-File Linking Engine
When a Documentation Controller receives a letter (or dispatches one):
1. **Metadata Capture:**
   - **Direction:** Inward Dak / Outward Dispatch / Internal Note.
   - **Source & Destination:** Where the letter came from (`senderOrganization`, `senderName`), when it arrived (`receivedOrSentDate`), official letter number (`referenceNumber`), and who it is addressed to (`addressedToName`, `addressedToPost`).
   - **Reason & Synopsis:** Mandatory concise summary (`briefReason`) explaining why the letter arrived and what is sought.
   - **Smart File Naming:** Upon upload, the system automatically renames the stored digital copy to a standardized government convention:
     `[DiaryNo]_[LetterType]_[Sanitized-Subject]_[YYYY-MM-DD].pdf`
2. **Multi-File Placement (1-to-Many Linking):**
   - During upload (or afterward), the controller attaches the letter to **multiple files simultaneously**:
     - **File 1 (Primary):** Main Organizational Correspondence File (e.g., `PMU/ADMIN/2026/001`).
     - **File 2 (Addressee):** The specific Officer's File to whom the letter was addressed.
     - **File 3 (Case/Project):** Any linked **Case File** (created on the spot if a new case arises from this letter) or **Project File**, plus optional **Tags**.
   - Each link records its **Folio Number** (page number inside that physical file jacket).

---

## 2. Correspondence Classification & Action Logic
The system categorizes every letter so dashboards separate actionable tasks from archival notices:
| Letter Type | System Behavior & SLA Rules |
| :--- | :--- |
| **Action Required** | Requires formal processing, reply, or approval. Enters active pending queue with countdown SLA. |
| **Directive / Executive Order** | High-priority instruction from PM / Chief Secretary / Minister. Pinned to top of Executive Dashboard. |
| **CC / Information Only** | Marked `No Action Required`. Auto-archived into linked files for record without cluttering pending tasks. |
| **Notification / Circular / SRO** | Indexed in the central **Notifications & Gazette Repository** with instant global search. |
| **Financial / Audit Memo** | Flags Finance Wing & tracks audit compliance deadlines. |
| **Legal / Court Notice** | Triggers red-alert SLA reminders ahead of court hearing dates. |

---

## 3. Hierarchical Down-Marking & Responsibility Chain
- **Top-Down Delegation:** When a letter is addressed to a senior authority (e.g., Prime Minister, Secretary, Director General), they or their staff can **Down-Mark** it to subordinate officers/departments with official remarks (`instructions`) and a target deadline.
- **Multi-Hop Visibility:** The originating authority and Documentation Controller see a real-time **Chain-of-Custody Timeline**:
  `PM Secretariat (Marked 10:00 AM) -> Secretary LG&CDD (Viewed 10:15 AM, Marked to PD PMU) -> Project Director (In Progress, Due Tomorrow)`
- **Accountability & Closure:** Only the designated responsible officer (or authorized senior) can submit the final response/compliance note and mark the letter **Closed**, locking the action thread.

---

## 4. Physical Hardcopy Custody & "Missing Original" Alert System
To prevent lost government papers:
- Every letter record features a prominent **Physical Verification Check Panel**:
  1. `[✓] Physical Copy Attached in Main File` (Verified with rack/folio location).
  2. `[!] Original Copy Removed / Handed Over` (Toggle switch).
- **Checkout Workflow:** When an officer takes the original hardcopy out of the physical file, the Documentation Controller logs:
  - **Issued To:** Officer Name / Post.
  - **Purpose:** e.g., *"For signature of Secretary"* or *"Cabinet Meeting"*.
  - **Expected Return Date & Time.**
- **Dashboard Overdue Alert:** If `current_time > expectedReturnAt` and the document is not yet checked back in, a high-visibility **Red Custody Alert Banner** appears on the Command Dashboard and notifies the Documentation Controller to retrieve and re-file the original document.

---

## 5. Barcode Generation + Camera & USB Scanner Integration
1. **Auto-Barcode Sticker Printing:** Every registered File Jacket and Letter generates a unique Code-128 / QR barcode label (`GOV-2026-000841`) printable on thermal label printers.
2. **Dual-Mode Instant Scanning:**
   - **USB Hardware Barcode Scanner:** Global keyboard-wedge listener detects high-speed scanner input anywhere in the portal and immediately opens the matching Letter or File Jacket—no mouse click needed.
   - **Device Camera / Webcam Scanner:** Built-in camera viewfinder modal (`html5-qrcode`) allows scanning physical file covers or letters directly from a laptop webcam, tablet, or smartphone.

---

## 6. Multi-Department RBAC & Admin-Only Deletion
- **Cross-Department Matrix:** A single user can be assigned to manage **Department A** and **Department B** simultaneously, or be restricted to specific **Case/Project Folders** within a department.
- **Forensic Access Logging:** Every time any user opens, previews, downloads, prints, or edits a document, an entry is written to `audit_logs` (User, Designation, Timestamp, IP Address, Action).
- **Admin-Only Deletion:** Regular users, clerks, and officers **cannot delete** any letter or file. Only `SUPER_ADMIN` / `DEPT_ADMIN` has the Delete button, which requires typing a mandatory deletion reason and records a permanent forensic audit trail.

# EXECUTIVE GOVERNMENT UI/UX DESIGN SYSTEM (GovEDMS)

## 1. Visual Inspiration & Layout Architecture
Inspired by modern executive SaaS interfaces (clean floating sidebar, rounded bento cards, generous whitespace, top global search bar, and a dedicated right-hand live activity/schedule rail), re-engineered with **Sovereign Government Authority & Executive Gravitas**.

### Structural Grid (3-Zone Executive Layout)
1. **Left Navigation Rail (240px, Soft Ivory/Alabaster `#F8F9F7`):**
   - Sovereign Crest / Emblem + Portal Title (`GovEDMS — National e-Office`).
   - Primary Modules:
     - `Command Dashboard` (Executive Overview)
     - `Inward Dak (Receipt)`
     - `Outward Dispatch`
     - `Files, Cases & Projects`
     - `Down-Marked Tasks` (With live badge count)
     - `Physical Custody Alerts` (With overdue indicator)
     - `Notifications & Gazettes`
     - `Departments & Access`
     - `Forensic Audit Logs`
2. **Center Workspace (Fluid Canvas, Crisp Off-White `#F3F5F4`):**
   - **Top Header Bar:** Instant Global Search (`Search by Diary No, Letter No, Barcode, Subject, or OCR Text...`), `[Scan Barcode]` quick-action button (USB/Camera), Notification Bell, and Logged-in Officer Profile Pill (Name, Designation, Active Department Switcher).
   - **Top KPI Row (4 Rounded Bento Cards, `border-radius: 16px`):**
     - Card 1 (Highlighted Executive Card): **Total Dak Today** (Inward vs Outward split + percentage trend).
     - Card 2: **Pending Action / Down-Marked** (With Urgent/Immediate breakdown).
     - Card 3: **Physical Originals Checked Out** (Amber/Red alert if any overdue return).
     - Card 4: **Active Cases & Projects** (With SLA compliance rate).
   - **Middle Analytics Section:**
     - **Left (65%):** *Departmental Correspondence & SLA Resolution Chart* (Clean rounded bar/area chart with `Week | Month | Year` pill switcher).
     - **Right (35%):** *Correspondence Breakdown* (Action Required, CC/Info Only, Directives, Notifications, Legal).
   - **Bottom Operational Tables:**
     - **Left (50%):** *Recent High-Priority & Down-Marked Letters* (Status pills, assignee avatars, quick-view drawer).
     - **Right (50%):** *Physical Custody Watchlist* (Original copies currently outside physical files with overdue timers).
3. **Right Live Activity & Timeline Rail (300px, Pure White `#FFFFFF`):**
   - **Live Down-Marking & Custody Timeline:** Chronological feed of today's urgent directives, physical file checkouts due back today, and recent forensic access events.

---

## 2. Official Government Color Palette (Replacing Casual Yellow with Sovereign Emerald, Slate & Gold)
| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| `--gov-primary-emerald` | `#0B4F32` | Primary brand identity, active sidebar pill, primary CTA buttons |
| `--gov-emerald-dark` | `#073622` | Header accents, hover states, executive crest badge |
| `--gov-emerald-soft` | `#E8F3EE` | Active row tint, subtle card highlights, badge backgrounds |
| `--gov-gold-accent` | `#C59B27` | Highlighted KPI card tint (`#FBF6E8` fill + `#C59B27` border), VIP/Prime Minister Directive badge |
| `--gov-slate-ink` | `#111C18` | Primary typography (high-contrast, crisp readability) |
| `--gov-muted-text` | `#5A6B64` | Secondary labels, timestamps, folio metadata |
| `--gov-canvas-bg` | `#F3F5F4` | Main application background |
| `--gov-card-surface` | `#FFFFFF` | Bento cards with `1px solid #E2E8E5` subtle border |
| `--gov-alert-crimson` | `#B42318` | Overdue physical custody alerts, Most Immediate priority, Admin delete warning |
| `--gov-amber-warn` | `#B54708` | Checked-out physical copy (within due time), approaching SLA deadline |

---

## 3. Typography & Micro-Interactions
- **Primary Font:** `Plus Jakarta Sans` or `Inter` (clean geometric sans-serif for headers and UI).
- **Monospace Font:** `JetBrains Mono` (strictly used for **Diary Numbers**, **File Numbers**, **Barcodes**, and **Audit Timestamps**).
- **Card Elevation:** Flat modern borders (`1px solid #E2E8E5`) with soft hover elevation (`0 8px 24px rgba(11, 79, 50, 0.06)`).
- **Drawer-First UX:** Clicking any letter opens a slide-over **Document Split-View Drawer** (Left: Interactive PDF/Scan Viewer; Right: Multi-File Links, Physical Custody Toggle, Down-Marking Chain, and Access Audit Log) without losing dashboard context.

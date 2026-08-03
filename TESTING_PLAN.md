# Agrodemy LMS - End-to-End Comprehensive Testing Guide

This testing plan is designed to verify all features, workflows, and edge cases in the Agrodemy Learning Management System (LMS). It includes master verification checklists and a test data seed to run thorough manual and automated QA cycles.

---

## 💾 Test Data Seed

Use these pre-structured records to seed the workbook sheets when performing manual verification.

### 1. Learners Seed Data
Add these 3 learners to the `Learners` sheet:

| LearnerID | FullName | Email | Phone | ProgramID | EnrollmentDate | CurrentModule | Progress% | LastLogin | StatusID | CertificateStatusID | SupportStatusID | LastContact | OfficerID | Notes | IsArchived |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `LRN-000001` | Amina Bello | amina@agrodemy.org | +2348011111111 | `P001` | 2023-11-01 | Module 2: Soil Science | `0.45` | 2023-11-15 | `ST01` | `C01` | `SP01` | 2023-11-15 | `O001` | Active student. | `FALSE` |
| `LRN-000002` | Samuel Zhang | samuel@agrodemy.org | +8613911111111 | `P002` | 2023-11-02 | Module 1: Agro-Digital Tools | `0.10` | 2023-11-14 | `ST03` | `C01` | `SP01` | 2023-11-14 | `O002` | Needs pacing assistance. | `FALSE` |
| `LRN-000003` | Chidi Okafor | chidi@agrodemy.org | +2348022222222 | `P001` | 2023-11-03 | Module 5: Agri-Business Exit | `1.00` | 2023-11-15 | `ST02` | `C02` | `SP01` | 2023-11-15 | `O001` | Ready for graduation. | `FALSE` |

### 2. Support Ticket Seed Data
Add these 2 support tickets to the `SupportLog` sheet:

| TicketID | LearnerID | IssueCategoryID | Description | Priority | DateOpened | OfficerID | TicketStatus | ResolutionDate | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TKT-000001` | `LRN-000001` | `IC01` | Login credentials not working on the mobile portal. | High | 2023-11-15 | `O001` | Open | | Checking server log. |
| `TKT-000002` | `LRN-000002` | `IC03` | Cannot submit Assignment 1 PDF file. | Medium | 2023-11-15 | `O002` | In Progress | | Re-upload enabled. |

---

## 🧪 Phase 1: Interactive Sidebar Dashboard Verification

- [ ] **Verify KPI Counts Rendering**
  - Open the Agrodemy LMS Sidebar.
  - Check that the numbers for *Total Enrolled*, *Active Learning*, *At Risk*, and *Open Tickets* are loaded.
  - Confirm they perfectly match the active, unarchived counts in your sheet.
- [ ] **Verify Priority Pills**
  - Locate the "Tickets by Priority" section inside the dashboard.
  - Verify that the High, Medium, and Low pill-badges display correct numbers of active (Open/In Progress) tickets.
- [ ] **Verify Recent Audited Actions Feed**
  - Check that the list displays the last 5 logs from the `ActivityLog` worksheet.
  - Confirm that each entry displays the timestamp and action name clearly.
- [ ] **Verify Dynamic Refresh Flow**
  - Onboard a new learner or update a status.
  - Return to the Dashboard and verify that counts and the recent activity feed update instantly.

---

## 🧪 Phase 2: Reactive Learner Filters & Pagination

- [ ] **Verify Real-Time Reactive Search Bar**
  - Go to the **Learners** tab.
  - Type `Amina` into the search bar.
  - Confirm that the table filters instantly on keystroke without lagging, and displays only `Amina Bello` within 250ms.
- [ ] **Verify Program, Status, and Officer Filters**
  - Select a Program from the dropdown (e.g. *Career Agribusiness Certification*).
  - Verify that the table updates instantly.
  - Combine filters (e.g., search term `Samuel` + Status *At Risk*). Confirm correct results render immediately.
- [ ] **Verify Sort Order Selections**
  - Select *Name (Z-A)* from the sort selector. Confirm list order reverses.
  - Select *Progress (High-Low)*. Confirm `Chidi Okafor` (100%) climbs to the top of the table.
- [ ] **Verify Show Archived Toggle**
  - Click the *Show Archived Only* checkbox.
  - Verify the grid displays *only* archived learners (`IsArchived = TRUE`).
- [ ] **Verify Pagination Controls**
  - Set the mock database size to 15+ learners.
  - Check that page limits enforce the page size (e.g., 10 rows).
  - Click *Next* and *Prev* buttons. Confirm they transition pages and update page labels correctly.

---

## 🧪 Phase 3: Learner Profiles & CRUD Integrity

- [ ] **Verify Onboard Learner Profile Flow**
  - Click **Add Learner** to open the modal.
  - Fill in Name, Email, Phone, Program, and Coach details.
  - Click **Onboard Learner**.
  - Confirm that a Welcome Email is sent to the student, a row is batch-written to the `Learners` sheet, an audit log is written, and the table updates.
- [ ] **Verify Duplicate Prevention Constraint**
  - Click **Add Learner** and enter an existing email (e.g. `amina@agrodemy.org`).
  - Click Save. Confirm that a toast notification alerts: *"Validation Error: A learner with Email 'amina@agrodemy.org' already exists."*
- [ ] **Verify Edit Profile and Email Lock**
  - Click **Edit** next to an active learner.
  - Verify that the Email address field is disabled (read-only) to protect database integrity.
  - Modify progress to `1.00`. Save the form.
  - Verify that overall Status shifts to **Completed** and Certificate status shifts to **Eligible** automatically.

---

## 🧪 Phase 4: Support Tickets Logging & Student Linking

- [ ] **Verify Active-Only Linked Learner Dropdown**
  - Click **Open Ticket** in the support tab.
  - Expand the *Linked Learner* selection dropdown.
  - Confirm that `Amina Bello` and `Samuel Zhang` are visible.
  - Confirm that `Chidi Okafor` (who is status *Completed*) and any *Archived* learners are automatically filtered out.
  - Confirm option labels display exactly in the format: `Full Name (LearnerID)`.
- [ ] **Verify Status Sync on Ticket Logging**
  - Log a new Ticket for `Amina Bello` with high priority.
  - Check the `Learners` sheet. Confirm that Amina's `SupportStatusID` has updated to **SP02** (*Open Ticket*).
- [ ] **Verify Ticket Resolution Flow**
  - Change ticket status to **Closed** in the support log.
  - Confirm that resolution date is appended, and the learner's SupportStatusID shifts to **SP04** (*Closed*).

---

## 🧪 Phase 5: Dynamic Email Placeholders

- [ ] **Verify Generic Column Auto-mapping**
  - Go to **Settings** -> **Email Template Customizer**.
  - Add arbitrary tags representing custom sheet columns in your template body (e.g., `{{Phone}}`, `{{Notes}}`, `{{CurrentModule}}`).
  - Trigger email dispatch (e.g. welcome onboarding or support warning).
  - Check Gmail Outbox. Confirm that all custom tags are successfully evaluated and replaced with values from the corresponding column of the Learners sheet.
- [ ] **Verify Progress Formats**
  - Edit the Reminder template to include both:
    - `{{Progress%}}` (Auto-formatted percentage)
    - `{{Progress%_Raw}}` (Raw decimal value)
  - Send the warning/reminder.
  - Confirm the email displays `45%` for the percentage tag and `0.45` for the raw tag respectively.

---

## 🧪 Phase 6: Spreadsheet Styling, Auto-Fit, and Charts

- [ ] **Verify Layout and Charts on Dashboard Sheet**
  - Go to the `Dashboard` worksheet in Google Sheets.
  - Confirm that three high-quality charts are placed starting at row 12:
    - `Donut Pie Chart` at **A12** (Status Distribution with Active=Green, At Risk=Orange, Completed=Blue, Archived=Gray).
    - `Column Chart` at **E12** (Program Enrollments sorted descending).
    - `Horizontal Bar Chart` at **I12** (Support Priorities with High=Red, Medium=Yellow, Low=Green).
- [ ] **Verify Auto-Fit Columns Functionality**
  - Add or edit records to expand text widths.
  - Verify that `autoResizeColumns()` is executed on `Dashboard`, `Learners`, and `SupportLog` sheets, causing columns to adapt widths instantly with zero text truncation.

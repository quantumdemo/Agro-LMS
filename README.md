# Agrodemy Learning Management System (LMS) - Deployment & Architecture Guide

Welcome to the **Agrodemy LMS** Deployment and Architecture Guide. This comprehensive manual is written to enable anyone—even those with basic Google Sheets experience—to set up, run, customize, and maintain the Agrodemy LMS successfully.

---

## 📖 1. How the System Works (Behind the Scenes)

Before setting up the system, it helps to understand how the components talk to one another.

### Multi-Tier Clean Architecture
Agrodemy LMS is structured with a strict **Separation of Concerns**. This prevents code spaghetti and ensures that if we decide to change the user interface or migrate the database in the future, we do not have to rebuild the business logic.

```
+---------------------------------------------------------------------------------+
|                               PRESENTATION LAYER                                |
| - Sidebar.html: Structure of the UI                                             |
| - Sidebar.css: Branding, colors, layout, responsive design                      |
| - Sidebar.js: Single Page Application (SPA) client controller                   |
| - Components: Modal, Table, Cards, Charts, Forms, Pagination                    |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v (Uses non-blocking google.script.run API calls)
+---------------------------------------------------------------------------------+
|                               APPLICATION LAYER                                 |
| - State Manager (AppState): Client-side single source of truth for UI cache     |
| - API Manager: Dispatches requests to Google Apps Script backend                |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v (Executes Server-Bound Apps Script)
+---------------------------------------------------------------------------------+
|                                 SERVER LAYER                                    |
| - Learners.gs: Adds, updates, searches, filters, and archives learner records  |
| - Support.gs: Manages logs, priorities, and assignments for support tickets      |
| - Certificates.gs: Evaluates program eligibility and verifies credentials       |
| - Dashboard.gs: Live real-time metric aggregates for cards and recent feeds     |
| - Settings.gs: Loads lookups, metadata, and handles email template edits        |
| - Reports.gs: Compiles datasets into timestamped, downloadable CSV formats       |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v (Intermediary Layer)
+---------------------------------------------------------------------------------+
|                                 SERVICE LAYER                                   |
| - SpreadsheetService: Performs batched cell operations (minimizes sheet lag)    |
| - IDGenerator: Centralized human-readable sequential key provider               |
| - EmailService: Evaluates templates and substitutes variable brackets           |
| - ActivityService: Generates immutable audit trails                             |
| - Validation: Server-side data constraints validation engine                    |
+---------------------------------------+-----------------------------------------+
                                        |
                                        v (Active Spreadsheet Sheet Container)
+---------------------------------------------------------------------------------+
|                             GOOGLE SHEETS DATABASE                              |
| - 12 structured worksheets representing tables with Primary and Foreign keys   |
+---------------------------------------------------------------------------------+
```

### Dynamic Data Flows
1. **Onboarding a Learner:**
   - The user inputs details in the "Add Learner" modal.
   - `Sidebar.js` validates input formats locally, then sends the payload to `apiCreateLearner(data)`.
   - `Learners.gs` checks for email uniqueness against the spreadsheet.
   - `Utilities.gs` gets the highest sequence ID (e.g. `LRN-000024`) and increments it.
   - `Spreadsheet.gs` appends the row instantly using optimized batch writing.
   - `Activity.gs` logs the event inside `ActivityLog`.
   - `Email.gs` dispatches a welcome notification automatically using standard `MailApp` templates.
   - The client-side state is re-fetched, updating the learner table and KPI numbers in real-time.

2. **Automated Status Progression:**
   - If a learner's progress is updated to `1.0` (100%), the system automatically changes their Overall Status (`StatusID`) to **ST02 (Completed)** and their Certificate Status (`CertificateStatusID`) to **C02 (Eligible)**.
   - A completion congratulations email is dispatched immediately.

---

## 📋 2. Database Schema (Required Sheets & Columns)

The database consists of **12 worksheets** residing in the same Google Sheets workbook. While our system has an **Automatic Database Initializer** that generates these automatically, here is the official schema and data dictionary for manual verification:

### 1. `README`
*   **Purpose:** Serving as a home page describing the file version and setup metadata.
*   **Columns:** Single information cell.

### 2. `Settings`
*   **Purpose:** Houses master dropdown indices, programs list, training coaches, and customizable HTML templates.
*   **Columns:** `ID / Code / Template`, `Description / Name / Subject`, `Email / Body`
*   *Layout Structure:* Segregated into blocks: `Programs`, `Officers`, `LearnerStatus`, `CertificateStatus`, `SupportStatus`, `IssueCategories`, and `EmailTemplates`.

### 3. `Learners`
*   **Purpose:** Active database of all student records.
*   **Columns:**
    1.  `LearnerID` (PK, e.g. `LRN-000001`)
    2.  `FullName`
    3.  `Email` (Unique, secondary PK)
    4.  `Phone`
    5.  `ProgramID` (FK -> Settings Programs)
    6.  `EnrollmentDate`
    7.  `CurrentModule`
    8.  `Progress%` (0.0 to 1.0 format)
    9.  `LastLogin`
    10. `StatusID` (FK -> Settings LearnerStatus)
    11. `CertificateStatusID` (FK -> Settings CertificateStatus)
    12. `SupportStatusID` (FK -> Settings SupportStatus)
    13. `LastContact`
    14. `OfficerID` (FK -> Settings Officers)
    15. `Notes`
    16. `IsArchived` (`TRUE` or `FALSE` flag)

### 4. `SupportLog`
*   **Purpose:** Audit journal for support incidents.
*   **Columns:**
    1. `TicketID` (PK, e.g. `TKT-000001`)
    2. `LearnerID` (FK -> Learners)
    3. `IssueCategoryID` (FK -> Settings Categories)
    4. `Description`
    5. `Priority` (`Low`, `Medium`, `High`)
    6. `DateOpened`
    7. `OfficerID` (FK -> Settings Officers)
    8. `TicketStatus` (`Open`, `In Progress`, `Closed`)
    9. `ResolutionDate`
    10. `Notes`

### 5. `CertificateTracker`
*   **Purpose:** Registry for securely issued credentials.
*   **Columns:**
    1. `CertRecordID` (PK, e.g. `CRT-000001`)
    2. `LearnerID` (FK -> Learners)
    3. `ProgramID` (FK -> Settings Programs)
    4. `CompletionDate`
    5. `CertificateStatusID` (FK -> Settings CertificateStatus)
    6. `CertificateDate`
    7. `CertificateID` (Unique serial, e.g. `CERT-000001`)
    8. `CertificateLink`

### 6. `Dashboard`
*   **Purpose:** Aggregates quick formulas. Contains no raw transactional columns.

### 7. `ActivityLog`
*   **Purpose:** Audits actions performed inside the LMS.
*   **Columns:**
    1. `LogID` (PK, e.g. `LOG-000001`)
    2. `Timestamp`
    3. `User` (User email)
    4. `Module` (`Learners`, `Support`, `Certificates`, `Settings`, etc.)
    5. `Action` (`CREATE`, `UPDATE`, `ARCHIVE`, `RESTORE`, `SEND_EMAIL`)
    6. `TargetRecord` (Related ID)
    7. `Details`
    8. `Result` (`SUCCESS` or `FAILURE`)

---

## 🛠 3. Step-by-Step Implementation Guide

Follow these exact steps to deploy the Agrodemy LMS from scratch:

### Step 1: Prepare the Google Spreadsheet
1.  Open your web browser and go to [sheets.new](https://sheets.new) to create a blank Google Spreadsheet, or open your existing workbook copy.
2.  Name the Google Sheet (e.g., `Agrodemy LMS Database`).

### Step 2: Open the Apps Script Editor
1.  In the top menu bar of your Google Sheet, click **Extensions** -> **Apps Script**.
2.  A new browser tab will load the Google Apps Script development console.
3.  Change the project title from "Untitled project" to `Agrodemy LMS Engine`.

### Step 3: Paste the Server Code (`.gs` files)
For each backend file, follow this process:
1.  In the Apps Script editor panel, hover over **Files** and click the **+ (Add a file)** icon. Select **Script**.
2.  Rename the new script file exactly as named in this repository (do not add the `.gs` extension, Apps Script adds it automatically):
    - Create `Config` and paste contents of `Config.gs`.
    - Create `Helpers` and paste contents of `Helpers.gs`.
    - Create `Validation` and paste contents of `Validation.gs`.
    - Create `Utilities` and paste contents of `Utilities.gs`.
    - Create `Spreadsheet` and paste contents of `Spreadsheet.gs`.
    - Create `Email` and paste contents of `Email.gs`.
    - Create `Activity` and paste contents of `Activity.gs`.
    - Create `Dashboard` and paste contents of `Dashboard.gs`.
    - Create `Learners` and paste contents of `Learners.gs`.
    - Create `Support` and paste contents of `Support.gs`.
    - Create `Certificates` and paste contents of `Certificates.gs`.
    - Create `Reports` and paste contents of `Reports.gs`.
    - Create `Settings` and paste contents of `Settings.gs`.
    - Create `Triggers` and paste contents of `Triggers.gs`.

### Step 4: Paste the Frontend Templates (`.html` / `.css` / `.js` files)
To connect the HTML sidebar and keep styling separate, you must add the HTML, CSS, and JS files as **HTML** templates in Apps Script:
1.  Click the **+ (Add a file)** icon. Select **HTML**.
2.  Name the file exactly `Sidebar`. Paste the code from `Sidebar.html`.
3.  Click the **+ (Add a file)** icon. Select **HTML**.
4.  Name the file exactly `Sidebar.css`. Paste the code from `Sidebar.css`.
5.  Click the **+ (Add a file)** icon. Select **HTML**.
6.  Name the file exactly `Sidebar.js`. Paste the code from `Sidebar.js`.

### Step 5: Save and Compile
1.  Click the **Save Project** (disk) icon at the top toolbar, or press `Ctrl + S` (`Cmd + S` on Mac).
2.  Ensure there are no red syntax highlights or compiler alerts.

---

## 🔑 4. Setting Permissions & First Run

Because Google Apps Script interacts with Google Sheets and dispatches emails via your account, Google enforces standard authorization.

1.  **Reload the Google Sheet:**
    - Refresh your Google Sheets tab.
2.  **Locate the Agrodemy Menu:**
    - After reloading, look at the top menu bar. A new custom menu titled **"Agrodemy LMS"** will appear (this can take 3-5 seconds to load).
3.  **Execute Initialization Trigger:**
    - Click **Agrodemy LMS** -> **Initialize System Database**.
4.  **Complete the Authorization Flow:**
    - A popup saying "Authorization Required" will appear. Click **Continue**.
    - Choose your active Google Account.
    - Google will show an alert ("Google hasn't verified this app" — this is completely normal for self-created scripts).
    - Click **Advanced** at the bottom-left of the warning card, then click **Go to Agrodemy LMS Engine (unsafe)**.
    - Click **Allow** on the permission screen.
5.  **Let the Engine Initialize:**
    - The initialization service will run quietly, automatically constructing and styling any missing worksheets. When done, a success alert box will pop up: *"Database initialization check complete."*

---

## 📧 5. Email & Notifications Configuration

The system connects to **GmailApp** automatically. To configure templates:
1.  Launch the Agrodemy Sidebar: **Agrodemy LMS** -> **Launch LMS Sidebar**.
2.  Navigate to the **Settings** tab (gear icon) on the sidebar.
3.  Locate **Custom Notification System**.
4.  Select the email template you wish to update:
    - **Welcome:** Sent on learner signup.
    - **Reminder:** Learning pace warning reminder.
    - **Certificate:** Dispatched automatically upon credential release.
    - **Support:** Sends notes upon support ticket completion.
5.  Edit the **Subject Line** and **Body Text** directly.
6.  *Crucial Placeholders:* You can write curly bracket placeholders inside your templates. The backend placeholder parser will swap these dynamically before sending. Supported keys include:
    - `{{FullName}}` -> Student's name
    - `{{LearnerID}}` -> e.g. `LRN-000012`
    - `{{ProgramName}}` -> Selected coursework
    - `{{TicketID}}` -> support ticket reference
    - `{{CertificateID}}` -> unique license sequence
    - `{{CertificateLink}}` -> Verification link
7.  Click **Save Template**. The changes are committed to the spreadsheet database instantly.

---

## 👥 6. Deploying for Other Success Officers

To share the LMS with other team members:
1.  Click the blue **Share** button at the top-right of your Google Sheet.
2.  Input the Gmail/Google Workspace email addresses of your team.
3.  Grant them **Editor** permissions (this is required so the scripts can log actions and write to the spreadsheet under their credentials).
4.  When those officers open the sheet, the custom **Agrodemy LMS** menu will appear in their toolbar automatically. Clicking any button will trigger their one-time Google permission prompt, after which they can run the system end-to-end.

---

## 🧪 7. Verification Checklist & End-to-End Testing

Ensure everything is configured correctly by running this test sequence:

1.  **Test Case 1: Onboard a New Learner**
    - Open Sidebar -> Click "Learners" tab -> Click **Add Learner**.
    - Input `FullName`: "Test Student", `Email`: "test@example.com", `Phone`: "123456", choose a program, and click **Onboard Learner**.
    - *Success criteria:* Toast notification pops up, modal closes, learner appears in the grid, a row is added to the `Learners` worksheet, an entry is added to `ActivityLog`, and you receive a Welcome email in your Gmail inbox.
2.  **Test Case 2: Validation Handling (Duplicates)**
    - Click **Add Learner** again.
    - Input the exact same email `test@example.com` and click Save.
    - *Success criteria:* Toast notification alerts: *"Validation Error: A learner with Email already exists."*
3.  **Test Case 3: Complete & Issue Certificate**
    - Click "Edit" next to "Test Student".
    - Set Progress % to `1.0` (100%), overall status to "Completed", and click Update.
    - *Success criteria:* Overall status transitions to "Completed", Certificate Status shifts to "Eligible" (`C02`).
    - Navigate to "Certificates" tab in the sidebar. Click "Verify Certificate" by entering the certificate key.
4.  **Test Case 4: Support Log Cycle**
    - Navigate to "Support" tab -> Click **Open Ticket**.
    - Choose your student, set high priority, input description, and click Save.
    - *Success criteria:* SupportLog row generated, and the learner's support status indicator turns to "Open Ticket" (`SP02`).

---

## ❓ 8. Common Troubleshooting

### 1. The custom "Agrodemy LMS" menu is missing.
*   **Cause:** Google Sheets takes a few seconds to run the `onOpen` spreadsheet triggers.
*   **Fix:** Wait 5 seconds, reload the browser tab, and check if it appears.

### 2. Error message: "Action not allowed" or Authorization failures.
*   **Cause:** You are logged into multiple Google Accounts in the same browser, creating authentication conflicts.
*   **Fix:** Log out of all accounts except your primary work Google Account, or open the Google Sheet inside a fresh **Incognito / Private browser window**.

### 3. File upload/compile fails with "Include file not found".
*   **Cause:** One of the frontend templates (`Sidebar`, `Sidebar.css`, or `Sidebar.js`) was saved as a `.gs` script instead of an **HTML** template.
*   **Fix:** Delete the incorrect file in Apps Script, click **Add File** -> **HTML**, name it exactly, paste the contents, and click save.

### 4. Email template displays unparsed tags like `{{FullName}}`.
*   **Cause:** Typo in placeholder spelling inside your settings editor.
*   **Fix:** Ensure spelling matches the exact formatting rules (e.g. `{{FullName}}` is case-sensitive and must not have spaces inside the brackets).

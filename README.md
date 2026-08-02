# Agrodemy Learning Management System (LMS)

Agrodemy LMS is a production-grade, commercial-ready Learning Management System built entirely on the Google Workspace ecosystem. It empowers Learning Success Officers to manage thousands of active learners, open and resolve support logs, issue certified completions, customize email templates, export spreadsheet reports, and review audit history—all from a single-page sidebar application inside Google Sheets.

---

## 🚀 How To Set Up and Run the Application (Step-by-Step)

Because this is a container-bound Google Apps Script project running directly inside Google Sheets, there are two primary ways to deploy it: **Manually** (via copy-pasting into the browser) or **Automatically** (using Google Clasp).

### Method A: Manual Setup (Recommended for Quick Start)

1. **Create/Open Your Google Sheet:**
   - Create a brand new Google Sheet in your Google Drive or open the existing `Google_Sheets_LMS_Workbook_Phase1.xlsx` workbook in Google Sheets.
2. **Open the Apps Script Editor:**
   - In the Google Sheets menu, click on **Extensions** -> **Apps Script**.
3. **Copy the Codebase Files:**
   - In the left-hand files panel of the Apps Script editor, you will create files matching the names in this repository.
   - For every `.gs` file (e.g., `Config.gs`, `Helpers.gs`, `Validation.gs`, `Utilities.gs`, `Spreadsheet.gs`, `Email.gs`, `Activity.gs`, `Dashboard.gs`, `Learners.gs`, `Support.gs`, `Certificates.gs`, `Reports.gs`, `Settings.gs`, `Triggers.gs`):
     1. Click the **+** (Add a file) icon -> Select **Script**.
     2. Name it exactly like the file (Apps Script automatically appends `.gs`).
     3. Copy and paste the corresponding code from this repository into the editor.
   - For every `.html` / `.css` / `.js` frontend file (e.g., `Sidebar.html`, `Sidebar.css`, `Sidebar.js`):
     1. Click the **+** (Add a file) icon -> Select **HTML**.
     2. Name it exactly (e.g., `Sidebar.html`, `Sidebar.css`, `Sidebar.js` — note that in Apps Script, even CSS and JS files can be added as HTML files and they will be evaluated cleanly by our dynamic inclusion engine).
     3. Paste the contents into the editor.
4. **Save Your Changes:**
   - Click the 💾 **Save Project** icon at the top of the editor or press `Ctrl + S` (`Cmd + S` on Mac).
5. **Reload Your Google Sheet:**
   - Go back to your Google Sheets browser window and refresh the page (`F5`).
6. **Initialize the Database (One-Click):**
   - Once reloaded, a custom menu option called **"Agrodemy LMS"** will appear in the top Google Sheets toolbar.
   - Click **Agrodemy LMS** -> **Initialize System Database**.
   - Grant the necessary Google authorization permissions if prompted (this is standard for spreadsheet scripts accessing your sheet/email services).
   - The application will automatically detect, format, style, and build all 12 necessary worksheets with headers and lookup tables.
7. **Launch the Sidebar:**
   - Click **Agrodemy LMS** -> **Launch LMS Sidebar**.
   - The interactive Agrodemy success console will slide open on the right-hand side of your sheet!

---

### Method B: Automated Setup (Using Clasp CLI)

If you are a developer looking to deploy files programmatically from your command line:

1. **Install clasp globally:**
   ```bash
   npm install -g @google/clasp
   ```
2. **Login to Google Account:**
   ```bash
   clasp login
   ```
3. **Clone your container-bound project:**
   Make sure you have enabled the Google Apps Script API under your Google Script settings.
   ```bash
   clasp clone "YOUR_SPREADSHEET_SCRIPT_ID"
   ```
4. **Push files to Google Drive:**
   ```bash
   clasp push
   ```
5. **Reload the spreadsheet and run Initialization** as described in Method A.

---

## 🏛 Clean Multi-Layered Architecture

The codebase follows enterprise-level Clean Software Engineering standards, strictly separating execution layers. This decoupling guarantees that business logic is completely independent of the UI and data layers, enabling flawless scalability for over 10,000+ learners.

```
                    +-----------------------------------------+
                    |            PRESENTATION LAYER           |
                    |  Sidebar.html / Sidebar.css / Sidebar.js|
                    |  Modular UI Components & CSS Styles     |
                    +--------------------+--------------------+
                                         |
                                         v
                    +--------------------+--------------------+
                    |            APPLICATION LAYER            |
                    |  Client State Manager (AppState)        |
                    |  API Manager Client Interfaces          |
                    +--------------------+--------------------+
                                         |
                                         v
                    +--------------------+--------------------+
                    |              SERVER LAYER               |
                    |  CRUD & Domain Modules (Learners.gs,    |
                    |  Support.gs, Certificates.gs, etc.)     |
                    +--------------------+--------------------+
                                         |
                                         v
                    +--------------------+--------------------+
                    |         DATA ACCESS & SERVICES          |
                    |  SpreadsheetService (Batch reads/writes) |
                    |  IDGenerator / EmailService / Activity  |
                    +--------------------+--------------------+
                                         |
                                         v
                    +--------------------+--------------------+
                    |         GOOGLE SHEETS DATABASE          |
                    +-----------------------------------------+
```

### Layer Details:
1. **Presentation Layer (`Sidebar.html`, `Sidebar.css`)**: Implements modern, responsive, and fluid UI utilizing the Agrodemy color palette, CSS variables, and Google Material Icons. No inline JavaScript or CSS is written.
2. **Application Layer (`Sidebar.js`)**: Contains a single global frontend client-side state controller (`AppState`) which caches configuration drop-downs, active filtered list views, sorting criteria, and page allocations. All operations interface with standard `google.script.run` endpoints.
3. **Server Layer (`Learners.gs`, `Support.gs`, `Certificates.gs`, `Dashboard.gs`, `Reports.gs`, `Settings.gs`)**: Encapsulates specific domain workflows. Every single function returns a structured server response wrapper contract:
   - **Success Envelope:** `{ success: true, message: "...", data: {} }`
   - **Failure Envelope:** `{ success: false, message: "...", errors: [] }`
4. **Data Access Layer (`Spreadsheet.gs`, `Utilities.gs`, `Email.gs`, `Activity.gs`, `Validation.gs`)**: Wraps spreadsheet interactions into batched array mutations, minimizing slow API calls. Also implements secure sequential ID calculations (`LRN-000001`, `TKT-000001`), validation rules, and automated mail substitution dispatches.

---

## 🧪 Local Testing & Automated Quality Assurance

To test the application locally without deploying to Google Services, run our custom mock test script. It runs in your development container and asserts ID sequencer limits, email substitutions, and validator constraints cleanly:

```bash
node LocalMockTests.js
```

---

## 🎨 Branding Parameters

To ensure consistency with the Agrodemy identity, all UI layouts inherit from standard styling custom properties:

* **Primary Emerald:** `#26AD38`
* **Secondary Amber:** `#FFD737`
* **Deep Space Navy:** `#152848`
* **Ocean Accent Blue:** `#0274BE`
* **Alert Orange:** `#FF6900`
* **Neutral Grey:** `#EEEEEE`

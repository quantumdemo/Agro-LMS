# Agrodemy Learning Management System (LMS) - Future Architectural Suggestions

This document outlines professional recommendations, optimization paths, and architectural enhancements for the next phases of the Agrodemy LMS.

---

## 🚀 1. Advanced Caching (Apps Script CacheService)
*   **Current State:** Every startup call fetches the database sheets from scratch via `SpreadsheetService.readAll()`. While fast for < 500 records, this can introduce lag at scale (10,000+ records) due to multiple backend operations.
*   **Suggestion:** Implement a tiered caching layer leveraging Google Apps Script **CacheService** (specifically `CacheService.getUserCache()`).
    *   Cache parsed settings configuration and learners JSON payloads for 15-25 minutes.
    *   Invalidate and clear cache programmatically on critical writes (Onboard, Edit Status, Support ticket changes).
    *   This will reduce sidebar initial load times to under **150ms**!

## 🔐 2. Enterprise Authentication & Role-Based Access Control (RBAC)
*   **Current State:** Permissions are currently inherited directly from Google Sheet editors. Any editor of the spreadsheet can launch and execute the entire LMS Success Console.
*   **Suggestion:** Introduce explicit user roles:
    *   `Admin`: Complete control over template customization and report generation.
    *   `Coach (Officer)`: Restricted to viewing and editing profiles of students explicitly assigned to them.
    *   `Support Agent`: Restricted to reading and updating Support Logs.
    *   *Implementation:* Store a master lookup of authorized users and their assigned roles in the `Settings` worksheet and enforce role checking within `doGet` and all global Apps Script functions.

## 📈 3. Native Spreadsheet Charts Customization & Dynamic Filters
*   **Current State:** Charts are updated statically on data edits and placed at rows 12-30.
*   **Suggestion:** Move all data table representations (backing data) into a dedicated, hidden sheet (e.g. `DashboardData`) and leave the main `Dashboard` sheet reserved purely for high-fidelity native visual charts.
*   *Interactive Filter Controls:* Implement **Google Sheets Slicers** on the `Dashboard` worksheet so that officers can dynamically filter charts directly on the physical sheet with visual buttons (e.g., filter by Program, Status, or Assigned Coach).

## 📊 4. Batch Operations for Certificate Issuance
*   **Current State:** Certificate eligibility is evaluated individually per learner.
*   **Suggestion:** Create a "Bulk Release Center" inside the Certificates tab where Officers can multi-select eligible learners using checkboxes and click "Generate Certificates in Bulk" to batch-release serial IDs, append rows, and dispatch congratulations emails in one unified background job, minimizing execution time.

## 📧 5. Email Queueing & Rate Limit Safeguards
*   **Current State:** Email dispatch is triggered synchronously during learner/ticket updates. This can occasionally exceed Google's standard daily email quotas (typically 100/day for consumer accounts or 1500/day for Workspace accounts).
*   **Suggestion:** Create an asynchronous email queue inside a worksheet `EmailQueue`.
    *   Synchronous code appends mail requests to the queue sheet.
    *   A timed Google Apps Script trigger runs every 10 minutes, fetches un-sent queue items, and sends them in small batches.
    *   This prevents UI blocking and protects the system from crashing if Google rate limits are reached.

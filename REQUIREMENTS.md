# Agrodemy LMS - Requirements Engineering & System Analysis Specification

## 1. Functional Requirements

### 1.1 Learner Management
- **FR-1.1.1 (Create)**: Learning Success Officers must be able to create new learners with standard profile fields.
- **FR-1.1.2 (Read/Search)**: Officers must be able to search and list learners by Full Name, Email, or Learner ID with responsive client-side filtering.
- **FR-1.1.3 (Update)**: Officers must be able to update any active learner fields (excluding the unique read-only ID).
- **FR-1.1.4 (Archive/Restore)**: Officers must be able to soft-delete (archive) active learners and restore them if necessary, keeping database history clean.
- **FR-1.1.5 (Pagination)**: Display learners in paginated tables (10, 25, 50 rows per page) to support large scales (10,000+ entries) without slowing down the Sidebar UI.
- **FR-1.1.6 (Progress Tracking)**: Track Current Module and Progress % dynamically, assigning officers to learners.

### 1.2 Support Ticket Management
- **FR-1.2.1 (Create Ticket)**: Open support tickets linked to active learners with Category, Description, and Priority.
- **FR-1.2.2 (Update Ticket)**: Manage ticket status (Open, In Progress, Closed), assignment, notes, and resolution date.
- **FR-1.2.3 (Ticket Linking)**: Directly connect support tickets to learners, auto-updating `SupportStatusID` in the Learner worksheet.

### 1.3 Certificate Management
- **FR-1.3.1 (Eligibility)**: Automatically identify learners eligible for certificates based on their progress (e.g., Progress % is 100%, Status is 'Completed', and Certificate status is 'Eligible').
- **FR-1.3.2 (Issuance)**: Generate certificates with sequential custom IDs (`CERT-XXXXXX`), timestamps, and links.
- **FR-1.3.3 (Verification)**: Allow lookup and verification of certificates by unique Certificate ID.

### 1.4 Dashboard & Real-Time Analytics
- **FR-1.4.1 (KPI Cards)**: Provide real-time high-level summaries of Active Learners, Total Programs, Open Tickets, Issued Certificates, and Risk Assessment (number of learners with Status 'At Risk').
- **FR-1.4.2 (Analytics Charts)**: Display breakdown charts showing Learner status distribution, Ticket category distributions, and Programme enrollment stats.
- **FR-1.4.3 (Recent Activity Log)**: Render a live feed of the last 5 activities performed on the system.

### 1.5 Notification Engine
- **FR-1.5.1 (Automated Dispatch)**: Send standard notifications using editable HTML templates on important state changes (e.g. registration, certificate issuance, ticket updates).
- **FR-1.5.2 (Manual Dispatch)**: Let officers select template or custom text and send directly to any learner.

### 1.6 Settings & System Configuration
- **FR-1.6.1 (Metadata Management)**: Edit Programs, Officers, and Categories directly in lookup tables.
- **FR-1.6.2 (Template Management)**: Edit template subjects and body text directly from Settings.

---

## 2. Non-Functional Requirements

- **NFR-2.1 (Performance)**: Minimize Spreadsheet App reads/writes. Execute search and pagination on cached client-side AppState. Batch write state changes to Sheets.
- **NFR-2.2 (Security)**: Sanitize all inputs to prevent injection attacks. Enforce validation schemas on server and client.
- **NFR-2.3 (Scalability)**: Design schemas and indices using binary lookup algorithms or hash tables to cleanly scale to 10,000+ learners.
- **NFR-2.4 (Portability)**: Rely entirely on container-bound scripts via `SpreadsheetApp.getActiveSpreadsheet()` to make project deployment instant and self-contained.

---

## 3. System Architecture & Separation of Concerns

```
                  +-----------------------------------------+
                  |            PRESENTATION LAYER           |
                  |  Sidebar.html / Sidebar.css / Sidebar.js|
                  |  Modular UI Components (Modal, Table,   |
                  |  Cards, Charts, Forms, Pagination)      |
                  +--------------------+--------------------+
                                       |
                                       v
                  +--------------------+--------------------+
                  |            APPLICATION LAYER            |
                  |  Client State Manager (AppState)        |
                  |  API Manager (google.script.run wrapper)|
                  |  UI Manager & Event Router              |
                  +--------------------+--------------------+
                                       |
                                       v
                  +--------------------+--------------------+
                  |              SERVER LAYER               |
                  |  Learner, Support, Certificate,         |
                  |  Dashboard, Reports, Settings, Activity  |
                  +--------------------+--------------------+
                                       |
                                       v
                  +--------------------+--------------------+
                  |       DATA ACCESS / SERVICE LAYER       |
                  |  SpreadsheetService (Batch reads/writes) |
                  |  IDGenerationService (Unique sequence)   |
                  |  EmailService (Placeholder engine)       |
                  +--------------------+--------------------+
                                       |
                                       v
                  +--------------------+--------------------+
                  |         GOOGLE SHEETS DATABASE          |
                  +-----------------------------------------+
```

---

## 4. Business Workflow & User Journeys

1. **Onboard Learner**:
   - Officer inputs details -> Server checks Email and Phone uniqueness -> Generates ID `LRN-000001` -> Saves to `Learners` sheet -> Appends to `Activity Log` -> Dispatches automatic Welcome Email -> Updates UI client State.
2. **Issue Certificate**:
   - Learner hits 100% -> State changes to Completed -> Certificate status becomes Eligible -> Officer clicks "Issue Certificate" -> Server generates `CERT-000001`, writes to `Certificates` tracker, updates `Learners` sheet, logs activity, sends congratulations email with certificate info -> UI re-renders.
3. **Resolve Ticket**:
   - Learner reports issue -> Support Ticket `TKT-000001` generated -> Status: Open -> Officer updates status to In Progress and assigns to an Officer -> Resolution Notes added -> Status set to Closed -> Logs activity -> Dispatches support resolution email -> Updates UI state.

---

## 5. Standard Server Response API Contract

Every Apps Script function called from client-side JavaScript will return a unified envelope structure:

### Success Case
```json
{
  "success": true,
  "message": "Learner successfully created.",
  "data": {
    "learner": {
      "LearnerID": "LRN-000001",
      "FullName": "Abebe Bikila",
      "Email": "abebe@example.com",
      "Phone": "+251911000000",
      "ProgramID": "PRG-000001",
      "EnrollmentDate": "2023-10-25",
      "CurrentModule": "Module 1: Intro to Agri-Business",
      "Progress%": 0.0,
      "LastLogin": "2023-10-25",
      "StatusID": "ST01",
      "CertificateStatusID": "C01",
      "SupportStatusID": "SP01",
      "LastContact": "2023-10-25",
      "OfficerID": "OFF-000001",
      "Notes": "Initial enrollment."
    }
  },
  "errors": []
}
```

### Failure Case
```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null,
  "errors": [
    "A learner with email abebe@example.com already exists."
  ]
}
```

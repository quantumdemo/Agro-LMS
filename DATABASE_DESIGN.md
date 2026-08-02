# Database & Schema Design Specification

This document details the layout, properties, purposes, and validation rules for each of the 12 worksheets in the Agrodemy LMS Database.

---

## 1. Sheet: `README`
- **Purpose**: Describes the spreadsheet version, manual instructions, and serves as an entry/info point.
- **Columns**: Single column containing introductory notes.
- **Primary Key**: None.

---

## 2. Sheet: `Settings`
- **Purpose**: Contains program catalogs, active training officers, general configurations, and default email templates. To be compatible with existing workbook structures, it maintains multiple tables on one worksheet, divided by standard header sections.
- **Structures**:
  - **Programs**: `ProgramID` (PK, e.g. `P001`), `ProgramName`
  - **Officers**: `OfficerID` (PK, e.g. `O001`), `OfficerName`, `Email`
  - **LearnerStatus**: `StatusID` (PK, e.g. `ST01`), `Description`
  - **CertificateStatus**: `CertificateStatusID` (PK, e.g. `C01`), `Description`
  - **SupportStatus**: `SupportStatusID` (PK, e.g. `SP01`), `Description`
  - **IssueCategories**: `IssueCategoryID` (PK, e.g. `IC01`), `Category`
  - **EmailTemplates**: `Template` (PK, e.g. `Welcome`), `Subject`, `Body`

---

## 3. Sheet: `Learners`
- **Purpose**: Stores active and archived learner profiles.
- **Primary Key**: `LearnerID` (Format: `LRN-XXXXXX`)
- **Uniqueness Check**: `Email` must be globally unique across active records.
- **Columns & Data Dictionary**:
  1. `LearnerID` (String, PK)
  2. `FullName` (String)
  3. `Email` (String, Unique)
  4. `Phone` (String)
  5. `ProgramID` (String, FK -> `Settings` ProgramID)
  6. `EnrollmentDate` (Date, YYYY-MM-DD)
  7. `CurrentModule` (String)
  8. `Progress%` (Number, 0.0 - 1.0)
  9. `LastLogin` (Date/Time)
  10. `StatusID` (String, FK -> `Settings` StatusID)
  11. `CertificateStatusID` (String, FK -> `Settings` CertificateStatusID)
  12. `SupportStatusID` (String, FK -> `Settings` SupportStatusID)
  13. `LastContact` (Date/Time)
  14. `OfficerID` (String, FK -> `Settings` OfficerID)
  15. `Notes` (String)

---

## 4. Sheet: `SupportLog` (mapped from physical sheet "SupportLog")
- **Purpose**: Audit trails of support tickets opened, resolved, and categorized.
- **Primary Key**: `TicketID` (Format: `TKT-XXXXXX`)
- **Columns**:
  1. `TicketID` (String, PK)
  2. `LearnerID` (String, FK -> `Learners` LearnerID)
  3. `IssueCategoryID` (String, FK -> `Settings` IssueCategoryID)
  4. `Description` (String)
  5. `Priority` (String: `Low`, `Medium`, `High`)
  6. `DateOpened` (Date/Time)
  7. `OfficerID` (String, FK -> `Settings` OfficerID)
  8. `TicketStatus` (String: `Open`, `In Progress`, `Closed`)
  9. `ResolutionDate` (Date/Time, Nullable)
  10. `Notes` (String)

---

## 5. Sheet: `CertificateTracker`
- **Purpose**: Audits issued certificates and tracks completion data.
- **Primary Key**: `CertRecordID` (Format: `CRT-XXXXXX`)
- **Columns**:
  1. `CertRecordID` (String, PK)
  2. `LearnerID` (String, FK -> `Learners` LearnerID)
  3. `ProgramID` (String, FK -> `Settings` ProgramID)
  4. `CompletionDate` (Date)
  5. `CertificateStatusID` (String, FK -> `Settings` CertificateStatusID)
  6. `CertificateDate` (Date)
  7. `CertificateID` (String, Unique, Format: `CERT-XXXXXX`)
  8. `CertificateLink` (String)

---

## 6. Sheet: `Dashboard`
- **Purpose**: Standard KPI formula metrics configured by the system on workbook initialization.
- **Fields**: Formula cells showing Total Learners, Active, Completed, At Risk, Total Certificates, Total Tickets, Open Tickets.

---

## 7. Sheet: `ActivityLog`
- **Purpose**: Full-audit traceability of system actions.
- **Primary Key**: `LogID` (Format: `LOG-XXXXXX`)
- **Columns**:
  1. `LogID` (String, PK)
  2. `Timestamp` (Date/Time)
  3. `User` (String, acting officer or system)
  4. `Module` (String, e.g. `Learners`, `Support`, `Certificates`)
  5. `Action` (String, e.g. `CREATE`, `UPDATE`, `ARCHIVE`)
  6. `TargetRecord` (String, target ID)
  7. `Details` (String)
  8. `Result` (String, e.g. `SUCCESS`, `FAILURE`)

---

## 8. Unique ID Generation Rules
To scale cleanly without duplicates, the ID Generator Service reads the target worksheet, scans existing rows to extract the highest numeric suffix matching a prefix pattern (e.g. `LRN-(\d+)`), increments it, and writes the row.
- **Learners**: `LRN-000001`
- **Support Tickets**: `TKT-000001`
- **Certificates**: `CERT-000001`
- **Cert Records**: `CRT-000001`
- **Log ID**: `LOG-000001`
- **Officer ID**: `OFF-000001`
- **Program ID**: `PRG-000001`

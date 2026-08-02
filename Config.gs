/**
 * Config.gs
 * Global application settings, configuration schemas, and column mapping indexes.
 *
 * @author Jules (Lead Software Architect)
 */

var CONFIG = {
  VERSION: "1.0.0",
  APP_TITLE: "Agrodemy LMS",

  // Sheet Names
  SHEETS: {
    README: "README",
    SETTINGS: "Settings",
    LEARNERS: "Learners",
    SUPPORT: "SupportLog",
    CERTIFICATES: "CertificateTracker",
    DASHBOARD: "Dashboard",
    ACTIVITY_LOG: "ActivityLog"
  },

  // Color Palette
  COLORS: {
    PRIMARY: "#26AD38",
    SECONDARY: "#FFD737",
    DARK: "#152848",
    BLUE: "#0274BE",
    ACCENT: "#046BD2",
    ORANGE: "#FF6900",
    GREY: "#808285",
    LIGHT_GREY: "#EEEEEE",
    BLACK: "#111111"
  },

  // Header Schemas for dynamic verification and initialization
  SCHEMAS: {
    LEARNERS: [
      "LearnerID", "FullName", "Email", "Phone", "ProgramID",
      "EnrollmentDate", "CurrentModule", "Progress%", "LastLogin",
      "StatusID", "CertificateStatusID", "SupportStatusID",
      "LastContact", "OfficerID", "Notes"
    ],
    SUPPORT: [
      "TicketID", "LearnerID", "IssueCategoryID", "Description",
      "Priority", "DateOpened", "OfficerID", "TicketStatus",
      "ResolutionDate", "Notes"
    ],
    CERTIFICATES: [
      "CertRecordID", "LearnerID", "ProgramID", "CompletionDate",
      "CertificateStatusID", "CertificateDate", "CertificateID", "CertificateLink"
    ],
    ACTIVITY_LOG: [
      "LogID", "Timestamp", "User", "Module", "Action", "TargetRecord", "Details", "Result"
    ]
  }
};

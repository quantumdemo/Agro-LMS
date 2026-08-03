/**
 * Triggers.gs
 * Universal sheet triggers, menu additions, and Startup Initialization Service.
 *
 * @author Jules (Lead Software Architect)
 */

/**
 * Triggered on spreadsheet open. Installs Agrodemy custom menu.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("Agrodemy LMS")
    .addItem("Launch LMS Sidebar", "showSidebar")
    .addSeparator()
    .addItem("Initialize System Database", "initializeDatabase")
    .addToUi();

  // Initialize on open to guarantee database sheets are active
  initializeDatabaseQuietly();
}

/**
 * Displays the single page sidebar application.
 */
function showSidebar() {
  var template = HtmlService.createTemplateFromFile("Sidebar");
  var html = template.evaluate()
    .setTitle("Agrodemy LMS Success Console")
    .setWidth(350);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Initializes/verifies worksheets, creating missing ones dynamically.
 * Invoked manually via custom menu with UI alerts.
 */
function initializeDatabase() {
  var result = runInitializationFlow();
  var ui = SpreadsheetApp.getUi();
  if (result.success) {
    ui.alert("Success", result.message, ui.ButtonSet.OK);
  } else {
    ui.alert("Error", "Failed to initialize database: " + result.errors.join("\n"), ui.ButtonSet.OK);
  }
}

function initializeDatabaseQuietly() {
  runInitializationFlow();
}

/**
 * Core initialization business logic.
 */
function runInitializationFlow() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var createdSheets = [];

    // 1. Check & Create standard sheets
    var requiredSheets = [
      CONFIG.SHEETS.README,
      CONFIG.SHEETS.SETTINGS,
      CONFIG.SHEETS.LEARNERS,
      CONFIG.SHEETS.SUPPORT,
      CONFIG.SHEETS.CERTIFICATES,
      CONFIG.SHEETS.DASHBOARD,
      CONFIG.SHEETS.ACTIVITY_LOG
    ];

    for (var i = 0; i < requiredSheets.length; i++) {
      var name = requiredSheets[i];
      var sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        createdSheets.push(name);

        // Seed default schema headers
        var schema = CONFIG.SCHEMAS[name.toUpperCase()];
        if (schema) {
          sheet.appendRow(schema);
          sheet.getRange(1, 1, 1, schema.length)
            .setBackground(CONFIG.COLORS.PRIMARY)
            .setFontColor("#FFFFFF")
            .setFontWeight("bold");
        }
      }
    }

    // 2. Setup Lookup Tables inside Settings if newly created/empty
    var settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
    if (settingsSheet && settingsSheet.getLastRow() < 2) {
      seedSettingsWorksheet(settingsSheet);
    }

    // 3. Seed README instructions if empty
    var readmeSheet = ss.getSheetByName(CONFIG.SHEETS.README);
    if (readmeSheet && readmeSheet.getLastRow() < 2) {
      readmeSheet.appendRow(["Google Sheets LMS Workbook"]);
      readmeSheet.appendRow(["Import this workbook into Google Sheets and continue with Apps Script."]);
      readmeSheet.getRange("A1").setFontSize(16).setFontWeight("bold");
    }

    ActivityService.logActivity(
      "System",
      "INITIALIZE",
      "N/A",
      "Completed database auto-checks. Created: " + (createdSheets.join(", ") || "None"),
      "SUCCESS"
    );

    return createSuccessResponse("Database initialization check complete. Verified or built: " + requiredSheets.join(", "));
  } catch (e) {
    Logger.log("Initialization error: " + e.message);
    return createFailureResponse("Failed during dynamic workbook initialization.", e.message);
  }
}

/**
 * Seeds default data, templates and lookup lists inside Settings worksheet.
 */
function seedSettingsWorksheet(sheet) {
  var elements = [
    ["CertificateTemplateID", "N/A", ""],
    ["", "", ""],
    ["Programs", "", ""],
    ["ProgramID", "ProgramName", ""],
    ["P001", "Career Agribusiness Certification", ""],
    ["P002", "Agro Digital Officer Certification", ""],
    ["P003", "Agribusiness Finance", ""],
    ["P004", "Agritech Innovation", ""],
    ["", "", ""],
    ["Officers", "", ""],
    ["OfficerID", "OfficerName", "Email"],
    ["O001", "Officer One", "officer1@example.com"],
    ["O002", "Officer Two", "officer2@example.com"],
    ["", "", ""],
    ["LearnerStatus", "", ""],
    ["StatusID", "Description", ""],
    ["ST01", "Active", ""],
    ["ST02", "Completed", ""],
    ["ST03", "At Risk", ""],
    ["ST04", "Suspended", ""],
    ["ST05", "Withdrawn", ""],
    ["", "", ""],
    ["CertificateStatus", "", ""],
    ["CertificateStatusID", "Description", ""],
    ["C01", "Pending", ""],
    ["C02", "Eligible", ""],
    ["C03", "Issued", ""],
    ["", "", ""],
    ["SupportStatus", "", ""],
    ["SupportStatusID", "Description", ""],
    ["SP01", "No Tickets", ""],
    ["SP02", "Open Ticket", ""],
    ["SP03", "In Progress", ""],
    ["SP04", "Closed", ""],
    ["", "", ""],
    ["IssueCategories", "", ""],
    ["IssueCategoryID", "Category", ""],
    ["IC01", "Login", ""],
    ["IC02", "Payment", ""],
    ["IC03", "Assignment", ""],
    ["IC04", "Certificate", ""],
    ["IC05", "Technical", ""],
    ["IC06", "Other", ""],
    ["", "", ""],
    ["EmailTemplates", "", ""],
    ["Template", "Subject", "Body"],
    ["Welcome", "Welcome to Agrodemy, {{FullName}}!", "Hello {{FullName}},\n\nWelcome to Agrodemy LMS. Your unique ID is {{LearnerID}}.\n\nWarm regards,\nLearning success team."],
    ["Reminder", "Learning Progress Reminder", "Hello {{FullName}},\n\nYour progress is currently {{Progress%}}% in module {{CurrentModule}}.\n\nBest,\nYour Coach."],
    ["Certificate", "Congratulations! Your Certificate is Issued", "Hello {{FullName}},\n\nCongratulations! You successfully completed {{ProgramName}}.\nCertificate: {{CertificateID}}.\nLink: {{CertificateLink}}\n\nRegards,\nBoard of Agrodemy."],
    ["Support", "Support Ticket update [{{TicketID}}]", "Hello {{FullName}},\n\nYour support ticket is updated.\nStatus: {{TicketStatus}}\nNotes: {{Notes}}\n\nBest,\nAgrodemy Support."]
  ];

  sheet.getRange(1, 1, elements.length, 3).setValues(elements);
}

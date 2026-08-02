/**
 * Settings.gs
 * Settings, Lookups, and Email Template customizer management.
 *
 * @author Jules (Lead Software Architect)
 */

var SettingsModule = (function() {

  /**
   * Retrieves lookup data lists and customizable config parameters.
   */
  function getSystemConfiguration() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
      if (!sheet) {
        return createFailureResponse("Settings sheet not initialized.");
      }

      var data = sheet.getRange(1, 1, sheet.getLastRow(), Math.min(sheet.getLastColumn(), 3)).getValues();
      var config = {
        programs: [],
        officers: [],
        learnerStatuses: [],
        certificateStatuses: [],
        supportStatuses: [],
        issueCategories: [],
        emailTemplates: []
      };

      var currentSection = "";

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        var cell0 = row[0] ? String(row[0]).trim() : "";
        var cell1 = row[1] ? String(row[1]).trim() : "";
        var cell2 = row[2] ? String(row[2]).trim() : "";

        if (cell0 && !cell1 && !cell2) {
          // Section header definition
          currentSection = cell0;
          continue;
        }

        if (!cell0 && !cell1 && !cell2) continue; // Skip empty spacing row

        // Skip header field descriptions
        if (cell0 === "ProgramID" || cell0 === "OfficerID" || cell0 === "StatusID" ||
            cell0 === "CertificateStatusID" || cell0 === "SupportStatusID" ||
            cell0 === "IssueCategoryID" || cell0 === "Template") {
          continue;
        }

        if (currentSection === "Programs" && cell0) {
          config.programs.push({ id: cell0, name: cell1 });
        } else if (currentSection === "Officers" && cell0) {
          config.officers.push({ id: cell0, name: cell1, email: cell2 });
        } else if (currentSection === "LearnerStatus" && cell0) {
          config.learnerStatuses.push({ id: cell0, description: cell1 });
        } else if (currentSection === "CertificateStatus" && cell0) {
          config.certificateStatuses.push({ id: cell0, description: cell1 });
        } else if (currentSection === "SupportStatus" && cell0) {
          config.supportStatuses.push({ id: cell0, description: cell1 });
        } else if (currentSection === "IssueCategories" && cell0) {
          config.issueCategories.push({ id: cell0, category: cell1 });
        } else if (currentSection === "EmailTemplates" && cell0) {
          config.emailTemplates.push({ template: cell0, subject: cell1, body: cell2 });
        }
      }

      return createSuccessResponse("System configuration & lookups retrieved successfully.", config);
    } catch (e) {
      Logger.log("Error in SettingsModule.getSystemConfiguration: " + e.message);
      return createFailureResponse("Failed to fetch settings configurations.", e.message);
    }
  }

  /**
   * Overwrites or saves modified system email templates.
   */
  function saveEmailTemplates(templatesList) {
    try {
      if (!Array.isArray(templatesList)) {
        return createFailureResponse("Invalid templates input payload.");
      }

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
      if (!sheet) return createFailureResponse("Settings sheet not initialized.");

      var data = sheet.getRange(1, 1, sheet.getLastRow(), 3).getValues();
      var templatesHeaderRow = -1;

      // Locate the start of EmailTemplates block
      for (var r = 0; r < data.length; r++) {
        if (String(data[r][0]).trim() === "EmailTemplates") {
          templatesHeaderRow = r + 1; // 1-based index row
          break;
        }
      }

      if (templatesHeaderRow === -1) {
        return createFailureResponse("EmailTemplates block location could not be determined.");
      }

      // We will read all rows up to EmailTemplates block, keep them, then overwrite everything after.
      var keptRows = data.slice(0, templatesHeaderRow + 1); // keep EmailTemplates title + headers

      // Append the new customized template parameters
      for (var i = 0; i < templatesList.length; i++) {
        var t = templatesList[i];
        keptRows.push([t.template, t.subject, t.body]);
      }

      // Clear sheet and overwrite with combined array safely
      sheet.clearContents();
      sheet.getRange(1, 1, keptRows.length, 3).setValues(keptRows);

      ActivityService.logActivity(
        "Settings",
        "UPDATE_TEMPLATES",
        "EmailTemplates",
        "Modified system notification templates.",
        "SUCCESS"
      );

      return createSuccessResponse("Email templates updated successfully.");
    } catch (e) {
      Logger.log("Error in SettingsModule.saveEmailTemplates: " + e.message);
      return createFailureResponse("Failed to update email templates in worksheet.", e.message);
    }
  }

  return {
    getSystemConfiguration: getSystemConfiguration,
    saveEmailTemplates: saveEmailTemplates
  };
})();

// Public Global API mappings called from client JS
function apiGetSystemConfiguration() { return SettingsModule.getSystemConfiguration(); }
function apiSaveEmailTemplates(templates) { return SettingsModule.saveEmailTemplates(templates); }

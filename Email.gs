/**
 * Email.gs
 * Infrastructure Email Dispatch Service.
 * Leverages customizable templates with automated substitution logic and MailApp.
 *
 * @author Jules (Lead Software Architect)
 */

var EmailService = (function() {

  /**
   * Dispatches email templates from Settings.
   */
  function sendTemplateEmail(recipientEmail, templateName, replacements) {
    try {
      if (!recipientEmail || recipientEmail.trim() === "") {
        return createFailureResponse("Invalid recipient email.");
      }

      // 1. Fetch dynamic learner attributes to support generic column placeholders
      var dynamicReplacements = {};
      if (replacements) {
        // Copy initial replacements
        for (var k in replacements) {
          if (replacements.hasOwnProperty(k)) {
            dynamicReplacements[k] = replacements[k];
          }
        }
      }

      // Try to read full record of the learner matching recipientEmail or LearnerID if provided
      var lookupVal = recipientEmail;
      var lookupCol = "Email";
      if (replacements && replacements.LearnerID) {
        lookupVal = replacements.LearnerID;
        lookupCol = "LearnerID";
      }

      try {
        var learners = SpreadsheetService.readAll(CONFIG.SHEETS.LEARNERS);
        var foundLearner = null;
        for (var i = 0; i < learners.length; i++) {
          if (String(learners[i][lookupCol]).trim().toLowerCase() === String(lookupVal).trim().toLowerCase()) {
            foundLearner = learners[i];
            break;
          }
        }

        if (foundLearner) {
          // Auto-map ALL columns from the Learners sheet dynamically
          for (var col in foundLearner) {
            if (foundLearner.hasOwnProperty(col)) {
              var val = foundLearner[col];
              if (col === "Progress%") {
                // Support both progress replacement tags
                var floatVal = parseFloat(val) || 0;
                dynamicReplacements["Progress%"] = Math.round(floatVal * 100) + "%";
                dynamicReplacements["Progress%_Raw"] = floatVal;
              } else {
                dynamicReplacements[col] = val;
              }
            }
          }
        }
      } catch (errCol) {
        Logger.log("Dynamic header fetch failed, using fallback placeholders only: " + errCol.message);
      }

      // 1b. Fetch ticket details if TicketID is present
      if (replacements && replacements.TicketID) {
        try {
          var tickets = SpreadsheetService.readAll(CONFIG.SHEETS.SUPPORT);
          var foundTicket = null;
          for (var t = 0; t < tickets.length; t++) {
            if (String(tickets[t].TicketID).trim().toLowerCase() === String(replacements.TicketID).trim().toLowerCase()) {
              foundTicket = tickets[t];
              break;
            }
          }
          if (foundTicket) {
            for (var tKey in foundTicket) {
              if (foundTicket.hasOwnProperty(tKey) && dynamicReplacements[tKey] === undefined) {
                dynamicReplacements[tKey] = foundTicket[tKey];
              }
            }
          }
        } catch (errTicket) {
          Logger.log("Ticket fetch for placeholders failed: " + errTicket.message);
        }
      }

      // 1c. Resolve master list configuration details (Programs, Officers, Categories, Statuses)
      var systemConfig = null;
      try {
        var configResponse = SettingsModule.getSystemConfiguration();
        if (configResponse.success) {
          systemConfig = configResponse.data;
        }
      } catch (eConfig) {
        Logger.log("Could not load system configurations for email replacements: " + eConfig.message);
      }

      // 1d. Handle and resolve specific placeholder aliases
      // Program / Programme Name resolution
      var rawProgramID = dynamicReplacements["ProgramID"] || (foundLearner ? foundLearner.ProgramID : "");
      var resolvedProgramName = rawProgramID;
      if (systemConfig && systemConfig.programs) {
        for (var p = 0; p < systemConfig.programs.length; p++) {
          if (String(systemConfig.programs[p].id).trim().toLowerCase() === String(rawProgramID).trim().toLowerCase()) {
            resolvedProgramName = systemConfig.programs[p].name;
            break;
          }
        }
      }
      dynamicReplacements["Programme"] = resolvedProgramName;
      dynamicReplacements["ProgramName"] = resolvedProgramName;

      // Officer Name resolution
      var rawOfficerID = dynamicReplacements["OfficerID"] || (foundLearner ? foundLearner.OfficerID : "");
      var resolvedOfficerName = rawOfficerID;
      if (systemConfig && systemConfig.officers) {
        for (var o = 0; o < systemConfig.officers.length; o++) {
          if (String(systemConfig.officers[o].id).trim().toLowerCase() === String(rawOfficerID).trim().toLowerCase()) {
            resolvedOfficerName = systemConfig.officers[o].name;
            break;
          }
        }
      }
      dynamicReplacements["OfficerName"] = resolvedOfficerName;

      // Issue Category resolution
      var rawCategoryID = dynamicReplacements["IssueCategoryID"] || "";
      var resolvedCategory = rawCategoryID;
      if (systemConfig && systemConfig.issueCategories) {
        for (var c_idx = 0; c_idx < systemConfig.issueCategories.length; c_idx++) {
          if (String(systemConfig.issueCategories[c_idx].id).trim().toLowerCase() === String(rawCategoryID).trim().toLowerCase()) {
            resolvedCategory = systemConfig.issueCategories[c_idx].category;
            break;
          }
        }
      }
      dynamicReplacements["IssueCategory"] = resolvedCategory;

      // Progress integer resolution
      var progressVal = dynamicReplacements["Progress%"] || (foundLearner ? foundLearner["Progress%"] : "0");
      var floatProgress = parseFloat(progressVal) || 0;
      if (progressVal && String(progressVal).indexOf("%") !== -1) {
        floatProgress = parseFloat(progressVal.replace("%", "")) / 100;
      }
      dynamicReplacements["Progress"] = Math.round(floatProgress * 100);

      // Status resolution
      var resolvedStatus = dynamicReplacements["TicketStatus"] || "";
      if (!resolvedStatus && systemConfig && systemConfig.learnerStatuses && foundLearner) {
        var rawStatusID = foundLearner.StatusID;
        for (var s = 0; s < systemConfig.learnerStatuses.length; s++) {
          if (String(systemConfig.learnerStatuses[s].id).trim().toLowerCase() === String(rawStatusID).trim().toLowerCase()) {
            resolvedStatus = systemConfig.learnerStatuses[s].description;
            break;
          }
        }
      }
      if (!resolvedStatus && foundLearner) {
        resolvedStatus = foundLearner.StatusID;
      }
      dynamicReplacements["Status"] = resolvedStatus || "Active";

      // Issue Date resolution
      dynamicReplacements["IssueDate"] = (replacements && (replacements.CertificateDate || replacements.IssueDate)) || formatDate(new Date());

      // Global constants
      dynamicReplacements["SupportEmail"] = "support@agrodemy.org";
      dynamicReplacements["PortalURL"] = "https://lms.agrodemy.org";

      // Load templates from database settings
      var templates = getCachedTemplates();
      var template = templates[templateName];
      if (!template) {
        // Fallback standard templates if lookup fails
        template = getFallbackTemplate(templateName);
      }

      var substitutedSubject = substitutePlaceholders(template.Subject, dynamicReplacements);
      var substitutedBody = substitutePlaceholders(template.Body, dynamicReplacements);

      MailApp.sendEmail({
        to: recipientEmail,
        subject: substitutedSubject,
        htmlBody: substitutedBody.replace(/\n/g, "<br>")
      });

      ActivityService.logActivity(
        "Notifications",
        "SEND_EMAIL",
        recipientEmail,
        "Dispatched email template: " + templateName + " | Subject: " + substitutedSubject,
        "SUCCESS"
      );

      return createSuccessResponse("Email dispatched successfully.", {
        recipient: recipientEmail,
        template: templateName,
        subject: substitutedSubject
      });
    } catch (e) {
      Logger.log("Error in EmailService.sendTemplateEmail: " + e.message);
      ActivityService.logActivity(
        "Notifications",
        "SEND_EMAIL",
        recipientEmail,
        "Failed to send " + templateName + " template: " + e.message,
        "FAILURE"
      );
      return createFailureResponse("Failed to send template email: " + e.message);
    }
  }

  /**
   * Parses current email templates located in Settings worksheet dynamically.
   */
  function getCachedTemplates() {
    var templates = {};
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
      if (!sheet) return templates;

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2) return templates;

      var data = sheet.getRange(1, 1, lastRow, Math.min(lastCol, 3)).getValues();

      // Email templates reside in Settings with structural headers 'EmailTemplates'
      var foundTemplatesSection = false;
      var headers = [];

      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (row[0] === "EmailTemplates") {
          foundTemplatesSection = true;
          // Next row will be the column headers for EmailTemplates
          if (r + 1 < data.length) {
            headers = data[r + 1].map(function(h) { return String(h).trim(); });
          }
          r += 1; // Skip header row
          continue;
        }

        // If we reach another main section header or empty line, we break out
        if (foundTemplatesSection) {
          if (!row[0] && !row[1]) continue;
          if (row[0] && !row[1] && row[0] !== "Template") {
            // Reached next section
            break;
          }
          if (row[0] === "Template") continue; // Skip header duplicate

          var templateKey = String(row[0]).trim();
          var subject = String(row[1]).trim();
          var body = row[2] ? String(row[2]).trim() : "";

          if (templateKey) {
            templates[templateKey] = {
              Subject: subject,
              Body: body
            };
          }
        }
      }
    } catch (e) {
      Logger.log("Error fetching cached email templates: " + e.message);
    }
    return templates;
  }

  /**
   * Static system fallback email templates in case sheet lookup is empty.
   */
  function getFallbackTemplate(name) {
    var fallbacks = {
      "Welcome": {
        Subject: "Welcome to Agrodemy, {{FullName}}!",
        Body: "Hello {{FullName}},\n\nWelcome to Agrodemy. We are excited to have you onboard.\nYour unique Learner ID is {{LearnerID}}.\n\nWarm regards,\nAgrodemy Operations Team"
      },
      "Reminder": {
        Subject: "Agrodemy Learning Progress Reminder",
        Body: "Hello {{FullName}},\n\nThis is a friendly reminder to review your module progress on Agrodemy. Your current progress is {{Progress%}}%.\n\nKeep up the great work!\nAgrodemy Success Team"
      },
      "Certificate": {
        Subject: "Congratulations on completing your program, {{FullName}}!",
        Body: "Hello {{FullName}},\n\nAwesome news! You have successfully completed your training program: {{ProgramName}}.\nYour certificate number is {{CertificateID}}.\nYou can view/download it here: {{CertificateLink}}\n\nCheers,\nAgrodemy Certification Board"
      },
      "Support": {
        Subject: "Agrodemy Support Request [{{TicketID}}]",
        Body: "Hello {{FullName}},\n\nYour support ticket [{{TicketID}}] has been updated. Details:\n\nStatus: {{TicketStatus}}\nNotes: {{Notes}}\n\nSincerely,\nAgrodemy Support Desk"
      }
    };
    return fallbacks[name] || { Subject: "Agrodemy Alert", Body: "Hello,\n\nThis is an automated notification from Agrodemy." };
  }

  return {
    sendTemplateEmail: sendTemplateEmail,
    getCachedTemplates: getCachedTemplates
  };
})();

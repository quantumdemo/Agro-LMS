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

      // Load templates from database settings
      var templates = getCachedTemplates();
      var template = templates[templateName];
      if (!template) {
        // Fallback standard templates if lookup fails
        template = getFallbackTemplate(templateName);
      }

      var substitutedSubject = substitutePlaceholders(template.Subject, replacements);
      var substitutedBody = substitutePlaceholders(template.Body, replacements);

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

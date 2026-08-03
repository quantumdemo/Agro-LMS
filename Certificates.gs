/**
 * Certificates.gs
 * Certificates Business Module.
 * Calculates completion eligibility, issues secure certificate entries, and verifies them.
 *
 * @author Jules (Lead Software Architect)
 */

var CertificateModule = (function() {

  /**
   * Fetches all registered certificate issue records.
   */
  function getAllCertificates() {
    try {
      var certs = SpreadsheetService.readAll(CONFIG.SHEETS.CERTIFICATES);
      return createSuccessResponse("Certificates retrieved successfully.", certs);
    } catch (e) {
      Logger.log("Error in CertificateModule.getAllCertificates: " + e.message);
      return createFailureResponse("Failed to fetch certificates.", e.message);
    }
  }

  /**
   * Generates a certificate for an eligible learner.
   * If a template document ID is present in Settings, it copies and builds a custom PDF document.
   */
  function issueCertificate(learnerID, programID) {
    try {
      if (!learnerID || !programID) {
        return createFailureResponse("LearnerID and ProgramID are required to issue a certificate.");
      }

      // Check if certificate has already been issued
      var existingCerts = SpreadsheetService.readAll(CONFIG.SHEETS.CERTIFICATES);
      var duplicate = existingCerts.some(function(c) {
        return String(c.LearnerID).trim() === String(learnerID).trim() &&
               String(c.ProgramID).trim() === String(programID).trim() &&
               String(c.CertificateStatusID).trim() === "C03";
      });

      if (duplicate) {
        return createFailureResponse("Certificate already issued for this learner and program.");
      }

      var nextRecordID = IDGenerator.generateNextID(CONFIG.SHEETS.CERTIFICATES, "CRT-");
      var nextCertID = IDGenerator.generateNextID(CONFIG.SHEETS.CERTIFICATES, "CERT-");

      var learner = findLearnerRecord(learnerID);
      var learnerName = learner ? learner.FullName : "Learner";

      // OPTION 9: Dynamic Google Docs PDF template translation
      var certLink = "https://verification.agrodemy.org/verify?id=" + nextCertID;

      try {
        // Look up Doc template ID from Settings sheet if present
        var templateDocID = getTemplateDocIDFromSettings();
        if (templateDocID && templateDocID !== "N/A" && templateDocID !== "") {
          var templateFile = DriveApp.getFileById(templateDocID);
          var copy = templateFile.makeCopy("Certificate - " + learnerName + " [" + nextCertID + "]");
          var copyId = copy.getId();

          var doc = DocumentApp.openById(copyId);
          var body = doc.getBody();
          body.replaceText("{{FullName}}", learnerName);
          body.replaceText("{{ProgramName}}", programID);
          body.replaceText("{{CertificateID}}", nextCertID);
          body.replaceText("{{DateIssued}}", formatDate(new Date()));
          doc.saveAndClose();

          // Generate PDF download link
          var pdfBlob = copy.getAs("application/pdf");
          var pdfFile = DriveApp.createFile(pdfBlob);
          pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          certLink = pdfFile.getUrl();

          // Trash the temporary Google Doc copy to keep drive clean
          copy.setTrashed(true);
        }
      } catch (errDoc) {
        Logger.log("Dynamic PDF creation bypassed or failed (falling back to standard link): " + errDoc.message);
      }

      var newCert = {
        "CertRecordID": nextRecordID,
        "LearnerID": String(learnerID).trim(),
        "ProgramID": String(programID).trim(),
        "CompletionDate": formatDate(new Date()),
        "CertificateStatusID": "C03", // Issued
        "CertificateDate": formatDate(new Date()),
        "CertificateID": nextCertID,
        "CertificateLink": certLink
      };

      // Save record
      SpreadsheetService.appendRecords(
        CONFIG.SHEETS.CERTIFICATES,
        CONFIG.SCHEMAS.CERTIFICATES,
        [newCert]
      );

      // Update CertificateStatusID inside Learners worksheet
      SpreadsheetService.updateRecord(
        CONFIG.SHEETS.LEARNERS,
        "LearnerID",
        learnerID,
        CONFIG.SCHEMAS.LEARNERS,
        { "CertificateStatusID": "C03" } // Issued
      );

      ActivityService.logActivity(
        "Certificates",
        "ISSUE_CERTIFICATE",
        nextCertID,
        "Issued certificate for learner " + learnerID + " for " + programID + " | Link: " + certLink,
        "SUCCESS"
      );

      // Trigger automated congrats email template
      if (learner) {
        EmailService.sendTemplateEmail(learner.Email, "Certificate", {
          "FullName": learner.FullName,
          "ProgramName": programID,
          "CertificateID": nextCertID,
          "CertificateLink": certLink
        });
      }

      return createSuccessResponse("Certificate issued successfully.", { certificate: newCert });
    } catch (e) {
      Logger.log("Error in CertificateModule.issueCertificate: " + e.message);
      return createFailureResponse("Failed to issue certificate.", e.message);
    }
  }

  /**
   * Helper to fetch Template ID from Settings worksheet.
   */
  function getTemplateDocIDFromSettings() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
      if (!sheet) return "";

      var data = sheet.getRange(1, 1, sheet.getLastRow(), 2).getValues();
      for (var r = 0; r < data.length; r++) {
        if (String(data[r][0]).trim() === "CertificateTemplateID") {
          return String(data[r][1]).trim();
        }
      }
    } catch (e) {
      Logger.log("Error finding template doc ID: " + e.message);
    }
    return "";
  }

  /**
   * Dynamic lookup to verify certificate legitimacy.
   */
  function verifyCertificate(certificateID) {
    try {
      if (!certificateID) return createFailureResponse("Certificate ID is required for verification.");

      var certs = SpreadsheetService.readAll(CONFIG.SHEETS.CERTIFICATES);
      var match = null;
      for (var i = 0; i < certs.length; i++) {
        if (String(certs[i].CertificateID).trim().toUpperCase() === String(certificateID).trim().toUpperCase()) {
          match = certs[i];
          break;
        }
      }

      if (!match) {
        return createFailureResponse("No valid certificate matching ID '" + certificateID + "' was found.");
      }

      return createSuccessResponse("Certificate successfully verified.", { certificate: match });
    } catch (e) {
      Logger.log("Error in CertificateModule.verifyCertificate: " + e.message);
      return createFailureResponse("Certificate verification failed.", e.message);
    }
  }

  function findLearnerRecord(learnerID) {
    var learners = SpreadsheetService.readAll(CONFIG.SHEETS.LEARNERS);
    for (var i = 0; i < learners.length; i++) {
      if (String(learners[i].LearnerID).trim() === String(learnerID).trim()) {
        return learners[i];
      }
    }
    return null;
  }

  return {
    getAllCertificates: getAllCertificates,
    issueCertificate: issueCertificate,
    verifyCertificate: verifyCertificate
  };
})();

// Public Global API mappings called from client JS
function apiGetAllCertificates() { return CertificateModule.getAllCertificates(); }
function apiIssueCertificate(learnerID, programID) { return CertificateModule.issueCertificate(learnerID, programID); }
function apiVerifyCertificate(id) { return CertificateModule.verifyCertificate(id); }

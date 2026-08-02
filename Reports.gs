/**
 * Reports.gs
 * Reporting Operations Module.
 * Formulates summaries and exports CSV / JSON structures of statistics.
 *
 * @author Jules (Lead Software Architect)
 */

var ReportsModule = (function() {

  /**
   * Generates a structural dataset of statistics based on modules.
   */
  function generateReport(reportType) {
    try {
      var learners = SpreadsheetService.readAll(CONFIG.SHEETS.LEARNERS);
      var tickets = SpreadsheetService.readAll(CONFIG.SHEETS.SUPPORT);
      var certs = SpreadsheetService.readAll(CONFIG.SHEETS.CERTIFICATES);

      var csvContent = "";
      var filename = reportType + "_Report_" + formatDate(new Date()) + ".csv";

      if (reportType === "LearnerStats") {
        csvContent = "LearnerID,FullName,Email,ProgramID,Progress%,StatusID\n";
        for (var i = 0; i < learners.length; i++) {
          var l = learners[i];
          csvContent += [
            l.LearnerID,
            '"' + String(l.FullName).replace(/"/g, '""') + '"',
            l.Email,
            l.ProgramID,
            l["Progress%"],
            l.StatusID
          ].join(",") + "\n";
        }
      } else if (reportType === "SupportStats") {
        csvContent = "TicketID,LearnerID,IssueCategoryID,Priority,TicketStatus,DateOpened\n";
        for (var j = 0; j < tickets.length; j++) {
          var t = tickets[j];
          csvContent += [
            t.TicketID,
            t.LearnerID,
            t.IssueCategoryID,
            t.Priority,
            t.TicketStatus,
            t.DateOpened
          ].join(",") + "\n";
        }
      } else {
        // Fallback default full audit export
        csvContent = "CertRecordID,LearnerID,ProgramID,CompletionDate,CertificateID\n";
        for (var k = 0; k < certs.length; k++) {
          var c = certs[k];
          csvContent += [
            c.CertRecordID,
            c.LearnerID,
            c.ProgramID,
            c.CompletionDate,
            c.CertificateID
          ].join(",") + "\n";
        }
      }

      ActivityService.logActivity(
        "Reports",
        "GENERATE_REPORT",
        reportType,
        "Compiled and exported report as: " + filename,
        "SUCCESS"
      );

      return createSuccessResponse("Report compiled successfully.", {
        filename: filename,
        csv: csvContent
      });
    } catch (e) {
      Logger.log("Error in ReportsModule.generateReport: " + e.message);
      return createFailureResponse("Failed to generate dynamic reports.", e.message);
    }
  }

  return {
    generateReport: generateReport
  };
})();

// Public Global API mapping
function apiGenerateReport(type) { return ReportsModule.generateReport(type); }

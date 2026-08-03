/**
 * Dashboard.gs
 * Real-time Dashboard Analytics Module.
 * Computes live summary charts, metrics, and KPI figures.
 *
 * @author Jules (Lead Software Architect)
 */

var DashboardModule = (function() {

  /**
   * Evaluates and aggregates system metrics in real time.
   */
  function getDashboardMetrics() {
    try {
      var learners = SpreadsheetService.readAll(CONFIG.SHEETS.LEARNERS);
      var tickets = SpreadsheetService.readAll(CONFIG.SHEETS.SUPPORT);
      var certs = SpreadsheetService.readAll(CONFIG.SHEETS.CERTIFICATES);
      var logs = ActivityService.getLogs();

      var totalLearners = learners.length;
      var activeLearners = 0;
      var completedLearners = 0;
      var atRiskLearners = 0;

      var programsDistribution = {};
      var statusDistribution = {};

      for (var i = 0; i < learners.length; i++) {
        var l = learners[i];

        // Status calculations
        var status = String(l.StatusID).trim();
        if (status === "ST01" || status === "Active") activeLearners++;
        else if (status === "ST02" || status === "Completed") completedLearners++;
        else if (status === "ST03" || status === "At Risk") atRiskLearners++;

        // Map distribution counts
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;

        var prog = String(l.ProgramID).trim();
        programsDistribution[prog] = (programsDistribution[prog] || 0) + 1;
      }

      var openTickets = tickets.filter(function(t) { return t.TicketStatus === "Open" || t.TicketStatus === "In Progress"; }).length;
      var issuedCerts = certs.filter(function(c) { return c.CertificateStatusID === "C03" || c.CertificateStatusID === "Issued"; }).length;

      var responseData = {
        kpis: {
          totalLearners: totalLearners,
          activeLearners: activeLearners,
          completedLearners: completedLearners,
          atRiskLearners: atRiskLearners,
          openTickets: openTickets,
          issuedCertificates: issuedCerts
        },
        distributions: {
          programs: programsDistribution,
          status: statusDistribution
        },
        recentActivity: logs.slice(0, 5) // Last 5 logs
      };

      // Update the physical spreadsheet Dashboard sheet cells dynamically as well
      updatePhysicalDashboardSheet(responseData);

      return createSuccessResponse("Dashboard metrics aggregated successfully.", responseData);
    } catch (e) {
      Logger.log("Error in DashboardModule.getDashboardMetrics: " + e.message);
      return createFailureResponse("Failed to compile dashboard insights.", e.message);
    }
  }

  /**
   * Refreshes the cell layout inside the physical "Dashboard" sheet.
   */
  function updatePhysicalDashboardSheet(metrics) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
      if (!sheet) return;

      sheet.clearContents();
      sheet.clearFormats();

      // Layout Title
      sheet.getRange("A1").setValue("AGRODEMY LMS REAL-TIME ANALYTICS DASHBOARD").setFontSize(14).setFontWeight("bold").setFontColor("#152848");
      sheet.getRange("A2").setValue("Automatically computed on: " + formatDate(new Date()) + " " + new Date().toLocaleTimeString()).setFontStyle("italic").setFontColor("#808285");

      // KPI cards representation inside spreadsheet
      var headers = [["Metric Key KPI Indicator", "Value Counter"]];
      var values = [
        ["Total Registered Learners", metrics.kpis.totalLearners],
        ["Active Enrolled Students", metrics.kpis.activeLearners],
        ["Completed Cohort Graduates", metrics.kpis.completedLearners],
        ["Students Flagged 'At Risk'", metrics.kpis.atRiskLearners],
        ["Unresolved Incident Tickets", metrics.kpis.openTickets],
        ["Total Certificates Issued", metrics.kpis.issuedCertificates]
      ];

      sheet.getRange("A4:B4").setValues(headers).setBackground(CONFIG.COLORS.PRIMARY).setFontColor("#FFFFFF").setFontWeight("bold");
      sheet.getRange(5, 1, values.length, 2).setValues(values);
      sheet.getRange(5, 2, values.length, 1).setFontWeight("bold");

      // Design borders & alignment
      sheet.getRange("A4:B10").setBorder(true, true, true, true, true, true);
    } catch (err) {
      Logger.log("Could not refresh physical Dashboard worksheet: " + err.message);
    }
  }

  return {
    getDashboardMetrics: getDashboardMetrics
  };
})();

// Public Global API mapping
function apiGetDashboardMetrics() { return DashboardModule.getDashboardMetrics(); }

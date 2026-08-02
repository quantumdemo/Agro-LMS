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
        if (status === "ST01") activeLearners++;
        else if (status === "ST02") completedLearners++;
        else if (status === "ST03") atRiskLearners++;

        // Map distribution counts
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;

        var prog = String(l.ProgramID).trim();
        programsDistribution[prog] = (programsDistribution[prog] || 0) + 1;
      }

      var openTickets = tickets.filter(function(t) { return t.TicketStatus === "Open" || t.TicketStatus === "In Progress"; }).length;
      var issuedCerts = certs.filter(function(c) { return c.CertificateStatusID === "C03"; }).length;

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

      return createSuccessResponse("Dashboard metrics aggregated successfully.", responseData);
    } catch (e) {
      Logger.log("Error in DashboardModule.getDashboardMetrics: " + e.message);
      return createFailureResponse("Failed to compile dashboard insights.", e.message);
    }
  }

  return {
    getDashboardMetrics: getDashboardMetrics
  };
})();

// Public Global API mapping
function apiGetDashboardMetrics() { return DashboardModule.getDashboardMetrics(); }

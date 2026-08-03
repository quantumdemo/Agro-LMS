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

      var totalLearners = 0;
      var activeLearners = 0;
      var completedLearners = 0;
      var atRiskLearners = 0;

      var programsDistribution = {};
      var statusDistribution = {
        "Active": 0,
        "Completed": 0,
        "At Risk": 0,
        "Suspended": 0,
        "Withdrawn": 0,
        "Archived": 0
      };

      // Mappings
      var statusLabels = {
        "ST01": "Active",
        "ST02": "Completed",
        "ST03": "At Risk",
        "ST04": "Suspended",
        "ST05": "Withdrawn"
      };

      var programLabels = {};
      try {
        var configResult = SettingsModule.getSystemConfiguration();
        if (configResult.success && configResult.data.programs) {
          for (var pIdx = 0; pIdx < configResult.data.programs.length; pIdx++) {
            var prg = configResult.data.programs[pIdx];
            programLabels[prg.id] = prg.name;
          }
        }
      } catch (ePrg) {
        Logger.log("Could not load program labels: " + ePrg.message);
      }

      for (var i = 0; i < learners.length; i++) {
        var l = learners[i];
        var isArchived = l.IsArchived === "TRUE" || l.IsArchived === true;

        if (isArchived) {
          statusDistribution["Archived"]++;
          continue;
        }

        totalLearners++;
        var statusID = String(l.StatusID).trim();
        var statusLabel = statusLabels[statusID] || statusID;

        if (statusID === "ST01" || statusLabel === "Active") activeLearners++;
        else if (statusID === "ST02" || statusLabel === "Completed") completedLearners++;
        else if (statusID === "ST03" || statusLabel === "At Risk") atRiskLearners++;

        statusDistribution[statusLabel] = (statusDistribution[statusLabel] || 0) + 1;

        var progID = String(l.ProgramID).trim();
        var progLabel = programLabels[progID] || progID;
        programsDistribution[progLabel] = (programsDistribution[progLabel] || 0) + 1;
      }

      var openTickets = tickets.filter(function(t) { return t.TicketStatus === "Open" || t.TicketStatus === "In Progress"; }).length;
      var issuedCerts = certs.filter(function(c) { return c.CertificateStatusID === "C03" || c.CertificateStatusID === "Issued"; }).length;

      var priorityCounts = { "High": 0, "Medium": 0, "Low": 0 };
      for (var j = 0; j < tickets.length; j++) {
        var t = tickets[j];
        if (t.TicketStatus === "Open" || t.TicketStatus === "In Progress") {
          var p = String(t.Priority).trim();
          if (priorityCounts.hasOwnProperty(p)) {
            priorityCounts[p]++;
          }
        }
      }

      var responseData = {
        kpis: {
          totalLearners: totalLearners,
          activeLearners: activeLearners,
          completedLearners: completedLearners,
          atRiskLearners: atRiskLearners,
          openTickets: openTickets,
          issuedCertificates: issuedCerts,
          priority: priorityCounts
        },
        distributions: {
          programs: programsDistribution,
          status: statusDistribution
        },
        recentActivity: logs.slice(0, 5) // Last 5 logs
      };

      // Update the physical spreadsheet Dashboard sheet cells dynamically as well
      updatePhysicalDashboardSheet(responseData);

      // READ values directly from physical sheet to guarantee perfect synchronization
      try {
        var dSheet = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
        if (dSheet) {
          var kpiValues = dSheet.getRange("B5:B10").getValues();
          responseData.kpis.totalLearners = Number(kpiValues[0][0]) || 0;
          responseData.kpis.activeLearners = Number(kpiValues[1][0]) || 0;
          responseData.kpis.completedLearners = Number(kpiValues[2][0]) || 0;
          responseData.kpis.atRiskLearners = Number(kpiValues[3][0]) || 0;
          responseData.kpis.openTickets = Number(kpiValues[4][0]) || 0;
          responseData.kpis.issuedCertificates = Number(kpiValues[5][0]) || 0;
        }
      } catch (readErr) {
        Logger.log("Error reading synchronized physical KPI metrics: " + readErr.message);
      }

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

      // 1. Clear contents, formats, and any existing charts to prevent duplication
      sheet.clearContents();
      sheet.clearFormats();
      var charts = sheet.getCharts();
      for (var cIdx = 0; cIdx < charts.length; cIdx++) {
        sheet.removeChart(charts[cIdx]);
      }

      // 2. Layout Title
      sheet.getRange("A1").setValue("AGRODEMY LMS REAL-TIME ANALYTICS DASHBOARD").setFontSize(14).setFontWeight("bold").setFontColor("#152848");
      sheet.getRange("A2").setValue("Automatically computed on: " + formatDate(new Date()) + " " + new Date().toLocaleTimeString()).setFontStyle("italic").setFontColor("#808285");

      // 3. KPI cards representation inside spreadsheet
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

      // Design borders & alignment for KPI cards
      sheet.getRange("A4:B10").setBorder(true, true, true, true, true, true);

      // 4. Construct backing data tables starting at row 32
      // Status Distribution Table at A32
      var statusTableHeaders = [["Status Type", "Learners Count"]];
      var statusTableValues = [
        ["Active", metrics.distributions.status["Active"] || 0],
        ["Completed", metrics.distributions.status["Completed"] || 0],
        ["At Risk", metrics.distributions.status["At Risk"] || 0],
        ["Suspended", metrics.distributions.status["Suspended"] || 0],
        ["Withdrawn", metrics.distributions.status["Withdrawn"] || 0],
        ["Archived", metrics.distributions.status["Archived"] || 0]
      ];
      sheet.getRange("A32:B32").setValues(statusTableHeaders).setBackground(CONFIG.COLORS.PRIMARY).setFontColor("#FFFFFF").setFontWeight("bold");
      sheet.getRange(33, 1, statusTableValues.length, 2).setValues(statusTableValues);
      sheet.getRange(32, 1, statusTableValues.length + 1, 2).setBorder(true, true, true, true, true, true);

      // Program Enrollments Table at E32 (Sorted Descending)
      var sortedPrograms = [];
      for (var progName in metrics.distributions.programs) {
        if (metrics.distributions.programs.hasOwnProperty(progName)) {
          sortedPrograms.push([progName, metrics.distributions.programs[progName]]);
        }
      }
      sortedPrograms.sort(function(a, b) { return b[1] - a[1]; }); // Descending count
      if (sortedPrograms.length === 0) {
        sortedPrograms.push(["No Programs Active", 0]);
      }

      var programTableHeaders = [["Program Name", "Enrollments Count"]];
      sheet.getRange("E32:F32").setValues(programTableHeaders).setBackground(CONFIG.COLORS.PRIMARY).setFontColor("#FFFFFF").setFontWeight("bold");
      sheet.getRange(33, 5, sortedPrograms.length, 2).setValues(sortedPrograms);
      sheet.getRange(32, 5, sortedPrograms.length + 1, 2).setBorder(true, true, true, true, true, true);

      // Support Priorities Table at I32
      var priorityTableHeaders = [["Ticket Priority", "Unresolved Tickets"]];
      var priorityTableValues = [
        ["High", metrics.kpis.priority.High || 0],
        ["Medium", metrics.kpis.priority.Medium || 0],
        ["Low", metrics.kpis.priority.Low || 0]
      ];
      sheet.getRange("I32:J32").setValues(priorityTableHeaders).setBackground(CONFIG.COLORS.PRIMARY).setFontColor("#FFFFFF").setFontWeight("bold");
      sheet.getRange(33, 9, priorityTableValues.length, 2).setValues(priorityTableValues);
      sheet.getRange(32, 9, priorityTableValues.length + 1, 2).setBorder(true, true, true, true, true, true);

      // 5. Insert Embedded Charts at Row 12
      // Status Donut Pie Chart at A12
      var statusRange = sheet.getRange(32, 1, statusTableValues.length + 1, 2);
      var statusChart = sheet.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(statusRange)
        .setPosition(12, 1, 0, 0)
        .setOption("title", "Learner Status Distribution")
        .setOption("pieHole", 0.4) // Donut Hole
        .setOption("slices", {
          0: { color: "#26AD38" }, // Active -> Green
          1: { color: "#0274BE" }, // Completed -> Blue
          2: { color: "#FF6900" }, // At Risk -> Orange
          3: { color: "#FFD737" }, // Suspended/Withdrawn -> Yellow
          5: { color: "#808285" }  // Archived -> Gray
        })
        .setOption("width", 320)
        .setOption("height", 240)
        .build();
      sheet.insertChart(statusChart);

      // Program Enrollments Column Chart at E12
      var programRange = sheet.getRange(32, 5, sortedPrograms.length + 1, 2);
      var programChart = sheet.newChart()
        .setChartType(Charts.ChartType.COLUMN)
        .addRange(programRange)
        .setPosition(12, 5, 0, 0)
        .setOption("title", "Program Enrollments (Sort Desc)")
        .setOption("legend", { position: "none" })
        .setOption("colors", [CONFIG.COLORS.DARK])
        .setOption("width", 320)
        .setOption("height", 240)
        .build();
      sheet.insertChart(programChart);

      // Support Priorities Horizontal Bar Chart at I12
      var priorityRange = sheet.getRange(32, 9, priorityTableValues.length + 1, 2);
      var priorityChart = sheet.newChart()
        .setChartType(Charts.ChartType.BAR)
        .addRange(priorityRange)
        .setPosition(12, 9, 0, 0)
        .setOption("title", "Unresolved Tickets by Priority")
        .setOption("legend", { position: "none" })
        .setOption("colors", ["#FF6900"]) // High priority default series color
        .setOption("width", 320)
        .setOption("height", 240)
        .build();
      sheet.insertChart(priorityChart);

      // 5.5 Learner Directory & Filter Center starting at A44
      sheet.getRange("A44").setValue("LEARNER DIRECTORY & SUCCESS FILTER CENTER").setFontSize(12).setFontWeight("bold").setFontColor("#152848");

      // Seed cell A45 with query formula to fetch active learners
      sheet.getRange("A45").setFormula("=QUERY(Learners!A1:P, \"SELECT A, B, C, D, E, G, H, J, N WHERE P = 'FALSE'\", 1)");

      // Format headers of query result range at A45:I45
      sheet.getRange("A45:I45")
        .setBackground(CONFIG.COLORS.PRIMARY)
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");

      // Apply native sheet filter for instant ad-hoc filtering
      try {
        var existingFilter = sheet.getFilter();
        if (existingFilter) {
          existingFilter.remove();
        }
        var filterRange = sheet.getRange("A45:I1000");
        filterRange.createFilter();
      } catch (fErr) {
        Logger.log("Could not establish native sheet filter: " + fErr.message);
      }

      // 6. Automatically resize all columns on Dashboard sheet to look gorgeous
      var lastCol = sheet.getLastColumn();
      if (lastCol > 0) {
        sheet.autoResizeColumns(1, lastCol);
      }
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

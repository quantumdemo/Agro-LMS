/**
 * Activity.gs
 * Audit Logging Service.
 * Tracks all security, core, CRUD, and system operations inside a clean central sheet.
 *
 * @author Jules (Lead Software Architect)
 */

var ActivityService = (function() {

  /**
   * Appends an audit log entry to the ActivityLog worksheet.
   */
  function logActivity(moduleName, action, targetRecordID, details, result) {
    try {
      var nextLogID = IDGenerator.generateNextID(CONFIG.SHEETS.ACTIVITY_LOG, "LOG-");
      var userEmail = Session.getActiveUser().getEmail() || "system@agrodemy.org";

      var logEntry = {
        "LogID": nextLogID,
        "Timestamp": new Date(),
        "User": userEmail,
        "Module": moduleName || "System",
        "Action": action || "ACTION",
        "TargetRecord": targetRecordID || "N/A",
        "Details": details || "",
        "Result": result || "SUCCESS"
      };

      SpreadsheetService.appendRecords(
        CONFIG.SHEETS.ACTIVITY_LOG,
        CONFIG.SCHEMAS.ACTIVITY_LOG,
        [logEntry]
      );
    } catch (e) {
      // Prevent exceptions from blocking main user flows if logging fails
      Logger.log("Critical: LogActivity failed: " + e.message);
    }
  }

  /**
   * Retrieves all logging operations sorted chronologically.
   */
  function getLogs() {
    try {
      var records = SpreadsheetService.readAll(CONFIG.SHEETS.ACTIVITY_LOG);
      return records.reverse(); // Newest first
    } catch (e) {
      Logger.log("Error fetching system logs: " + e.message);
      return [];
    }
  }

  return {
    logActivity: logActivity,
    getLogs: getLogs
  };
})();

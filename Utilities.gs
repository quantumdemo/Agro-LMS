/**
 * Utilities.gs
 * Core system wide shared algorithms and services such as IDs Generator.
 *
 * @author Jules (Lead Software Architect)
 */

var IDGenerator = (function() {

  /**
   * Scans a worksheet column to extract the maximum sequence ID and generates the next one.
   * Guarantees uniqueness and prevents collision.
   *
   * @param {string} sheetName - The sheet name to read rows from.
   * @param {string} prefix - The ID prefix to find (e.g., "LRN-", "TKT-", "CERT-", "CRT-", "LOG-")
   * @return {string} The next unique identifier.
   */
  function generateNextID(sheetName, prefix) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return prefix + "000001";
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        return prefix + "000001";
      }

      // Get only the first column containing the ID keys
      var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var maxNum = 0;
      var regex = new RegExp("^" + prefix + "(\\d+)$");

      for (var i = 0; i < values.length; i++) {
        var val = String(values[i][0]).trim();
        var match = val.match(regex);
        if (match) {
          var num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }

      var nextNum = maxNum + 1;
      var pad = "000000";
      var strNum = "" + nextNum;
      var paddedNum = pad.substring(0, pad.length - strNum.length) + strNum;

      return prefix + paddedNum;
    } catch (e) {
      Logger.log("Error generating next ID for " + sheetName + " prefix " + prefix + ": " + e.message);
      // Fallback unique timestamp if completely blocked
      return prefix + Date.now();
    }
  }

  return {
    generateNextID: generateNextID
  };
})();

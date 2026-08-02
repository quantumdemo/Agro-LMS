/**
 * Spreadsheet.gs
 * Database Access Layer wrapper. Performs optimized batch operations.
 * Minimizes getRange and cell-by-cell manipulation calls to scale performance.
 *
 * @author Jules (Lead Software Architect)
 */

var SpreadsheetService = (function() {

  /**
   * Reads all records from a worksheet, parsing headers into object properties.
   */
  function readAll(sheetName) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 1 || lastCol < 1) return [];

      var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = data[0].map(function(h) { return String(h).trim(); });

      var records = [];
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        // Skip entirely empty rows
        var hasContent = row.some(function(val) { return val !== "" && val !== null; });
        if (!hasContent) continue;

        var obj = {};
        for (var c = 0; c < headers.length; c++) {
          var key = headers[c];
          if (key) {
            obj[key] = row[c];
          }
        }
        records.push(obj);
      }
      return records;
    } catch (e) {
      Logger.log("Error in SpreadsheetService.readAll(" + sheetName + "): " + e.message);
      return [];
    }
  }

  /**
   * Appends an array of record objects to a worksheet in a single batch operation.
   */
  function appendRecords(sheetName, schema, records) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return false;

      var rowsToWrite = [];
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var row = [];
        for (var c = 0; c < schema.length; c++) {
          var key = schema[c];
          row.push(rec[key] !== undefined ? rec[key] : "");
        }
        rowsToWrite.push(row);
      }

      if (rowsToWrite.length > 0) {
        var lastRow = sheet.getLastRow();
        sheet.getRange(lastRow + 1, 1, rowsToWrite.length, schema.length).setValues(rowsToWrite);
      }
      return true;
    } catch (e) {
      Logger.log("Error in SpreadsheetService.appendRecords(" + sheetName + "): " + e.message);
      return false;
    }
  }

  /**
   * Updates an existing record in a worksheet based on primary key matching.
   */
  function updateRecord(sheetName, pkName, pkValue, schema, updatedFields) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return false;

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2) return false;

      var dataRange = sheet.getRange(1, 1, lastRow, lastCol);
      var values = dataRange.getValues();
      var headers = values[0].map(function(h) { return String(h).trim(); });

      var pkIndex = headers.indexOf(pkName);
      if (pkIndex === -1) return false;

      var targetRowIndex = -1;
      for (var r = 1; r < values.length; r++) {
        if (String(values[r][pkIndex]).trim() === String(pkValue).trim()) {
          targetRowIndex = r + 1; // 1-based sheet row index
          break;
        }
      }

      if (targetRowIndex === -1) return false;

      // Prepare the row updates based on schema
      var targetRowValues = values[targetRowIndex - 1];
      for (var c = 0; c < schema.length; c++) {
        var key = schema[c];
        if (updatedFields[key] !== undefined) {
          targetRowValues[c] = updatedFields[key];
        }
      }

      var slicedValues = targetRowValues.slice(0, schema.length);
      sheet.getRange(targetRowIndex, 1, 1, schema.length).setValues([slicedValues]);
      return true;
    } catch (e) {
      Logger.log("Error in SpreadsheetService.updateRecord(" + sheetName + "): " + e.message);
      return false;
    }
  }

  /**
   * Deletes a record by matching its primary key.
   */
  function deleteRecord(sheetName, pkName, pkValue) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return false;

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return false;

      var pkValues = sheet.getRange(1, 1, lastRow, 1).getValues();
      var targetRow = -1;
      for (var r = 1; r < pkValues.length; r++) {
        if (String(pkValues[r][0]).trim() === String(pkValue).trim()) {
          targetRow = r + 1;
          break;
        }
      }

      if (targetRow !== -1) {
        sheet.deleteRow(targetRow);
        return true;
      }
      return false;
    } catch (e) {
      Logger.log("Error in SpreadsheetService.deleteRecord(" + sheetName + "): " + e.message);
      return false;
    }
  }

  return {
    readAll: readAll,
    appendRecords: appendRecords,
    updateRecord: updateRecord,
    deleteRecord: deleteRecord
  };
})();

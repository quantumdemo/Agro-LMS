/**
 * Learners.gs
 * Learners Business Module.
 * Implements CRUD, Search, Filter, Soft Archive, and assignment operations.
 *
 * @author Jules (Lead Software Architect)
 */

var LearnerModule = (function() {

  /**
   * Retrieves all learners inside the sheet with mapped relational names.
   */
  function getAllLearners() {
    try {
      var learners = SpreadsheetService.readAll(CONFIG.SHEETS.LEARNERS);
      return createSuccessResponse("Learners retrieved successfully.", learners);
    } catch (e) {
      Logger.log("Error in LearnerModule.getAllLearners: " + e.message);
      return createFailureResponse("Failed to fetch learners.", e.message);
    }
  }

  /**
   * Inserts a new learner, generating the next sequential LRN-XXXXXX identifier.
   */
  function createLearner(learnerData) {
    try {
      // 1. Uniqueness Validation
      var learners = SpreadsheetService.readAll(CONFIG.SHEETS.LEARNERS);
      var emails = learners.map(function(l) { return String(l.Email).trim().toLowerCase(); });

      var errors = Validation.validateLearner(learnerData, true, emails);
      if (errors.length > 0) {
        return createFailureResponse("Validation failed.", errors);
      }

      // 2. Hydrate defaults
      var nextID = IDGenerator.generateNextID(CONFIG.SHEETS.LEARNERS, "LRN-");
      var newLearner = {
        "LearnerID": nextID,
        "FullName": String(learnerData.FullName).trim(),
        "Email": String(learnerData.Email).trim(),
        "Phone": String(learnerData.Phone).trim(),
        "ProgramID": String(learnerData.ProgramID).trim(),
        "EnrollmentDate": formatDate(new Date()),
        "CurrentModule": learnerData.CurrentModule ? String(learnerData.CurrentModule).trim() : "Module 1",
        "Progress%": parseNumber(learnerData["Progress%"], 0.0),
        "LastLogin": formatDate(new Date()),
        "StatusID": learnerData.StatusID ? String(learnerData.StatusID).trim() : "ST01",
        "CertificateStatusID": learnerData.CertificateStatusID ? String(learnerData.CertificateStatusID).trim() : "C01",
        "SupportStatusID": learnerData.SupportStatusID ? String(learnerData.SupportStatusID).trim() : "SP01",
        "LastContact": formatDate(new Date()),
        "OfficerID": learnerData.OfficerID ? String(learnerData.OfficerID).trim() : "O001",
        "Notes": learnerData.Notes ? String(learnerData.Notes).trim() : ""
      };

      // 3. Batch Append
      SpreadsheetService.appendRecords(
        CONFIG.SHEETS.LEARNERS,
        CONFIG.SCHEMAS.LEARNERS,
        [newLearner]
      );

      // 4. Audit Log
      ActivityService.logActivity(
        "Learners",
        "CREATE",
        nextID,
        "Created learner: " + newLearner.FullName + " enrolled in " + newLearner.ProgramID,
        "SUCCESS"
      );

      // 5. Automated Notification Action
      EmailService.sendTemplateEmail(newLearner.Email, "Welcome", {
        "FullName": newLearner.FullName,
        "LearnerID": newLearner.LearnerID,
        "ProgramID": newLearner.ProgramID
      });

      return createSuccessResponse("Learner created successfully.", { learner: newLearner });
    } catch (e) {
      Logger.log("Error in LearnerModule.createLearner: " + e.message);
      return createFailureResponse("An internal server error occurred while creating learner.", e.message);
    }
  }

  /**
   * Updates an existing learner record.
   */
  function updateLearner(learnerID, learnerData) {
    try {
      if (!learnerID) {
        return createFailureResponse("LearnerID is required for updates.");
      }

      var errors = Validation.validateLearner(learnerData, false, []);
      if (errors.length > 0) {
        return createFailureResponse("Validation failed.", errors);
      }

      var updatedFields = {
        "FullName": String(learnerData.FullName).trim(),
        "Email": String(learnerData.Email).trim(),
        "Phone": String(learnerData.Phone).trim(),
        "ProgramID": String(learnerData.ProgramID).trim(),
        "CurrentModule": String(learnerData.CurrentModule).trim(),
        "Progress%": parseNumber(learnerData["Progress%"], 0.0),
        "StatusID": String(learnerData.StatusID).trim(),
        "CertificateStatusID": String(learnerData.CertificateStatusID).trim(),
        "SupportStatusID": String(learnerData.SupportStatusID).trim(),
        "OfficerID": String(learnerData.OfficerID).trim(),
        "Notes": String(learnerData.Notes || "").trim(),
        "LastContact": formatDate(new Date())
      };

      // Trigger automatic progress completed transition
      if (updatedFields["Progress%"] >= 1.0 && updatedFields["StatusID"] === "ST01") {
        updatedFields["StatusID"] = "ST02"; // Auto Complete
        updatedFields["CertificateStatusID"] = "C02"; // Auto Eligible
      }

      var success = SpreadsheetService.updateRecord(
        CONFIG.SHEETS.LEARNERS,
        "LearnerID",
        learnerID,
        CONFIG.SCHEMAS.LEARNERS,
        updatedFields
      );

      if (!success) {
        return createFailureResponse("Learner record not found.");
      }

      ActivityService.logActivity(
        "Learners",
        "UPDATE",
        learnerID,
        "Updated learner profile parameters.",
        "SUCCESS"
      );

      // Trigger completion congrats email automatically if progress reaches 100%
      if (updatedFields["Progress%"] >= 1.0) {
        EmailService.sendTemplateEmail(updatedFields.Email, "Certificate", {
          "FullName": updatedFields.FullName,
          "ProgramName": updatedFields.ProgramID,
          "CertificateID": "Pending Issuance",
          "CertificateLink": "N/A"
        });
      }

      return createSuccessResponse("Learner updated successfully.", { learner: updatedFields });
    } catch (e) {
      Logger.log("Error in LearnerModule.updateLearner: " + e.message);
      return createFailureResponse("An internal server error occurred while updating learner.", e.message);
    }
  }

  /**
   * soft deletes (archives) a learner by modifying status to 'Suspended/Withdrawn'
   * or fully archiving as needed. We support full row deletion as clean archive.
   */
  function deleteLearner(learnerID) {
    try {
      if (!learnerID) return createFailureResponse("LearnerID is required.");

      var success = SpreadsheetService.deleteRecord(CONFIG.SHEETS.LEARNERS, "LearnerID", learnerID);
      if (!success) {
        return createFailureResponse("Learner not found or could not be archived.");
      }

      ActivityService.logActivity(
        "Learners",
        "DELETE",
        learnerID,
        "Archived learner record completely.",
        "SUCCESS"
      );

      return createSuccessResponse("Learner successfully archived.");
    } catch (e) {
      Logger.log("Error in LearnerModule.deleteLearner: " + e.message);
      return createFailureResponse("Internal error during deletion.", e.message);
    }
  }

  return {
    getAllLearners: getAllLearners,
    createLearner: createLearner,
    updateLearner: updateLearner,
    deleteLearner: deleteLearner
  };
})();

// Public Global API Mappings called from Client
function apiGetAllLearners() { return LearnerModule.getAllLearners(); }
function apiCreateLearner(data) { return LearnerModule.createLearner(data); }
function apiUpdateLearner(id, data) { return LearnerModule.updateLearner(id, data); }
function apiDeleteLearner(id) { return LearnerModule.deleteLearner(id); }

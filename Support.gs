/**
 * Support.gs
 * Support Management Business Module.
 * Controls creation, assignment, resolution tracking of support tickets.
 *
 * @author Jules (Lead Software Architect)
 */

var SupportModule = (function() {

  /**
   * Retrieves all support tickets.
   */
  function getAllTickets() {
    try {
      var tickets = SpreadsheetService.readAll(CONFIG.SHEETS.SUPPORT);
      return createSuccessResponse("Tickets retrieved successfully.", tickets);
    } catch (e) {
      Logger.log("Error in SupportModule.getAllTickets: " + e.message);
      return createFailureResponse("Failed to fetch tickets.", e.message);
    }
  }

  /**
   * Creates a new support ticket and links it to a learner profile.
   */
  function createTicket(ticketData) {
    try {
      var errors = Validation.validateTicket(ticketData);
      if (errors.length > 0) {
        return createFailureResponse("Validation failed.", errors);
      }

      var nextID = IDGenerator.generateNextID(CONFIG.SHEETS.SUPPORT, "TKT-");
      var newTicket = {
        "TicketID": nextID,
        "LearnerID": String(ticketData.LearnerID).trim(),
        "IssueCategoryID": String(ticketData.IssueCategoryID).trim(),
        "Description": String(ticketData.Description).trim(),
        "Priority": String(ticketData.Priority).trim(),
        "DateOpened": formatDate(new Date()),
        "OfficerID": ticketData.OfficerID ? String(ticketData.OfficerID).trim() : "O001",
        "TicketStatus": "Open",
        "ResolutionDate": "",
        "Notes": ticketData.Notes ? String(ticketData.Notes).trim() : ""
      };

      // Save support ticket
      SpreadsheetService.appendRecords(
        CONFIG.SHEETS.SUPPORT,
        CONFIG.SCHEMAS.SUPPORT,
        [newTicket]
      );

      // Sync SupportStatusID inside Learners table to 'Open Ticket' (SP02)
      SpreadsheetService.updateRecord(
        CONFIG.SHEETS.LEARNERS,
        "LearnerID",
        newTicket.LearnerID,
        CONFIG.SCHEMAS.LEARNERS,
        { "SupportStatusID": "SP02" }
      );

      ActivityService.logActivity(
        "Support",
        "CREATE_TICKET",
        nextID,
        "Opened support ticket for learner: " + newTicket.LearnerID,
        "SUCCESS"
      );

      // Auto email trigger to notify client
      var learner = findLearnerRecord(newTicket.LearnerID);
      if (learner) {
        EmailService.sendTemplateEmail(learner.Email, "Support", {
          "FullName": learner.FullName,
          "TicketID": newTicket.TicketID,
          "TicketStatus": "Open",
          "Notes": newTicket.Description
        });
      }

      return createSuccessResponse("Support ticket created successfully.", { ticket: newTicket });
    } catch (e) {
      Logger.log("Error in SupportModule.createTicket: " + e.message);
      return createFailureResponse("Internal error during ticket creation.", e.message);
    }
  }

  /**
   * Updates ticket parameters, status, and logs resolutions.
   */
  function updateTicket(ticketID, ticketData) {
    try {
      if (!ticketID) return createFailureResponse("TicketID is required.");

      var updatedFields = {
        "IssueCategoryID": String(ticketData.IssueCategoryID).trim(),
        "Description": String(ticketData.Description).trim(),
        "Priority": String(ticketData.Priority).trim(),
        "OfficerID": String(ticketData.OfficerID).trim(),
        "TicketStatus": String(ticketData.TicketStatus).trim(),
        "Notes": String(ticketData.Notes || "").trim()
      };

      if (updatedFields.TicketStatus === "Closed") {
        updatedFields.ResolutionDate = formatDate(new Date());
      }

      var success = SpreadsheetService.updateRecord(
        CONFIG.SHEETS.SUPPORT,
        "TicketID",
        ticketID,
        CONFIG.SCHEMAS.SUPPORT,
        updatedFields
      );

      if (!success) {
        return createFailureResponse("Support ticket not found.");
      }

      // Sync SupportStatus in Learners worksheet
      var lStatus = "SP01"; // No tickets fallback
      if (updatedFields.TicketStatus === "Open") lStatus = "SP02";
      else if (updatedFields.TicketStatus === "In Progress") lStatus = "SP03";
      else if (updatedFields.TicketStatus === "Closed") lStatus = "SP04";

      SpreadsheetService.updateRecord(
        CONFIG.SHEETS.LEARNERS,
        "LearnerID",
        ticketData.LearnerID,
        CONFIG.SCHEMAS.LEARNERS,
        { "SupportStatusID": lStatus }
      );

      ActivityService.logActivity(
        "Support",
        "UPDATE_TICKET",
        ticketID,
        "Updated ticket status to " + updatedFields.TicketStatus,
        "SUCCESS"
      );

      // Dispatch Ticket Update email
      var learner = findLearnerRecord(ticketData.LearnerID);
      if (learner) {
        EmailService.sendTemplateEmail(learner.Email, "Support", {
          "FullName": learner.FullName,
          "TicketID": ticketID,
          "TicketStatus": updatedFields.TicketStatus,
          "Notes": updatedFields.Notes || "Status updated."
        });
      }

      return createSuccessResponse("Ticket updated successfully.", { ticket: updatedFields });
    } catch (e) {
      Logger.log("Error in SupportModule.updateTicket: " + e.message);
      return createFailureResponse("Internal error updating ticket.", e.message);
    }
  }

  /**
   * Helper routine to find learner profile row.
   */
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
    getAllTickets: getAllTickets,
    createTicket: createTicket,
    updateTicket: updateTicket
  };
})();

// Public Global API mappings called from client JS
function apiGetAllTickets() { return SupportModule.getAllTickets(); }
function apiCreateTicket(data) { return SupportModule.createTicket(data); }
function apiUpdateTicket(id, data) { return SupportModule.updateTicket(id, data); }

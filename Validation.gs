/**
 * Validation.gs
 * Universal server-side validation routines.
 *
 * @author Jules (Lead Software Architect)
 */

var Validation = (function() {

  /**
   * Validates standard Learner properties before insert or update.
   */
  function validateLearner(learnerData, isNew, existingEmails) {
    var errors = [];

    if (!learnerData.FullName || learnerData.FullName.trim() === "") {
      errors.push("Full Name is required.");
    }

    if (!learnerData.Email || learnerData.Email.trim() === "") {
      errors.push("Email is required.");
    } else {
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(learnerData.Email.trim())) {
        errors.push("Invalid email address format.");
      } else if (isNew && existingEmails && existingEmails.indexOf(learnerData.Email.trim().toLowerCase()) !== -1) {
        errors.push("A learner with Email '" + learnerData.Email.trim() + "' already exists.");
      }
    }

    if (!learnerData.Phone || learnerData.Phone.trim() === "") {
      errors.push("Phone number is required.");
    }

    if (!learnerData.ProgramID || learnerData.ProgramID.trim() === "") {
      errors.push("Program selection is required.");
    }

    var progress = parseNumber(learnerData["Progress%"], 0);
    if (progress < 0 || progress > 1) {
      errors.push("Progress % must be a value between 0.0 and 1.0.");
    }

    return errors;
  }

  /**
   * Validates Support Ticket inputs.
   */
  function validateTicket(ticketData) {
    var errors = [];

    if (!ticketData.LearnerID || ticketData.LearnerID.trim() === "") {
      errors.push("Learner selection is required.");
    }

    if (!ticketData.IssueCategoryID || ticketData.IssueCategoryID.trim() === "") {
      errors.push("Issue Category is required.");
    }

    if (!ticketData.Description || ticketData.Description.trim() === "") {
      errors.push("Description is required.");
    }

    var allowedPriorities = ["Low", "Medium", "High"];
    if (!ticketData.Priority || allowedPriorities.indexOf(ticketData.Priority) === -1) {
      errors.push("Priority must be one of: Low, Medium, High.");
    }

    return errors;
  }

  return {
    validateLearner: validateLearner,
    validateTicket: validateTicket
  };
})();

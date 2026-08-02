/**
 * Helpers.gs
 * Universal utilities and formatters for strings, dates, templates, and script compilation.
 *
 * @author Jules (Lead Software Architect)
 */

/**
 * Compiles a sidebar HTML file including any CSS and JS child component files.
 * Uses scriptlet template evaluations to embed CSS and JS separate files cleanly.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile("Sidebar")
    .evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Standard utility to include sub-HTML files dynamically inside template tags.
 * E.g., <?!= include('Sidebar.css'); ?>
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (err) {
    return "<!-- Error loading file: " + filename + " : " + err.message + " -->";
  }
}

/**
 * Builds the standard server response wrapper contract.
 */
function createSuccessResponse(message, data) {
  return {
    success: true,
    message: message || "Operation completed successfully.",
    data: data || {},
    errors: []
  };
}

function createFailureResponse(message, errors) {
  var errList = [];
  if (Array.isArray(errors)) {
    errList = errors;
  } else if (errors) {
    errList = [errors];
  }
  return {
    success: false,
    message: message || "An error occurred during operation.",
    data: null,
    errors: errList
  };
}

/**
 * Safe, robust parser for floats/numbers.
 */
function parseNumber(val, defaultVal) {
  var num = parseFloat(val);
  return isNaN(num) ? (defaultVal !== undefined ? defaultVal : 0) : num;
}

/**
 * Formats standard ISO strings or dates cleanly to YYYY-MM-DD.
 */
function formatDate(date) {
  if (!date) return "";
  try {
    var d = new Date(date);
    if (isNaN(d.getTime())) return "";
    var month = "" + (d.getMonth() + 1);
    var day = "" + d.getDate();
    var year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
  } catch (e) {
    return "";
  }
}

/**
 * Dynamic placeholder substitution engine.
 * Takes template body and replacements object. Replacing {{key}} with value.
 */
function substitutePlaceholders(templateStr, replacements) {
  if (!templateStr) return "";
  var result = templateStr;
  for (var key in replacements) {
    if (replacements.hasOwnProperty(key)) {
      var val = replacements[key] !== null && replacements[key] !== undefined ? replacements[key] : "";
      var regex = new RegExp("{{" + key + "}}", "g");
      result = result.replace(regex, val);
    }
  }
  return result;
}

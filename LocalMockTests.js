/**
 * LocalMockTests.js
 * Comprehensive automated QA suite running on Node.js locally.
 * Simulates and verifies backend core helpers, validators, unique ID sequences, and dynamic placeholder substitutions.
 */

// 1. Setup local mocked environment models for Google Apps Script APIs
const Logger = {
  log: (msg) => console.log("[MOCK-LOG]:", msg)
};

const Session = {
  getActiveUser: () => ({
    getEmail: () => "officer_test@agrodemy.org"
  })
};

const MailApp = {
  sendEmail: (opts) => {
    console.log(`[MOCK-MAIL] To: ${opts.to} | Sub: ${opts.subject}`);
  }
};

// Spreadsheet Database Mock State
const MockDatabase = {
  "Learners": [
    ["LearnerID", "FullName", "Email", "Phone", "ProgramID", "EnrollmentDate", "CurrentModule", "Progress%", "LastLogin", "StatusID", "CertificateStatusID", "SupportStatusID", "LastContact", "OfficerID", "Notes"],
    ["LRN-000001", "Abebe Bikila", "abebe@example.com", "+251", "P001", "2023-10-10", "Mod 1", "0.5", "2023-10-10", "ST01", "C01", "SP01", "2023-10-10", "O001", "No note"]
  ],
  "SupportLog": [
    ["TicketID", "LearnerID", "IssueCategoryID", "Description", "Priority", "DateOpened", "OfficerID", "TicketStatus", "ResolutionDate", "Notes"]
  ],
  "CertificateTracker": [
    ["CertRecordID", "LearnerID", "ProgramID", "CompletionDate", "CertificateStatusID", "CertificateDate", "CertificateID", "CertificateLink"]
  ],
  "ActivityLog": [
    ["LogID", "Timestamp", "User", "Module", "Action", "TargetRecord", "Details", "Result"]
  ],
  "Settings": [
    ["Programs", null, null],
    ["ProgramID", "ProgramName", null],
    ["P001", "Career Agribusiness Certification", null],
    ["P002", "Agro Digital Officer Certification", null]
  ]
};

// 2. Local test implementations mirroring Gas modules for verification
const ValidationMock = {
  validateLearner: (learnerData, isNew, existingEmails) => {
    let errors = [];
    if (!learnerData.FullName || learnerData.FullName.trim() === "") errors.push("Full Name is required.");
    if (!learnerData.Email || learnerData.Email.trim() === "") {
      errors.push("Email is required.");
    } else if (isNew && existingEmails.includes(learnerData.Email.trim().toLowerCase())) {
      errors.push("A learner with Email already exists.");
    }
    if (!learnerData.Phone || learnerData.Phone.trim() === "") errors.push("Phone number is required.");
    return errors;
  }
};

const PlaceholderEngineMock = {
  substitutePlaceholders: (templateStr, replacements) => {
    if (!templateStr) return "";
    let result = templateStr;
    for (let key in replacements) {
      let regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, replacements[key] || "");
    }
    return result;
  }
};

const IDGeneratorMock = {
  generateNextID: (sheetName, prefix, existingIDs) => {
    let maxNum = 0;
    const regex = new RegExp("^" + prefix + "(\\d+)$");
    existingIDs.forEach(id => {
      let match = id.match(regex);
      if (match) {
        let num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let padded = String(nextNum).padStart(6, "0");
    return prefix + padded;
  }
};

// 3. Automated Assert Run Assertions
function runTests() {
  console.log("==========================================");
  console.log(" RUNNING COMPREHENSIVE LOCAL MOCK QA SUITE");
  console.log("==========================================\n");

  let passed = true;

  // Test 1: Unique ID Sequential Generation
  try {
    const list = ["LRN-000001", "LRN-000002", "LRN-000005"];
    const nextID = IDGeneratorMock.generateNextID("Learners", "LRN-", list);
    if (nextID === "LRN-000006") {
      console.log("✅ PASS: ID Generation increments highest suffix correctly (Expected LRN-000006, got LRN-000006)");
    } else {
      console.error(`❌ FAIL: ID Generation returned wrong output: ${nextID}`);
      passed = false;
    }
  } catch (e) {
    console.error("❌ Test 1 Error:", e.message);
    passed = false;
  }

  // Test 2: Validation Constraints Checking
  try {
    const duplicateEmailList = ["abebe@example.com"];
    const invalidProfile = { FullName: "", Email: "abebe@example.com", Phone: "123" };
    const errors = ValidationMock.validateLearner(invalidProfile, true, duplicateEmailList);
    if (errors.length === 2 && errors.includes("Full Name is required.") && errors.includes("A learner with Email already exists.")) {
      console.log("✅ PASS: Validator catches required names and duplicate emails successfully.");
    } else {
      console.error("❌ FAIL: Validation checking skipped constraint filters: " + JSON.stringify(errors));
      passed = false;
    }
  } catch (e) {
    console.error("❌ Test 2 Error:", e.message);
    passed = false;
  }

  // Test 3: Placeholder Dynamic Substitutions
  try {
    const template = "Hello {{FullName}}, welcome to {{ProgramName}}! Your ID is {{LearnerID}}.";
    const vars = { FullName: "Aster Aweke", ProgramName: "Agritech", LearnerID: "LRN-100200" };
    const res = PlaceholderEngineMock.substitutePlaceholders(template, vars);
    const expected = "Hello Aster Aweke, welcome to Agritech! Your ID is LRN-100200.";
    if (res === expected) {
      console.log("✅ PASS: Substitution placeholder engine matches and binds custom dynamic variables.");
    } else {
      console.error(`❌ FAIL: Text template replacement mismatch.\nExpected: ${expected}\nGot: ${res}`);
      passed = false;
    }
  } catch (e) {
    console.error("❌ Test 3 Error:", e.message);
    passed = false;
  }

  console.log("\n==========================================");
  if (passed) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! PROCEED.");
    console.log("==========================================");
  } else {
    console.error("🚨 SOME TESTS FAILED. CHECK SYSTEM INTEGRITY.");
    console.log("==========================================");
    process.exit(1);
  }
}

runTests();

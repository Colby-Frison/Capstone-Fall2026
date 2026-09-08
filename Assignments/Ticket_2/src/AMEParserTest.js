/*
CS 4273 – Capstone | Fall 2026 | GROUP F

Unit tests for getDecision() — JS port of get_decision() in AMEParser.py.

Run with Node 18+:
  node --test AMEParserTest.js
*/

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Pull the disposition keyword out of the raw cell text.
 * DEFER/DENY are checked before ISSUE to avoid false matches
 * (e.g., 'do not issue' would incorrectly match ISSUE otherwise).
 *
 * @param {string | null | undefined} text
 * @returns {"DEFER" | "DENY" | "SPECIAL ISSUANCE" | "ISSUE" | "UNKNOWN"}
 */
function getDecision(text) {
  const upper = (text || "").toUpperCase();

  if (upper.includes("DEFER")) {
    return "DEFER";
  }
  if (upper.includes("DENY")) {
    return "DENY";
  }
  if (upper.includes("SPECIAL ISSUANCE")) {
    return "SPECIAL ISSUANCE";
  }
  if (upper.includes("ISSUE")) {
    return "ISSUE";
  }

  return "UNKNOWN";
}

describe("DispositionSuite", () => {
  it("IssueTest", () => {
    assert.equal(getDecision("AME may issue"), "ISSUE");
  });

  it("DeferTest", () => {
    assert.equal(getDecision("Defer to FAA"), "DEFER");
  });

  it("DenyTest", () => {
    assert.equal(getDecision("Deny the certificate"), "DENY");
  });

  it("SpecialIssuanceTest", () => {
    assert.equal(getDecision("Special Issuance required"), "SPECIAL ISSUANCE");
  });

  it("DeferTakesPriorityOverIssueTest", () => {
    // DEFER is checked before ISSUE, so this should return DEFER
    assert.equal(getDecision("Defer, do not issue"), "DEFER");
  });

  it("UnknownDecisionTest", () => {
    assert.equal(getDecision("No matching keyword"), "UNKNOWN");
  });

  it("NoneDecisionTest", () => {
    assert.equal(getDecision(null), "UNKNOWN");
    assert.equal(getDecision(undefined), "UNKNOWN");
    assert.equal(getDecision(""), "UNKNOWN");
  });

  it("CaseInsensitiveTest", () => {
    assert.equal(getDecision("defer"), "DEFER");
  });

  it("IssueInActionTextTest", () => {
    assert.equal(
      getDecision("ISSUE\nAME may issue and note this in Block 60."),
      "ISSUE",
    );
  });
});

module.exports = { getDecision };

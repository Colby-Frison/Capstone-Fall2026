/*
CS 4273 – Capstone | Fall 2026 | GROUP F
Unit tests for frequent conditions feature
*/

import { describe, expect, it } from "vitest";
import {
  conditions,
  isFreqCondition,
  frequentConditionCount,
} from "./data/conditions";

describe("isFreqConditionTests", () => {
  // parameterized tests using existing conditions in catalog
  it.each([
    "Attention-deficit/hyperactivity Disorder (adhd)* And/or Use of Adhd Medications",
    "Adjustment Disorder with Depressed Mood or MINOR Depression",
    "Allergies",
    "Anxiety, Depression, and Related Conditions",
    "Coronary Heart Disease",
    "Diabetes Insipidus or Polyuria",
    "Diabetes Mellitus",
    "Eyes - Refractive Surgery",
    "GERD (gastroesophageal reflux disease or reflux)",
    "Gout and Pseudogout",
    "Post-traumatic Stress Disorder (ptsd)",
    "Skin Cancer",
    "Transient Global Amnesia (TGA)",
  ])("recognizes frequent condition (case insensitive) %s", (conditionName) => {
    expect(isFreqCondition(conditionName)).toBe(true);
  });

  it.each(["", "   ", "Flu"])(
    "does not match non-frequent condition %j",
    (conditionName) => {
      expect(isFreqCondition(conditionName)).toBe(false);
    },
  );
});

it("should correctly count frequent conditions matched", () => {
  const count = frequentConditionCount();
  expect(count).toBeGreaterThanOrEqual(0);
  // Private full catalog currently exposes 13 frequent matches; samples-only CI has none.
  if (conditions.length > 50) {
    expect(count).toBe(13);
  }
});

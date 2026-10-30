// Fixtures: expected values come from IRS worked examples (cited) or hand-checked
// arithmetic on the Schedule 1-A lines and Rev. Proc. tables.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateOvertimeDeduction, calculateTipsDeduction, calculateSeniorDeduction,
  estimateTaxSavings, incomeTax, qualifiedPremium, InputError,
} from "../dist/core.js";
import { explainEligibility } from "../dist/eligibility.js";

const S = "single", J = "married_filing_jointly", M = "married_filing_separately", H = "head_of_household";

test("F1 FS-2026-13 A16: $20/h, 10 OT hours paid at double time -> $100 qualified", () => {
  const r = qualifiedPremium({ filing_status: S, magi: 50000, tax_year: 2026, hourly_rate: 20, overtime_hours: 10, multiplier: 2 });
  assert.equal(r.qualified_overtime, 100);
  assert.equal(r.total_overtime_pay, 400);
});

test("F2 1040 instr. Example 1: $15,000 OT pay at time-and-a-half -> $5,000", () => {
  assert.equal(qualifiedPremium({ filing_status: S, magi: 65000, tax_year: 2025, total_overtime_pay: 15000 }).qualified_overtime, 5000);
});

test("F3 1040 instr. Example 3: $20,000 OT pay at double time -> $5,000", () => {
  assert.equal(qualifiedPremium({ filing_status: S, magi: 70000, tax_year: 2025, total_overtime_pay: 20000, multiplier: 2 }).qualified_overtime, 5000);
});

test("F4 1040 instr. Example 5: $4,500 comp time at 1.5 -> $1,500", () => {
  assert.equal(qualifiedPremium({ filing_status: S, magi: 60000, tax_year: 2025, total_overtime_pay: 4500 }).qualified_overtime, 1500);
});

test("F5 FS-2026-13 A10: $30,000 code TT, single -> capped at $12,500", () => {
  const r = calculateOvertimeDeduction({ filing_status: S, magi: 100000, tax_year: 2026, qualified_overtime_premium: 30000 });
  assert.equal(r.deduction, 12500);
});

test("F6 joint return: $30,000 premium -> capped at $25,000", () => {
  assert.equal(calculateOvertimeDeduction({ filing_status: J, magi: 200000, tax_year: 2026, qualified_overtime_premium: 30000 }).deduction, 25000);
});

test("F7 Schedule 1-A lines 15-21: single MAGI $160,500 -> 10 full steps -> $11,500", () => {
  const r = calculateOvertimeDeduction({ filing_status: S, magi: 160500, tax_year: 2025, qualified_overtime_premium: 12500 });
  assert.equal(r.phaseout.reduction_steps, 10);
  assert.equal(r.phaseout.reduction, 1000);
  assert.equal(r.deduction, 11500);
});

test("F8 phase-out rounds DOWN: MAGI $150,999 -> 0 steps, no reduction", () => {
  const r = calculateTipsDeduction({ filing_status: S, magi: 150999, tax_year: 2026, employee_tips: 10000 });
  assert.equal(r.phaseout.reduction_steps, 0);
  assert.equal(r.deduction, 10000);
});

test("F9 full phase-out: single MAGI $275,000, $12,500 premium -> $0", () => {
  assert.equal(calculateOvertimeDeduction({ filing_status: S, magi: 275000, tax_year: 2027, qualified_overtime_premium: 12500 }).deduction, 0);
});

test("F10 married filing separately gets $0 on all three", () => {
  assert.equal(calculateOvertimeDeduction({ filing_status: M, magi: 50000, tax_year: 2026, qualified_overtime_premium: 5000 }).deduction, 0);
  assert.equal(calculateTipsDeduction({ filing_status: M, magi: 50000, tax_year: 2026, employee_tips: 5000 }).deduction, 0);
  assert.equal(calculateSeniorDeduction({ filing_status: M, magi: 50000, tax_year: 2026, taxpayer_age_65_or_older: true }).deduction, 0);
});

test("F11 1040 instr. tips Example 1: W-2 box 7 $18,000, one employer -> $18,000", () => {
  assert.equal(calculateTipsDeduction({ filing_status: S, magi: 60000, tax_year: 2025, employee_tips: 18000 }).deduction, 18000);
});

test("F12 tips cap is $25,000 per return even when joint", () => {
  assert.equal(calculateTipsDeduction({ filing_status: J, magi: 120000, tax_year: 2026, employee_tips: 40000 }).deduction, 25000);
});

test("F13 tips, self-employed limited to net income", () => {
  const r = calculateTipsDeduction({ filing_status: H, magi: 80000, tax_year: 2026, self_employed_tips: 9000, self_employed_net_income: 4000 });
  assert.equal(r.deduction, 4000);
});

test("F14 Schedule 1-A Part V: single MAGI $85,000 -> 6,000 - 6% x 10,000 = $5,400", () => {
  assert.equal(calculateSeniorDeduction({ filing_status: S, magi: 85000, tax_year: 2025, taxpayer_age_65_or_older: true }).deduction, 5400);
});

test("F15 senior joint, both 65+, MAGI $160,000 -> 2 x $5,400 = $10,800", () => {
  assert.equal(calculateSeniorDeduction({ filing_status: J, magi: 160000, tax_year: 2026, taxpayer_age_65_or_older: true, spouse_age_65_or_older: true }).deduction, 10800);
});

test("F16 senior birth-date cutoff: 2025 needs born before 1961-01-02; 2026 before 1962-01-02", () => {
  assert.equal(calculateSeniorDeduction({ filing_status: S, magi: 50000, tax_year: 2025, taxpayer_birth_date: "1961-01-01" }).deduction, 6000);
  assert.equal(calculateSeniorDeduction({ filing_status: S, magi: 50000, tax_year: 2025, taxpayer_birth_date: "1961-01-02" }).deduction, 0);
  assert.equal(calculateSeniorDeduction({ filing_status: S, magi: 50000, tax_year: 2026, taxpayer_birth_date: "1961-06-30" }).deduction, 6000);
  assert.equal(calculateSeniorDeduction({ filing_status: S, magi: 175000, tax_year: 2026, taxpayer_age_65_or_older: true }).deduction, 0);
});

test("F17 Rev. Proc. 2025-32 table base amounts reproduce", () => {
  assert.equal(incomeTax(50400, S, 2026), 5800);
  assert.equal(incomeTax(768700, J, 2026), 206583.5);
  assert.equal(incomeTax(640600, H, 2026), 191171);
  assert.equal(incomeTax(384350, M, 2026), 103291.75);
});

test("F18 Rev. Proc. 2024-40 table base amounts reproduce", () => {
  assert.equal(incomeTax(626350, S, 2025), 188769.75);
  assert.equal(incomeTax(751600, J, 2025), 202154.5);
  assert.equal(incomeTax(626350, H, 2025), 187031.5);
});

test("F19 savings: 2026 single, taxable $60,000, $5,000 premium -> $1,100", () => {
  const r = estimateTaxSavings({ filing_status: S, magi: 76100, tax_year: 2026, taxable_income_before_new_deductions: 60000, qualified_overtime_premium: 5000 });
  assert.equal(r.tax_before, 7912);
  assert.equal(r.tax_after, 6812);
  assert.equal(r.estimated_savings, 1100);
  assert.equal(r.marginal_rate_before, 0.22);
});

test("F20 savings default taxable income = MAGI - 2025 standard deduction; 2027 flags estimate", () => {
  const r = estimateTaxSavings({ filing_status: J, magi: 131500, tax_year: 2025, qualified_tips: 10000 });
  assert.equal(r.taxable_income_before, 100000);
  // 11,157 + 22% x 3,050 = 11,828; after 90,000: 2,385 + 12% x 66,150 = 10,323
  assert.equal(r.estimated_savings, 1505);
  const r27 = estimateTaxSavings({ filing_status: S, magi: 80000, tax_year: 2027, qualified_overtime_premium: 1000 });
  assert.equal(r27.brackets_are_estimate, true);
  assert.equal(r27.brackets_year_used, 2026);
});

test("F21 input errors", () => {
  assert.throws(() => calculateOvertimeDeduction({ filing_status: S, magi: 1, tax_year: 2024, qualified_overtime_premium: 1 }), InputError);
  assert.throws(() => calculateOvertimeDeduction({ filing_status: S, magi: 1, tax_year: 2026 }), InputError);
  assert.throws(() => calculateOvertimeDeduction({ filing_status: S, magi: 1, tax_year: 2026, qualified_overtime_premium: 1, hourly_rate: 20, overtime_hours: 2 }), InputError);
});

test("F22 eligibility: 2026 says box 12 code TT, 2025 says divide by 3", () => {
  assert.match(JSON.stringify(explainEligibility("overtime", 2026)), /box 12 code TT/);
  assert.match(JSON.stringify(explainEligibility("overtime", 2025)), /divided by 3/);
  assert.match(explainEligibility("all", 2026).summary, /Married filing separately cannot/);
});

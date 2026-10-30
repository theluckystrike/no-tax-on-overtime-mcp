// Eligibility and reporting rules, copied from IRS FS-2025-03, FS-2026-13,
// Schedule 1-A (2025 final, 2026 draft) and the 2025 Form 1040 instructions.
import { SOURCES, seniorCutoff } from "./core.js";

export const TOPICS = ["overtime", "tips", "senior", "all"] as const;
export type Topic = (typeof TOPICS)[number];

const COMMON = {
  years_covered: "Tax years 2025, 2026, 2027 and 2028 (returns filed in 2026 to 2029).",
  itemizing: "Available whether you take the standard deduction or itemize. Claimed on Schedule 1-A; the total goes to Form 1040 line 13b (2025) or line 13a (2026 draft).",
  excluded_filing_status: "married_filing_separately. If you are married you must file a joint return to claim any of these deductions.",
  joint_thresholds: "Joint returns use the higher cap and phase-out threshold. Single, head of household and qualifying surviving spouse use the single figures.",
  payroll_tax: "These are income tax deductions only. Social security and Medicare tax still apply to overtime and tips.",
  ssn: "Each person whose overtime, tips or age is used must have a social security number valid for employment, issued by SSA before the return due date (including extensions). An ITIN does not qualify.",
};

function overtime(year: number) {
  return {
    who_qualifies: "Employees who are FLSA overtime-eligible (covered by the FLSA and not exempt) and receive overtime required by FLSA section 7 (29 USC 207).",
    what_qualifies: "Only the premium the FLSA requires: one-half of the regular rate for each hour over 40 in a workweek. The straight-time part of overtime pay does not qualify. Pay above time-and-a-half (double time, daily overtime, weekend or holiday premiums not required by the FLSA, union contract premiums) does not qualify.",
    not_eligible_examples: [
      "Exempt executive, administrative and professional employees, including teachers",
      "Outside sales employees and certain computer employees",
      "Certain commissioned retail or service employees",
      "Railroad, air carrier, certain motor carrier employees, taxi drivers, seamen",
      "Owners of a bona fide 20% or larger equity interest who are active in management",
    ],
    limits: "Cap $12,500 per return ($25,000 joint, a combined limit, not per spouse). Reduced by $100 for each full $1,000 of MAGI over $150,000 ($300,000 joint).",
    reporting: year >= 2026
      ? "Employer reports qualified overtime on Form W-2 box 12 code TT (Form 1099-NEC box 1d or Form 1099-MISC box 14 in rare cases). Enter it on Schedule 1-A Part III (2026 draft lines 16-27). You may not use more than the box 12 code TT amount; if it is missing or too low, ask your employer for a Form W-2c."
      : "For 2025 the employer did not have to report it separately (Notice 2025-69 relief). Use a separate statement, pay stubs, or a reasonable method such as total overtime pay divided by 3 at time-and-a-half. Enter it on Schedule 1-A Part III lines 14a (W-2) and 14b (1099-NEC box 1 or 1099-MISC box 3).",
    withholding: "Employers withhold income tax on overtime as usual. To reduce withholding, give your employer a new Form W-4 using the step 4(b) deduction worksheet.",
  };
}

function tips(year: number) {
  return {
    who_qualifies: "Employees and self-employed people who receive tips in an occupation on the IRS list of occupations that customarily and regularly received tips on or before Dec 31, 2024.",
    occupation_list: SOURCES.tippedOccupations,
    what_qualifies: "Voluntary cash or charged tips the customer decides, including tip sharing. Service charges, automatic gratuities and other mandatory amounts do not qualify.",
    not_eligible: "Tips received in a specified service trade or business (SSTB), as an employee of an SSTB or self-employed in one. Tips earned in an illegal activity (2025 Form 1040 instructions, Schedule 1-A examples).",
    limits: "Cap $25,000 per return for every filing status (a combined limit on joint returns). Self-employed tips count only up to that business's net income. Reduced by $100 for each full $1,000 of MAGI over $150,000 ($300,000 joint).",
    reporting: year >= 2026
      ? "2026 draft Schedule 1-A Part II: employee tips from Form W-2 box 12 code TP or Form 4137; self-employed tips from Form 1099-NEC box 1(b), 1099-MISC box 13(a) or 1099-K box 1(c)."
      : "2025 Schedule 1-A Part II: employee tips from Form W-2 box 7 or Form 4137 line 1; self-employed tips from Form 1099-NEC box 1, 1099-MISC box 3 or 1099-K box 1a.",
  };
}

function senior(year: number) {
  return {
    who_qualifies: `People age 65 or older on the last day of the tax year. For ${year}: born before ${seniorCutoff(year)}.`,
    amount: "$6,000 per qualifying person ($12,000 if both spouses qualify on a joint return). It is in addition to the regular extra standard deduction for age 65+.",
    limits: "Each $6,000 is reduced by 6% of MAGI over $75,000 ($150,000 joint). It reaches $0 at $175,000 ($250,000 joint).",
    reporting: year >= 2026 ? "2026 draft Schedule 1-A Part V, lines 37-43." : "2025 Schedule 1-A Part V, lines 31-37.",
  };
}

export function explainEligibility(topic: Topic, year: number) {
  const out: Record<string, unknown> = { topic, tax_year: year, common_rules: COMMON };
  if (topic === "overtime" || topic === "all") out.overtime = overtime(year);
  if (topic === "tips" || topic === "all") out.tips = tips(year);
  if (topic === "senior" || topic === "all") out.senior = senior(year);
  const summary =
    `For tax years 2025-2028, the One Big Beautiful Bill Act lets eligible people deduct qualified overtime premium (up to $12,500, or $25,000 joint), qualified tips (up to $25,000 per return) and an extra $6,000 per person age 65 or older, whether or not they itemize. ` +
    `Married filing separately cannot claim any of them, and each person must have an SSN valid for employment. ` +
    (year >= 2026
      ? `From 2026, overtime counts only if the employer reports it on Form W-2 box 12 code TT (tips: code TP). `
      : `For 2025 employers did not have to report the amounts separately, so reasonable methods are allowed. `) +
    `Social security and Medicare tax still apply.`;
  return { ...out, summary };
}

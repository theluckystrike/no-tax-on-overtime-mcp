// One tool registry shared by the stdio and Cloudflare Worker entries.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AS_OF, DISCLAIMER, FILING_STATUSES, InputError, SOURCES, moreUrl, seniorCutoff,
  calculateOvertimeDeduction, calculateTipsDeduction, calculateSeniorDeduction, estimateTaxSavings,
} from "./core.js";
import { explainEligibility, TOPICS } from "./eligibility.js";

export const SERVER_NAME = "no-tax-on-overtime-mcp";
export const SERVER_VERSION = "1.0.0";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const filingStatus = z.enum(FILING_STATUSES).describe("Federal filing status. married_filing_separately cannot claim these deductions.");
const taxYear = z.number().int().min(2025).max(2028).describe("Tax year, 2025 to 2028. The deductions end after 2028.");
const magi = z.number().min(0).max(1e9).describe("Modified adjusted gross income in USD: Form 1040 line 11b plus excluded Puerto Rico and foreign income (Schedule 1-A Part I).");
const amount = (d: string) => z.number().min(0).max(1e9).optional().describe(d);

function phaseText(m: number, p: { threshold: number; excess_magi: number; reduction: number }): string {
  return p.excess_magi > 0
    ? `MAGI ${money(m)} is ${money(p.excess_magi)} over the ${money(p.threshold)} threshold, so the phase-out removes ${money(p.reduction)} ($100 per full $1,000).`
    : `MAGI ${money(m)} is not above the ${money(p.threshold)} threshold, so there is no phase-out.`;
}

type Payload = Record<string, unknown>;
function reply(summary: string, data: Payload, source: string, morePath: string) {
  const body = { ...data, summary, as_of: AS_OF, source, more: moreUrl(morePath), disclaimer: DISCLAIMER };
  return {
    content: [
      { type: "text" as const, text: `${summary}\n\n${DISCLAIMER}` },
      { type: "text" as const, text: JSON.stringify(body, null, 2) },
    ],
    structuredContent: body,
  };
}

function run(fn: () => ReturnType<typeof reply>) {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof InputError ? e.message : `Unexpected error: ${(e as Error).message}`;
    return { isError: true, content: [{ type: "text" as const, text: msg }] };
  }
}

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function registerTools(server: McpServer): void {
  server.registerTool(
    "calculate_overtime_deduction",
    {
      title: "No Tax on Overtime deduction",
      description:
        "Calculates the 2025-2028 federal deduction for qualified overtime pay under the One Big Beautiful Bill Act (P.L. 119-21, IRC 225) as IRS Schedule 1-A Part III does: the $12,500 cap ($25,000 joint), then $100 off per full $1,000 of MAGI over $150,000 ($300,000 joint). Only the FLSA half-time premium qualifies, so it converts hourly rate, overtime hours and multiplier (or total overtime pay) to the qualified amount; double time does not double it. Married filing separately gets $0. Figures copied from irs.gov in Oct 2026.",
      inputSchema: {
        filing_status: filingStatus,
        magi,
        tax_year: taxYear,
        qualified_overtime_premium: amount("Qualified overtime compensation already known, e.g. Form W-2 box 12 code TT. Use this OR the hourly fields OR total_overtime_pay."),
        hourly_rate: amount("FLSA regular rate of pay per hour, in USD."),
        overtime_hours: amount("Overtime hours over 40 in a workweek, summed for the year."),
        total_overtime_pay: amount("Total pay for the overtime hours (straight time plus premium)."),
        multiplier: z.number().min(1).max(5).optional().describe("Overtime pay multiplier. 1.5 = time-and-a-half (default), 2 = double time."),
      },
      annotations: { ...RO, title: "No Tax on Overtime deduction" },
    },
    async (a) => run(() => {
      const r = calculateOvertimeDeduction(a);
      const s = r.eligible
        ? `Qualified overtime premium ${money(r.qualified_overtime)}. After the ${money(r.cap)} cap: ${money(r.amount_after_cap)}. ${phaseText(r.magi, r.phaseout)} Deduction for ${r.tax_year}: ${money(r.deduction)}. Only the FLSA premium (the "half" in time-and-a-half) qualifies, not the straight-time part or any extra premium.`
        : `Married filing separately cannot claim the overtime deduction for ${r.tax_year}. The deduction is $0. File jointly to claim it.`;
      return reply(s, r, `${SOURCES.schedule1a2025} ; ${SOURCES.overtimeFaq}`, "/");
    }),
  );

  server.registerTool(
    "calculate_tips_deduction",
    {
      title: "No Tax on Tips deduction",
      description:
        "Calculates the 2025-2028 federal deduction for qualified tips under the One Big Beautiful Bill Act (P.L. 119-21, IRC 224) as IRS Schedule 1-A Part II does: a $25,000 cap per return for every filing status, then $100 off per full $1,000 of MAGI over $150,000 ($300,000 joint). Self-employed tips count only up to that business's net income. Married filing separately gets $0. Figures copied from irs.gov in Oct 2026.",
      inputSchema: {
        filing_status: filingStatus,
        magi,
        tax_year: taxYear,
        employee_tips: amount("Qualified tips received as an employee (2025: Form W-2 box 7 or Form 4137; 2026+: W-2 box 12 code TP)."),
        self_employed_tips: amount("Qualified tips received in your own trade or business (Form 1099-NEC, 1099-MISC or 1099-K)."),
        self_employed_net_income: z.number().min(-1e9).max(1e9).optional().describe("Net income of the trade or business where the self-employed tips were earned."),
      },
      annotations: { ...RO, title: "No Tax on Tips deduction" },
    },
    async (a) => run(() => {
      const r = calculateTipsDeduction(a);
      const s = r.eligible
        ? `Qualified tips ${money(r.qualified_tips)}. After the $25,000 per-return cap: ${money(r.amount_after_cap)}. ${phaseText(r.magi, r.phaseout)} Deduction for ${r.tax_year}: ${money(r.deduction)}.`
        : `Married filing separately cannot claim the tips deduction for ${r.tax_year}. The deduction is $0.`;
      return reply(s, r, `${SOURCES.schedule1a2025} ; ${SOURCES.instructions1040}`, "/calculators/tips/");
    }),
  );

  server.registerTool(
    "calculate_senior_deduction",
    {
      title: "Enhanced deduction for seniors (65+)",
      description:
        "Calculates the 2025-2028 enhanced deduction for seniors under the One Big Beautiful Bill Act (P.L. 119-21) as IRS Schedule 1-A Part V does: $6,000 per person age 65 or older by Dec 31, each reduced by 6% of MAGI over $75,000 ($150,000 joint). On a joint return the reduction applies to each spouse's $6,000. Married filing separately gets $0. Figures copied from irs.gov in Oct 2026.",
      inputSchema: {
        filing_status: filingStatus,
        magi,
        tax_year: taxYear,
        taxpayer_age_65_or_older: z.boolean().optional().describe("True if you are 65 or older on Dec 31 of the tax year. Ignored if taxpayer_birth_date is given."),
        taxpayer_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Your birth date, YYYY-MM-DD."),
        spouse_age_65_or_older: z.boolean().optional().describe("Joint returns only. True if your spouse is 65 or older on Dec 31."),
        spouse_birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Joint returns only. Spouse birth date, YYYY-MM-DD."),
      },
      annotations: { ...RO, title: "Enhanced deduction for seniors (65+)" },
    },
    async (a) => run(() => {
      const r = calculateSeniorDeduction(a);
      const s = r.filing_status === "married_filing_separately"
        ? `Married filing separately cannot claim the senior deduction for ${r.tax_year}. The deduction is $0.`
        : r.qualifying_people === 0
          ? `Nobody on this return qualifies for ${r.tax_year}: a person must be born before ${seniorCutoff(r.tax_year)}. The deduction is $0.`
          : `${r.qualifying_people} qualifying person(s). MAGI ${money(r.magi)} is ${money(r.excess_magi)} over the ${money(r.threshold)} threshold, so each $6,000 is reduced by ${money(r.reduction_per_person)} to ${money(r.amount_per_person)}. Deduction for ${r.tax_year}: ${money(r.deduction)}.`;
      return reply(s, r, `${SOURCES.schedule1a2025} ; ${SOURCES.factSheet}`, "/calculators/senior-deduction/");
    }),
  );

  server.registerTool(
    "estimate_tax_savings",
    {
      title: "Estimate federal tax saved",
      description:
        "Estimates the federal income tax saved in 2025-2028 by the One Big Beautiful Bill Act overtime, tips and senior deductions combined. It applies each deduction's cap and phase-out, then runs taxable income through the IRS bracket tables for that year (Rev. Proc. 2024-40 for 2025, Rev. Proc. 2025-32 for 2026) before and after. 2027-2028 brackets are not published yet, so it uses 2026 and says so. Federal income tax only.",
      inputSchema: {
        filing_status: filingStatus,
        magi,
        tax_year: taxYear,
        taxable_income_before_new_deductions: amount("Taxable income before these deductions. If left out it is approximated as MAGI minus the basic standard deduction."),
        qualified_overtime_premium: amount("Qualified overtime premium (W-2 box 12 code TT)."),
        hourly_rate: amount("Regular hourly rate, if you want the premium computed from hours."),
        overtime_hours: amount("Overtime hours for the year."),
        overtime_multiplier: z.number().min(1).max(5).optional().describe("1.5 = time-and-a-half (default)."),
        qualified_tips: amount("Qualified tips for the year."),
        taxpayer_age_65_or_older: z.boolean().optional().describe("True if you are 65+ on Dec 31 of the tax year."),
        spouse_age_65_or_older: z.boolean().optional().describe("Joint returns only. True if your spouse is 65+ on Dec 31."),
      },
      annotations: { ...RO, title: "Estimate federal tax saved" },
    },
    async (a) => run(() => {
      const r = estimateTaxSavings(a);
      const d = r.deductions;
      const s = `Deductions for ${r.tax_year}: overtime ${money(d.overtime)}, tips ${money(d.tips)}, seniors ${money(d.senior)}, total ${money(d.total)}. Taxable income falls from ${money(r.taxable_income_before)} to ${money(r.taxable_income_after)} (marginal rate ${Math.round(r.marginal_rate_before * 100)}%). Federal income tax falls from ${money(r.tax_before)} to ${money(r.tax_after)}, an estimated saving of ${money(r.estimated_savings)}.${r.brackets_are_estimate ? " The 2026 brackets stand in for the unpublished " + r.tax_year + " brackets." : ""}`;
      return reply(s, r, `${r.brackets_year_used === 2025 ? SOURCES.revProc2025 : SOURCES.revProc2026} ; ${SOURCES.schedule1a2025}`, "/");
    }),
  );

  server.registerTool(
    "explain_eligibility",
    {
      title: "Who qualifies, and how it is reported",
      description:
        "Explains who can claim the 2025-2028 One Big Beautiful Bill Act deductions for overtime, tips and seniors: years covered, excluded filing status (married filing separately), the valid-SSN rule, FLSA overtime eligibility, and exactly where the amounts are reported (Form W-2 box 12 codes TT and TP, Form 1099-NEC/1099-MISC/1099-K boxes, Schedule 1-A lines), including the 2026 change that only W-2 box 12 code TT amounts count. Taken from IRS FAQs and forms fetched Oct 2026.",
      inputSchema: {
        topic: z.enum(TOPICS).optional().describe("overtime, tips, senior or all (default all)."),
        tax_year: taxYear.optional(),
      },
      annotations: { ...RO, title: "Who qualifies, and how it is reported" },
    },
    async (a) => run(() => {
      const r = explainEligibility(a.topic ?? "all", a.tax_year ?? 2026);
      return reply(r.summary, r, `${SOURCES.overtimeFaq} ; ${SOURCES.factSheet}`, "/eligibility/");
    }),
  );
}

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerTools(server);
  return server;
}

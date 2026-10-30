// Pure calculation core for the 2025-2028 federal deductions added by the
// One Big Beautiful Bill Act (P.L. 119-21): qualified overtime, qualified tips
// and the enhanced deduction for seniors. No I/O. Every number below was copied
// from an irs.gov document fetched on 2026-10-30; see DATA_SOURCES.md.
export const AS_OF = "2026-10-30";
export const REPO = "no-tax-on-overtime-mcp";
export const DISCLAIMER = "This is an estimate, not tax advice. Check the IRS instructions for Schedule 1-A or ask a tax professional before you file.";
export const FILING_STATUSES = [
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
];
export const TAX_YEARS = [2025, 2026, 2027, 2028];
export const SOURCES = {
    factSheet: "https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors",
    schedule1a2025: "https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf",
    schedule1a2026Draft: "https://www.irs.gov/pub/irs-dft/f1040s1a--dft.pdf",
    instructions1040: "https://www.irs.gov/pub/irs-pdf/i1040gi.pdf",
    overtimeFaq: "https://www.irs.gov/pub/taxpros/fs-2026-13.pdf",
    revProc2025: "https://www.irs.gov/pub/irs-drop/rp-24-40.pdf",
    revProc2026: "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf",
    brackets: "https://www.irs.gov/filing/federal-income-tax-rates-and-brackets",
    standardDeduction: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
    tippedOccupations: "https://www.irs.gov/TippedOccupations",
};
const SITE = "https://noovertimetax.com";
export function moreUrl(path) {
    return `${SITE}${path}?utm_source=mcp&utm_medium=${REPO}`;
}
// Schedule 1-A (2025) Part II and Part III; 2026 draft lines 9-15 and 21-27.
export const OVERTIME_CAP = { single: 12500, joint: 25000 };
export const TIPS_CAP = 25000; // per return, regardless of filing status
export const STEP_PHASEOUT = { single: 150000, joint: 300000, step: 1000, perStep: 100 };
// Schedule 1-A Part V: $6,000 per qualifying person, reduced by 6% of MAGI over the threshold.
export const SENIOR = { amount: 6000, single: 75000, joint: 150000, rate: 0.06 };
export function round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
}
export function isJoint(fs) {
    return fs === "married_filing_jointly";
}
export class InputError extends Error {
}
function requireYear(year) {
    if (!TAX_YEARS.includes(year)) {
        throw new InputError(`tax_year must be 2025, 2026, 2027 or 2028. These deductions do not exist for ${year}.`);
    }
    return year;
}
function requireAmount(name, v) {
    if (v === undefined || !Number.isFinite(v) || v < 0)
        throw new InputError(`${name} must be a number of 0 or more.`);
    return v;
}
// Schedule 1-A lines 16-20 (2025): steps = floor((MAGI - threshold) / 1,000); reduction = steps x $100.
export function stepPhaseout(fs, magi) {
    const threshold = isJoint(fs) ? STEP_PHASEOUT.joint : STEP_PHASEOUT.single;
    const excess = Math.max(0, magi - threshold);
    const steps = Math.floor(excess / STEP_PHASEOUT.step);
    return { threshold, excess_magi: round2(excess), reduction_steps: steps, reduction: steps * STEP_PHASEOUT.perStep };
}
// FS-2026-13 A12 and A16: only the FLSA premium (one-half of the regular rate for each
// overtime hour) qualifies. Pay above time-and-a-half (e.g. double time) does not.
export function qualifiedPremium(input) {
    const hasPremium = input.qualified_overtime_premium !== undefined;
    const hasHourly = input.hourly_rate !== undefined || input.overtime_hours !== undefined;
    const hasTotal = input.total_overtime_pay !== undefined;
    const modes = [hasPremium, hasHourly, hasTotal].filter(Boolean).length;
    if (modes !== 1) {
        throw new InputError("Give exactly one of: qualified_overtime_premium; or hourly_rate with overtime_hours; or total_overtime_pay.");
    }
    const m = input.multiplier ?? 1.5;
    if (!Number.isFinite(m) || m < 1 || m > 5)
        throw new InputError("multiplier must be between 1 and 5 (1.5 = time-and-a-half).");
    const share = Math.min(0.5, m - 1);
    if (hasPremium) {
        const p = requireAmount("qualified_overtime_premium", input.qualified_overtime_premium);
        return {
            qualified_overtime: round2(p),
            method: "reported_premium",
            explanation: "Used the qualified overtime amount you gave (for 2026-2028 this is Form W-2 box 12 code TT).",
        };
    }
    if (hasHourly) {
        const rate = requireAmount("hourly_rate", input.hourly_rate);
        const hours = requireAmount("overtime_hours", input.overtime_hours);
        const total = rate * m * hours;
        const q = rate * hours * share;
        return {
            qualified_overtime: round2(q),
            method: "hourly_rate_x_hours",
            regular_rate: rate,
            overtime_hours: hours,
            multiplier: m,
            total_overtime_pay: round2(total),
            non_qualifying_pay: round2(total - q),
            explanation: `Qualified premium = regular rate ${rate} x ${hours} overtime hours x ${share} (the FLSA half-time premium). The straight-time part of overtime pay and any premium above time-and-a-half do not qualify.`,
        };
    }
    const total = requireAmount("total_overtime_pay", input.total_overtime_pay);
    const straight = total / m;
    const q = straight * share;
    return {
        qualified_overtime: round2(q),
        method: "total_overtime_pay",
        multiplier: m,
        total_overtime_pay: round2(total),
        non_qualifying_pay: round2(total - q),
        explanation: `Straight-time pay for the overtime hours = ${total} / ${m}; qualified premium = that x ${share}. At time-and-a-half this is total / 3, the method in the 2025 Form 1040 instructions.`,
    };
}
export function calculateOvertimeDeduction(input) {
    const year = requireYear(input.tax_year);
    const magi = requireAmount("magi", input.magi);
    const premium = qualifiedPremium(input);
    const fs = input.filing_status;
    const notes = [];
    if (year >= 2026) {
        notes.push("For 2026-2028 you may not count more than the amount your employer reports on Form W-2 box 12 code TT (or Form 1099-NEC box 1d / 1099-MISC box 14). If it is missing or too low, ask for a Form W-2c (FS-2026-13 A20-A23).");
    }
    else {
        notes.push("For 2025 the employer did not have to report the amount separately; Notice 2025-69 lets you use a reasonable method such as the one used here.");
    }
    notes.push("The deduction lowers federal income tax only. Social security and Medicare tax still apply to overtime pay.");
    if (fs === "married_filing_separately") {
        return {
            eligible: false, filing_status: fs, tax_year: year, magi, ...premium,
            cap: 0, amount_after_cap: 0, phaseout: stepPhaseout(fs, magi), deduction: 0,
            notes: ["Married taxpayers must file a joint return to claim this deduction. Married filing separately gets $0.", ...notes],
        };
    }
    const cap = isJoint(fs) ? OVERTIME_CAP.joint : OVERTIME_CAP.single;
    const afterCap = Math.min(premium.qualified_overtime, cap);
    const ph = stepPhaseout(fs, magi);
    const deduction = round2(Math.max(0, afterCap - ph.reduction));
    if (premium.qualified_overtime > cap)
        notes.unshift(`The qualified amount is above the $${cap.toLocaleString("en-US")} cap for this return, so only the cap counts.`);
    return {
        eligible: true, filing_status: fs, tax_year: year, magi, ...premium,
        cap, amount_after_cap: round2(afterCap), phaseout: ph, deduction, notes,
    };
}
export function calculateTipsDeduction(input) {
    const year = requireYear(input.tax_year);
    const magi = requireAmount("magi", input.magi);
    const emp = input.employee_tips === undefined ? 0 : requireAmount("employee_tips", input.employee_tips);
    const se = input.self_employed_tips === undefined ? 0 : requireAmount("self_employed_tips", input.self_employed_tips);
    if (input.employee_tips === undefined && input.self_employed_tips === undefined) {
        throw new InputError("Give employee_tips, self_employed_tips, or both.");
    }
    const notes = [];
    let seCounted = se;
    if (se > 0 && input.self_employed_net_income !== undefined) {
        const net = Math.max(0, input.self_employed_net_income);
        seCounted = Math.min(se, net);
        if (seCounted < se)
            notes.push("Self-employed tips count only up to the net income of the trade or business where you earned them.");
    }
    const qualified = round2(emp + seCounted);
    notes.push("Tips must be voluntary and earned in an occupation on the IRS list of occupations that customarily and regularly received tips on or before Dec 31, 2024. Service charges and automatic gratuities do not count. Tips from a specified service trade or business (SSTB) do not count.");
    notes.push("Social security and Medicare tax still apply to tips.");
    const fs = input.filing_status;
    if (fs === "married_filing_separately") {
        return {
            eligible: false, filing_status: fs, tax_year: year, magi, qualified_tips: qualified,
            cap: 0, amount_after_cap: 0, phaseout: stepPhaseout(fs, magi), deduction: 0,
            notes: ["Married taxpayers must file a joint return to claim this deduction. Married filing separately gets $0.", ...notes],
        };
    }
    const afterCap = Math.min(qualified, TIPS_CAP);
    const ph = stepPhaseout(fs, magi);
    const deduction = round2(Math.max(0, afterCap - ph.reduction));
    if (qualified > TIPS_CAP)
        notes.unshift("The cap is $25,000 per return for every filing status, including joint returns.");
    return {
        eligible: true, filing_status: fs, tax_year: year, magi, qualified_tips: qualified,
        cap: TIPS_CAP, amount_after_cap: round2(afterCap), phaseout: ph, deduction, notes,
    };
}
// Schedule 1-A Part V: qualifies if born before January 2 of (tax year - 64),
// i.e. age 65 on or before the last day of the tax year (2025 form: before Jan 2, 1961;
// 2026 draft: before Jan 2, 1962).
export function seniorCutoff(year) {
    return `${year - 64}-01-02`;
}
export function isSenior(year, birthDate, flag) {
    if (birthDate !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
            throw new InputError("Birth dates must use the format YYYY-MM-DD.");
        }
        return birthDate < seniorCutoff(year);
    }
    return flag === true;
}
export function calculateSeniorDeduction(input) {
    const year = requireYear(input.tax_year);
    const magi = requireAmount("magi", input.magi);
    const fs = input.filing_status;
    const you = isSenior(year, input.taxpayer_birth_date, input.taxpayer_age_65_or_older);
    const spouse = isJoint(fs) && isSenior(year, input.spouse_birth_date, input.spouse_age_65_or_older);
    const threshold = isJoint(fs) ? SENIOR.joint : SENIOR.single;
    const excess = Math.max(0, magi - threshold);
    const reduction = round2(excess * SENIOR.rate);
    const perPerson = round2(Math.max(0, SENIOR.amount - reduction));
    const notes = [
        `Qualifies if born before ${seniorCutoff(year)} (age 65 by Dec 31, ${year}) and the person has a valid SSN.`,
        "This is in addition to the regular extra standard deduction for age 65+, and you can claim it whether or not you itemize.",
    ];
    if (fs === "married_filing_separately") {
        return {
            eligible: false, filing_status: fs, tax_year: year, magi, qualifying_people: 0, threshold,
            excess_magi: round2(excess), reduction_per_person: reduction, amount_per_person: 0, deduction: 0,
            notes: ["Married taxpayers must file a joint return to claim this deduction. Married filing separately gets $0.", ...notes],
        };
    }
    const people = (you ? 1 : 0) + (spouse ? 1 : 0);
    if (people === 2)
        notes.push("The 6% reduction applies to each spouse's $6,000 separately (Schedule 1-A lines 36a and 36b).");
    return {
        eligible: people > 0, filing_status: fs, tax_year: year, magi, qualifying_people: people, threshold,
        excess_magi: round2(excess), reduction_per_person: reduction, amount_per_person: perPerson,
        deduction: round2(perPerson * people), notes,
    };
}
const RATES = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
function table(bounds) {
    return [0, ...bounds].map((b, i) => [b, RATES[i]]);
}
export const BRACKETS = {
    2025: {
        joint: table([23850, 96950, 206700, 394600, 501050, 751600]),
        hoh: table([17000, 64850, 103350, 197300, 250500, 626350]),
        single: table([11925, 48475, 103350, 197300, 250525, 626350]),
        mfs: table([11925, 48475, 103350, 197300, 250525, 375800]),
    },
    2026: {
        joint: table([24800, 100800, 211400, 403550, 512450, 768700]),
        hoh: table([17700, 67450, 105700, 201750, 256200, 640600]),
        single: table([12400, 50400, 105700, 201775, 256225, 640600]),
        mfs: table([12400, 50400, 105700, 201775, 256225, 384350]),
    },
};
// IRS newsroom, tax year 2026 inflation adjustments (also states the OBBBA 2025 amounts).
export const STANDARD_DEDUCTION = {
    2025: { single: 15750, joint: 31500, hoh: 23625 },
    2026: { single: 16100, joint: 32200, hoh: 24150 },
};
function tableKey(fs) {
    if (fs === "married_filing_jointly" || fs === "qualifying_surviving_spouse")
        return "joint";
    if (fs === "head_of_household")
        return "hoh";
    return fs === "married_filing_separately" ? "mfs" : "single";
}
export function bracketYear(year) {
    return year === 2025 ? 2025 : 2026;
}
export function incomeTax(taxable, fs, year) {
    const t = BRACKETS[bracketYear(year)][tableKey(fs)];
    let tax = 0;
    for (let i = 0; i < t.length; i++) {
        const lo = t[i][0];
        const hi = i + 1 < t.length ? t[i + 1][0] : Infinity;
        if (taxable > lo)
            tax += (Math.min(taxable, hi) - lo) * t[i][1];
    }
    return round2(tax);
}
export function marginalRate(taxable, fs, year) {
    const t = BRACKETS[bracketYear(year)][tableKey(fs)];
    let rate = t[0][1];
    for (const [lo, r] of t)
        if (taxable > lo)
            rate = r;
    return rate;
}
export function standardDeduction(fs, year) {
    const k = tableKey(fs);
    return STANDARD_DEDUCTION[bracketYear(year)][k === "mfs" ? "single" : k];
}
export function estimateTaxSavings(input) {
    const year = requireYear(input.tax_year);
    const magi = requireAmount("magi", input.magi);
    const fs = input.filing_status;
    const notes = [];
    const hasOt = input.qualified_overtime_premium !== undefined || input.hourly_rate !== undefined || input.overtime_hours !== undefined;
    const ot = hasOt
        ? calculateOvertimeDeduction({
            filing_status: fs, magi, tax_year: year, qualified_overtime_premium: input.qualified_overtime_premium,
            hourly_rate: input.hourly_rate, overtime_hours: input.overtime_hours, multiplier: input.overtime_multiplier,
        })
        : null;
    const tips = input.qualified_tips !== undefined
        ? calculateTipsDeduction({ filing_status: fs, magi, tax_year: year, employee_tips: input.qualified_tips })
        : null;
    const senior = input.taxpayer_age_65_or_older || input.spouse_age_65_or_older
        ? calculateSeniorDeduction({
            filing_status: fs, magi, tax_year: year,
            taxpayer_age_65_or_older: input.taxpayer_age_65_or_older, spouse_age_65_or_older: input.spouse_age_65_or_older,
        })
        : null;
    if (!ot && !tips && !senior)
        throw new InputError("Give at least one of: overtime inputs, qualified_tips, or an age 65+ flag.");
    const total = round2((ot?.deduction ?? 0) + (tips?.deduction ?? 0) + (senior?.deduction ?? 0));
    let taxable = input.taxable_income_before_new_deductions;
    if (taxable === undefined) {
        taxable = Math.max(0, magi - standardDeduction(fs, year));
        notes.push(`Taxable income was approximated as MAGI minus the ${bracketYear(year)} basic standard deduction ($${standardDeduction(fs, year).toLocaleString("en-US")}). Give taxable_income_before_new_deductions for a closer figure.`);
    }
    else {
        requireAmount("taxable_income_before_new_deductions", taxable);
    }
    if (year >= 2027)
        notes.push(`The IRS has not published ${year} tax brackets yet (checked ${AS_OF}). This estimate uses the 2026 brackets and standard deduction.`);
    notes.push("Federal income tax only. Social security, Medicare and state income tax are not included.");
    const after = Math.max(0, taxable - total);
    const before = incomeTax(taxable, fs, year);
    const afterTax = incomeTax(after, fs, year);
    return {
        filing_status: fs, tax_year: year, magi, brackets_year_used: bracketYear(year),
        brackets_are_estimate: year >= 2027,
        deductions: { overtime: ot?.deduction ?? 0, tips: tips?.deduction ?? 0, senior: senior?.deduction ?? 0, total },
        taxable_income_before: round2(taxable), taxable_income_after: round2(after),
        marginal_rate_before: marginalRate(taxable, fs, year),
        tax_before: before, tax_after: afterTax, estimated_savings: round2(before - afterTax),
        details: { overtime: ot, tips, senior }, notes,
    };
}

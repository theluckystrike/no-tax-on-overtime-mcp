# no-tax-on-overtime-mcp

An MCP server that calculates the 2025-2028 federal no tax on overtime, no tax on tips and senior deductions from the One Big Beautiful Bill Act (P.L. 119-21), using the IRS caps, phase-outs and bracket tables.

Hosted endpoint, no sign-in and no token:

```
https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp
```

## Tools

| Tool | What it does |
|---|---|
| `calculate_overtime_deduction` | Deduction for qualified overtime after the $12,500 cap ($25,000 joint) and the MAGI phase-out. Takes the W-2 box 12 code TT amount, or hourly rate + overtime hours + multiplier, or total overtime pay, and keeps only the FLSA half-time premium. |
| `calculate_tips_deduction` | Deduction for qualified tips after the $25,000 per-return cap and the MAGI phase-out. Limits self-employed tips to net income. |
| `calculate_senior_deduction` | Enhanced $6,000 deduction per person age 65 or older, reduced by 6% of MAGI over $75,000 ($150,000 joint). Accepts birth dates. |
| `estimate_tax_savings` | Combines the three deductions and runs taxable income through the IRS bracket tables for the year to estimate federal income tax saved. |
| `explain_eligibility` | Who qualifies, the excluded filing status, the SSN rule, FLSA exemptions, the W-2 and 1099 boxes, Schedule 1-A lines, and the years covered. |

Every result has structured JSON, a plain-English summary, `as_of`, `source` (the irs.gov document) and `more` (a calculator page on noovertimetax.com).

## What it knows that your model does not

- These deductions started in tax year 2025, after most models were trained. The law was signed on July 4, 2025.
- The phase-out is $100 for each full $1,000 of MAGI over the threshold, rounded down, as Schedule 1-A lines 16-21 do it. It is not a smooth percentage.
- Only the FLSA premium qualifies. Ten double-time hours at $20 give $100 of qualified overtime, not $200 (IRS FS-2026-13 A16).
- From 2026 you may not use more than the amount in Form W-2 box 12 code TT. If your employer leaves it out, you need a Form W-2c (FS-2026-13, August 2026).
- The tips cap is $25,000 per return even on a joint return. The overtime cap doubles for joint returns. The senior reduction applies to each spouse separately.
- Married filing separately gets nothing from any of the three.
- 2025 and 2026 brackets from Rev. Proc. 2024-40 and Rev. Proc. 2025-32, including the OBBBA standard deduction amounts.

## Install

### Claude.ai custom connector or ChatGPT developer mode

Add a custom connector and paste the URL. No token is needed.

```
https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http no-tax-on-overtime https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp
```

Or run it locally:

```
claude mcp add no-tax-on-overtime -- npx -y no-tax-on-overtime-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "no-tax-on-overtime": {
      "command": "npx",
      "args": ["-y", "no-tax-on-overtime-mcp"]
    }
  }
}
```

### Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "no-tax-on-overtime": {
      "url": "https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "no-tax-on-overtime": {
      "type": "http",
      "url": "https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

Node 20 or newer is needed for the local `npx` version.

## Example prompts

- "I make $28 an hour and worked 300 overtime hours at time-and-a-half in 2026. I file single and my MAGI is $72,000. How much can I deduct?"
- "My employer pays double time. Does all of it count for the no tax on overtime deduction?"
- "We file jointly, both of us are 67, and our MAGI is $180,000. What is our senior deduction for 2025?"
- "I'm a bartender with $31,000 in tips and $95,000 MAGI. What does the tips deduction save me in federal tax?"
- "My W-2 for 2026 has no box 12 code TT. Can I still claim the overtime deduction?"

## Data sources

All numbers come from irs.gov documents fetched on 2026-10-30: Schedule 1-A (2025 and the 2026 draft), the 2025 Form 1040 instructions, fact sheets FS-2025-03 and FS-2026-13, Rev. Proc. 2024-40 and Rev. Proc. 2025-32. See [DATA_SOURCES.md](DATA_SOURCES.md) for each item and URL.

## Limitations

- Results are estimates, not tax advice.
- Federal income tax only. Social security, Medicare and state taxes are not included.
- The IRS has not yet published 2027 or 2028 brackets. For those years the savings estimate uses the 2026 tables and says so.
- If you leave out taxable income, the savings tool uses MAGI minus the basic standard deduction. It ignores the extra standard deduction for age 65+, itemized deductions and credits.
- It does not decide whether you are FLSA overtime-eligible or whether your occupation is on the tipped list. `explain_eligibility` lists the rules.
- The car loan interest deduction is not covered.

## More

Calculators and guides for people: [noovertimetax.com](https://noovertimetax.com/?utm_source=mcp&utm_medium=no-tax-on-overtime-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm run build
npm test
```

`src/core.ts` holds all the rules and has no I/O. `src/stdio.ts` is the local entry and `src/worker.ts` is the Cloudflare Worker entry. Both use the same tool registry in `src/tools.ts`.

## License

MIT

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [gold-price-per-gram-mcp](https://github.com/theluckystrike/gold-price-per-gram-mcp) | get_gold_price_per_gram, get_metal_prices, calculate_jewelry_value, convert_gold_units | `https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |
| [ab-test-sample-size-calculator-mcp](https://github.com/theluckystrike/ab-test-sample-size-calculator-mcp) | calculate_sample_size, estimate_test_duration, test_ab_significance, fisher_exact_test, check_peeking_risk | `https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp` |
| [ap-score-distributions-mcp](https://github.com/theluckystrike/ap-score-distributions-mcp) | get_ap_score_distribution, estimate_ap_percentile, compare_ap_exams, list_ap_exams, estimate_ap_score_from_composite | `https://ap-score-distributions-mcp.lipmichal.workers.dev/mcp` |
| [car-loan-interest-deduction-calculator-mcp](https://github.com/theluckystrike/car-loan-interest-deduction-calculator-mcp) | calculate_car_loan_interest_deduction, calculate_salt_deduction, get_tax_brackets_and_standard_deduction, calculate_child_tax_credit | `https://car-loan-interest-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [recipe-nutrition-calculator-mcp](https://github.com/theluckystrike/recipe-nutrition-calculator-mcp) | lookup_ingredient_nutrition, calculate_recipe_nutrition, round_nutrition_label, scale_recipe_nutrition | `https://recipe-nutrition-calculator-mcp.lipmichal.workers.dev/mcp` |
| [retirement-contribution-limits-2027-mcp](https://github.com/theluckystrike/retirement-contribution-limits-2027-mcp) | get_contribution_limits, calculate_max_contribution, get_social_security_cola, compare_years | `https://retirement-contribution-limits-2027-mcp.lipmichal.workers.dev/mcp` |
| [section-179-deduction-calculator-mcp](https://github.com/theluckystrike/section-179-deduction-calculator-mcp) | calculate_section_179, calculate_bonus_depreciation, get_vehicle_depreciation_limits, calculate_asset_loan_payment | `https://section-179-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [subdomain-finder-mcp](https://github.com/theluckystrike/subdomain-finder-mcp) | find_subdomains, resolve_subdomains, get_certificate_history, summarize_attack_surface | `https://subdomain-finder-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->

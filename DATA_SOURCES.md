# Data sources

Every rule, rate and threshold in `src/core.ts` and `src/eligibility.ts` was copied from the documents below. All were fetched from irs.gov on 2026-10-30.

| Item | Value used | Source |
|---|---|---|
| Overtime cap | $12,500 per return, $25,000 joint (combined, not per spouse) | Schedule 1-A (2025) line 15; 2026 draft line 21; FS-2026-13 A2; 2025 Form 1040 instructions |
| Overtime phase-out | $100 for each full $1,000 of MAGI over $150,000 ($300,000 joint); round down | Schedule 1-A (2025) lines 16-21; 2026 draft lines 22-27 |
| Qualified overtime | FLSA-required premium only: hours over 40 x 1/2 x regular rate; double time counts only the half | FS-2026-13 A12, A16 (worked example: $20/h, 10 h at 2x gives $100) |
| 2025 methods | Total overtime pay / 3 at time-and-a-half; examples 1-5 | 2025 Form 1040 instructions, Schedule 1-A Part III |
| 2026-2028 reporting | Only Form W-2 box 12 code TT counts (1099-NEC box 1d, 1099-MISC box 14); W-2c if wrong | FS-2026-13 A6, A10, A19-A23; 2026 draft Schedule 1-A lines 16-19 |
| Tips cap | $25,000 per return, every filing status | Schedule 1-A (2025) line 7; 2026 draft line 9; 2025 Form 1040 instructions |
| Tips phase-out | Same as overtime | Schedule 1-A (2025) lines 8-13; 2026 draft lines 10-15 |
| Tips reporting | 2025: W-2 box 7, Form 4137, 1099-NEC box 1, 1099-MISC box 3, 1099-K box 1a. 2026: W-2 box 12 code TP, 1099-NEC box 1(b), 1099-MISC box 13(a), 1099-K box 1(c) | Schedule 1-A 2025 and 2026 draft |
| Tips limits | Listed occupations only; no SSTB; self-employed limited to net income | FS-2025-03; 2025 Form 1040 instructions |
| Senior deduction | $6,000 per qualifying person; minus 6% of MAGI over $75,000 ($150,000 joint), per person | Schedule 1-A (2025) lines 31-37; 2026 draft lines 37-43; FS-2025-03 |
| Senior age test | Born before Jan 2, 1961 (2025), before Jan 2, 1962 (2026); 2027-2028 extend the same rule (age 65 by Dec 31) | Schedule 1-A 2025 line 36a; 2026 draft line 42a; FS-2025-03 |
| Excluded filing status | Married filing separately (married must file jointly) | Schedule 1-A cautions; FS-2026-13 A25; FS-2025-03 |
| SSN rule | Valid for employment, issued before the return due date including extensions | FS-2026-13 A24; 2025 Form 1040 instructions |
| Years | 2025 through 2028 | FS-2025-03 |
| 2025 brackets | Rev. Proc. 2024-40 section 1(j)(2) tables | rp-24-40.pdf; IRS brackets page |
| 2026 brackets | Rev. Proc. 2025-32 section 4.01 tables | rp-25-32.pdf |
| Standard deduction | 2025: $15,750 / $31,500 / $23,625. 2026: $16,100 / $32,200 / $24,150 | IRS newsroom, 2026 inflation adjustments |

## URLs

- FS-2025-03 fact sheet: https://www.irs.gov/newsroom/one-big-beautiful-bill-act-tax-deductions-for-working-americans-and-seniors
- Schedule 1-A (Form 1040) 2025: https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf
- Schedule 1-A (Form 1040) 2026 draft: https://www.irs.gov/pub/irs-dft/f1040s1a--dft.pdf
- 2025 Form 1040 instructions (Schedule 1-A section): https://www.irs.gov/pub/irs-pdf/i1040gi.pdf
- FS-2026-13 overtime FAQs (Aug 2026): https://www.irs.gov/pub/taxpros/fs-2026-13.pdf
- Rev. Proc. 2024-40: https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
- Rev. Proc. 2025-32: https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
- Federal income tax rates and brackets: https://www.irs.gov/filing/federal-income-tax-rates-and-brackets
- 2026 inflation adjustments news release: https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
- Tipped occupations list: https://www.irs.gov/TippedOccupations

## Not yet published

The IRS had not published the 2027 or 2028 bracket tables or standard deduction on 2026-10-30 (the 2026-2027 Priority Guidance Plan schedules the 2027 revenue procedure for October 2026). For those years `estimate_tax_savings` uses the 2026 tables and returns `brackets_are_estimate: true`. The deduction caps and thresholds are fixed dollar amounts in the statute and apply unchanged to 2027 and 2028 per FS-2025-03.

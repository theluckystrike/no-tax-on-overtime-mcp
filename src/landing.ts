// GET / page for the hosted Worker.
const TOOLS: Array<[string, string]> = [
  ["calculate_overtime_deduction", "Overtime deduction after the $12,500 / $25,000 cap and the MAGI phase-out. Converts hourly rate, hours and multiplier to the FLSA half-time premium."],
  ["calculate_tips_deduction", "Tips deduction after the $25,000 per-return cap and the MAGI phase-out."],
  ["calculate_senior_deduction", "Enhanced $6,000 deduction per person age 65+, reduced by 6% of MAGI over $75,000 / $150,000."],
  ["estimate_tax_savings", "Federal income tax saved, using the IRS bracket tables for the year."],
  ["explain_eligibility", "Who qualifies, the excluded filing status, the SSN rule, W-2 and 1099 reporting boxes, years covered."],
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function landingPage(origin: string): string {
  const mcp = `${origin}/mcp`;
  const rows = TOOLS.map(([n, d]) => `<tr><td><code>${n}</code></td><td>${esc(d)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>No Tax on Overtime MCP</title>
<meta name="description" content="MCP server for the 2025-2028 no tax on overtime, tips and senior deductions (One Big Beautiful Bill Act), with IRS caps and phase-outs.">
<style>:root{--bg:#fff;--fg:#1a1a1a;--muted:#555;--line:#ddd;--code:#f4f4f4}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--line:#333;--code:#222}}
body{background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px 16px}
code,pre{background:var(--code);border-radius:4px;font-size:14px}pre{padding:10px;overflow-x:auto}code{padding:1px 4px}
table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--line);padding:8px 6px;vertical-align:top}p.small{color:var(--muted);font-size:14px}a{color:inherit}</style></head>
<body><h1>No Tax on Overtime MCP server</h1>
<p>Gives an AI assistant the 2025-2028 federal deductions for overtime, tips and seniors from the One Big Beautiful Bill Act (P.L. 119-21), with the caps, phase-outs and filing rules copied from irs.gov.</p>
<h2>Connect</h2>
<p>Hosted endpoint (Streamable HTTP, no sign-in, no token). Paste it into Claude.ai custom connectors or ChatGPT developer mode.</p>
<pre>${esc(mcp)}</pre>
<p>Claude Code</p><pre>claude mcp add --transport http no-tax-on-overtime ${esc(mcp)}</pre>
<p>Local (stdio)</p><pre>npx -y github:theluckystrike/no-tax-on-overtime-mcp</pre>
<h2>Tools</h2><table>${rows}</table>
<p>Calculators and guides for people: <a href="https://noovertimetax.com/?utm_source=mcp&amp;utm_medium=no-tax-on-overtime-mcp">noovertimetax.com</a>.
Source: <a href="https://github.com/theluckystrike/no-tax-on-overtime-mcp">github.com/theluckystrike/no-tax-on-overtime-mcp</a>.</p>
<p class="small">Results are estimates, not tax advice. Part of the Zovo MCP collection: <a href="https://mcp.zovo.one">mcp.zovo.one</a>.</p>
</body></html>`;
}

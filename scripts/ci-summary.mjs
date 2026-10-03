import fs from "node:fs";
import path from "node:path";

const summaryPath = path.resolve(process.cwd(), "coverage/coverage-summary.json");

if (!fs.existsSync(summaryPath)) {
  console.log("No coverage summary found at " + summaryPath);
  process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
const total = summary.total;

const getBadge = (pct) => {
  if (pct >= 85) return "🟢";
  if (pct >= 60) return "🟡";
  return "🔴";
};

let md = `## 📊 Test Coverage Summary\n\n`;
md += `| Category | Covered / Total | Percentage | Status |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;
md += `| **Statements** | ${total.statements.covered} / ${total.statements.total} | ${total.statements.pct}% | ${getBadge(total.statements.pct)} |\n`;
md += `| **Branches** | ${total.branches.covered} / ${total.branches.total} | ${total.branches.pct}% | ${getBadge(total.branches.pct)} |\n`;
md += `| **Functions** | ${total.functions.covered} / ${total.functions.total} | ${total.functions.pct}% | ${getBadge(total.functions.pct)} |\n`;
md += `| **Lines** | ${total.lines.covered} / ${total.lines.total} | ${total.lines.pct}% | ${getBadge(total.lines.pct)} |\n\n`;

const files = Object.keys(summary).filter((k) => k !== "total");
if (files.length > 0) {
  md += `<details><summary>📁 <b>Coverage Details by File</b></summary>\n\n`;
  md += `| File | Statements | Branches | Functions | Lines |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const file of files) {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const item = summary[file];
    md += `| \`${rel}\` | ${item.statements.pct}% | ${item.branches.pct}% | ${item.functions.pct}% | ${item.lines.pct}% |\n`;
  }
  md += `\n</details>\n`;
}

console.log(md);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, "utf-8");
}

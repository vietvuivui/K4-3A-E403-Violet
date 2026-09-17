// Runs eval/golden_set.csv against a running server (POST /api/ask) and prints a pass/fail table.
// Usage: node eval/run_golden.js [baseUrl]   (default http://127.0.0.1:5173)
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.argv[2] || "http://127.0.0.1:5173";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  const [header, ...data] = rows;
  return data.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])));
}

async function main() {
  const cases = parseCsv(fs.readFileSync(path.join(__dirname, "golden_set.csv"), "utf8").replace(/^﻿/, ""));
  let pass = 0;
  const lines = ["| ID | Class | Expected | Actual | Pass |", "|---|---|---|---|---|"];
  for (const c of cases) {
    let actual;
    try {
      const res = await fetch(`${BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: c.question })
      });
      actual = (await res.json()).status || `http_${res.status}`;
    } catch (error) {
      actual = `error: ${error.message}`;
    }
    const ok = actual === c.expected_status;
    if (ok) pass++;
    lines.push(`| ${c.id} | ${c.class} | ${c.expected_status} | ${actual} | ${ok ? "✅" : "❌"} |`);
    console.log(`#${c.id} ${ok ? "PASS" : "FAIL"} expected=${c.expected_status} actual=${actual}`);
  }
  console.log(`\n${lines.join("\n")}\n\nPass rate: ${pass}/${cases.length} (${(100 * pass / cases.length).toFixed(1)}%)`);
}

main();

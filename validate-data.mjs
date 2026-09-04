// Sanity-checks data.js before it gets committed by the weekly refresh Action.
// Exits non-zero (failing the Action) if anything looks broken, so a bad
// refresh never reaches the live site.

import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../data.js", import.meta.url), "utf8");

const sandbox = {};
new Function("window", source)(sandbox);
const window = sandbox;

const problems = [];

const vendorIds = new Set(window.VENDORS.map((v) => v.id));
const typeSet = new Set(window.TYPES);
const impactIds = new Set(window.IMPACTS.map((i) => i.id));

if (!window.NEWS || window.NEWS.length === 0) problems.push("NEWS is empty");

window.NEWS.forEach((n, i) => {
  if (!vendorIds.has(n.vendor)) problems.push(`item ${i}: unknown vendor "${n.vendor}"`);
  if (!typeSet.has(n.type)) problems.push(`item ${i}: unknown type "${n.type}"`);
  if (!impactIds.has(n.impact)) problems.push(`item ${i}: unknown impact "${n.impact}"`);
  if (!/^https:\/\//.test(n.url || "")) problems.push(`item ${i}: missing/invalid url`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date || "")) problems.push(`item ${i}: bad date "${n.date}"`);
});

const perVendor = {};
window.NEWS.forEach((n) => { perVendor[n.vendor] = (perVendor[n.vendor] || 0) + 1; });
window.VENDORS.forEach((v) => {
  if (!perVendor[v.id]) problems.push(`vendor "${v.id}" has zero news items`);
});

if (problems.length) {
  console.error("data.js failed validation:\n" + problems.map((p) => " - " + p).join("\n"));
  process.exit(1);
}

console.log(`data.js OK — ${window.NEWS.length} items across ${window.VENDORS.length} vendors.`);

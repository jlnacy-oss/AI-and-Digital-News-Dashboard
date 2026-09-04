// Regenerates the window.NEWS block in data.js using the Claude API's
// web search tool. Preserves VENDORS/GROUPS/TYPES/IMPACTS untouched —
// only NEWS and LAST_REFRESHED are replaced.
//
// Requires: ANTHROPIC_API_KEY env var.
// Run: node scripts/refresh-data.mjs

import { readFileSync, writeFileSync } from "node:fs";

const DATA_PATH = new URL("../data.js", import.meta.url);
const MODEL = "claude-sonnet-5"; // swap for claude-opus-5 if you want deeper research

function extractArray(source, varName) {
  // Pulls "window.VAR = [ ... ];" out of data.js as a JS value via eval
  // in an isolated scope (safe here — this is your own trusted file).
  const marker = `window.${varName} = `;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find window.${varName} in data.js`);
  const rest = source.slice(start + marker.length);
  const end = rest.indexOf("\n];") + 2; // arrays in this file always close on their own "];" line
  const literal = rest.slice(0, end + 1);
  // eslint-disable-next-line no-eval
  return eval(literal);
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const source = readFileSync(DATA_PATH, "utf8");
  const vendors = extractArray(source, "VENDORS");
  const types = extractArray(source, "TYPES");
  const impacts = extractArray(source, "IMPACTS");

  const vendorList = vendors.map((v) => `${v.id} (${v.name})`).join(", ");
  const typeList = types.join(", ");
  const impactList = impacts.map((i) => i.id).join(", ");
  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `You are populating a JSON news feed for an enterprise AI dashboard.
Search the web for real, dated AI/enterprise-software announcements from the last 7-10 days
for each of these vendors: ${vendorList}.

For each item you find and can verify with a real source URL, output an object with:
- vendor: one of [${vendorList.split(", ").map((v) => v.split(" (")[0]).join(", ")}]
- type: one of [${typeList}]
- impact: one of [${impactList}]
- date: YYYY-MM-DD
- dateLabel: short human label, e.g. "Sep 10"
- title: short headline, your own words
- url: the real source URL you found it at — never invent one
- blurb: one sentence, paraphrased in your own words, no direct quotes
- featured: true for at most 3 of the most significant items, omit otherwise

Only include an item if you found a real URL for it. Aim for 2-4 items per vendor, but
skip any vendor you can't find real recent news for rather than inventing something.

Respond with ONLY a JSON array of these objects — no prose, no markdown fences.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Today is ${today}. Research and return the JSON array now.` },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 40 }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const textBlocks = data.content.filter((b) => b.type === "text").map((b) => b.text);
  const raw = textBlocks.join("\n").trim();
  const jsonText = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");

  let items;
  try {
    items = JSON.parse(jsonText);
  } catch (e) {
    console.error("Model output was not valid JSON:\n", raw);
    throw e;
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Refresh produced no items — leaving data.js untouched");
  }

  // Rebuild the NEWS block as formatted JS
  const newsLiteral = "window.NEWS = " + JSON.stringify(items, null, 2)
    .replace(/"([a-zA-Z_]+)":/g, "$1:") + ";\n";

  let updated = source.replace(
    /window\.NEWS = \[[\s\S]*?\n\];\n/,
    newsLiteral.replace(/;\n$/, ";\n")
  );
  updated = updated.replace(
    /window\.LAST_REFRESHED = "[^"]*";/,
    `window.LAST_REFRESHED = "${today}";`
  );

  writeFileSync(DATA_PATH, updated, "utf8");
  console.log(`Wrote ${items.length} news items to data.js, dated ${today}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

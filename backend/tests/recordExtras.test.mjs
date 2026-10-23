import test from "node:test";
import assert from "node:assert/strict";
// Offline only: provider keys are unset by the test command; these helpers never call a provider.
import { filterRecords, recordsToCsv, buildInsights, INSIGHT_KINDS } from "../recordExtras.mjs";
const rows = [
  { id: 1, reference: "A-1", title: "Alpha case", status: "Open", owner: "Sam", risk: "High", due_date: "2020-01-01", amount: 0, payload: { note: "evv mismatch" } },
  { id: 2, reference: "B-2", title: "Beta case", status: "Closed", owner: "Jo", risk: "Low", due_date: "2999-01-01", amount: 250, payload: {} },
];
test("search/filter matches text, status, and risk while preserving 0 amounts", () => {
  assert.equal(filterRecords(rows, { q: "evv" }).length, 1);
  assert.equal(filterRecords(rows, { status: "Closed" })[0].reference, "B-2");
  assert.equal(filterRecords(rows, { risk: "High" })[0].amount, 0);
  assert.equal(filterRecords(rows, { q: "missing" }).length, 0);
});
test("CSV export escapes values and keeps header plus zero row", () => {
  const csv = recordsToCsv([{ ...rows[0], title: 'A, "quoted"' }]);
  assert.ok(csv.startsWith("id,reference,title"));
  assert.ok(csv.includes('"A, ""quoted"""'));
  assert.ok(csv.includes(",0"));
});
test("deterministic insights are labelled aiGenerated:false for all kinds", () => {
  for (const kind of INSIGHT_KINDS) {
    const out = buildInsights(rows, kind, "Test register");
    assert.equal(out.aiGenerated, false);
    assert.equal(out.source, "deterministic-fallback");
    assert.ok(out.sections.length >= 2 && out.sections.every((s) => s.title && s.detail !== undefined));
    assert.equal(out.recordCount, 2);
  }
  assert.equal(buildInsights([], "summary", "Empty").recordCount, 0);
});

// Search/filter, CSV/JSON export, and deterministic record insights.
// No provider calls: insights always use the labelled deterministic fallback.
export function filterRecords(rows, { q = "", status = "", risk = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return (rows || []).filter((row) => {
    if (status && String(row.status ?? row.state ?? "") !== status) return false;
    if (risk && String(row.risk ?? "") !== risk) return false;
    if (!needle) return true;
    const hay = [row.reference, row.title, row.subject, row.owner, row.status, row.state, row.risk, JSON.stringify(row.payload ?? {})].join(" ").toLowerCase();
    return hay.includes(needle);
  });
}
const COLS = ["id", "reference", "title", "status", "owner", "risk", "due_date", "amount"];
function csvCell(v) { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
export function recordsToCsv(rows) {
  return [COLS.join(","), ...(rows || []).map((r) => COLS.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
}
export const INSIGHT_KINDS = ["triage", "summary", "next-actions"];
export function buildInsights(rows, kind, label = "Records") {
  const list = rows || [];
  const total = list.length;
  const totalValue = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const highRisk = list.filter((r) => ["High", "Critical"].includes(r.risk)).length;
  const open = list.filter((r) => !["Approved", "Closed"].includes(r.status ?? r.state)).length;
  const overdue = list.filter((r) => r.due_date && new Date(r.due_date) < new Date() && !["Approved", "Closed"].includes(r.status ?? r.state)).length;
  const byStatus = {};
  for (const r of list) byStatus[r.status ?? r.state ?? "Unknown"] = (byStatus[r.status ?? r.state ?? "Unknown"] || 0) + 1;
  const base = { aiGenerated: false, source: "deterministic-fallback", label: "Deterministic fallback — no AI provider call was made", kind, recordCount: total, totalValue, highRisk, openCount: open, overdueCount: overdue };
  if (kind === "triage") {
    const ranked = [...list].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, 5)
      .map((r) => `${r.reference}: ${r.title ?? r.subject ?? "Untitled"} — ${r.risk || "Moderate"} risk, status ${r.status ?? r.state ?? "Unknown"}, value ${Number(r.amount) || 0}`);
    return { ...base, headline: `${label} — priority triage`, sections: [
      { title: "Priority queue (highest value first)", detail: ranked.length ? ranked.join("\n") : "No records to triage." },
      { title: "Attention counts", detail: `High/Critical risk: ${highRisk}. Open: ${open}. Overdue open: ${overdue}.` },
      { title: "Review note", detail: "Operational triage only. Validate source evidence before any action; this is not a clinical or diagnostic assessment." } ] };
  }
  if (kind === "summary") {
    const statusLines = Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join("\n") || "No records.";
    return { ...base, headline: `${label} — portfolio summary`, sections: [
      { title: "Records by status", detail: statusLines },
      { title: "Value and risk", detail: `Records: ${total}. Total value: ${totalValue}. High/Critical risk: ${highRisk}.` },
      { title: "Review note", detail: "Counts include zero values exactly as stored. Operational summary only; validate source evidence before acting." } ] };
  }
  const actions = list.slice(0, 5).map((r) => `${r.reference}: confirm evidence and owner (${r.owner || "Unassigned"}), then advance status ${r.status ?? r.state ?? "Unknown"} or record why it stays open.`);
  return { ...base, headline: `${label} — recommended next actions`, sections: [
    { title: "Next actions by record", detail: actions.length ? actions.join("\n") : "No records require action." },
    { title: "Attention counts", detail: `Open records needing follow-up: ${open}. Overdue open: ${overdue}.` },
    { title: "Review note", detail: "Suggested operational follow-ups only. A qualified reviewer must approve each action." } ] };
}
export function mountRecordExtras(app, { pool, auth, featureById }) {
  app.get("/api/features/:id/records/export", auth, async (req, res) => {
    const feature = featureById(req.params.id);
    const rows = (await pool.query("SELECT * FROM feature_records WHERE feature_id=$1 ORDER BY updated_at DESC,id DESC", [feature.id])).rows;
    const filtered = filterRecords(rows, req.query);
    if (String(req.query.format || "json").toLowerCase() === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${feature.id}-records.csv"`);
      return res.send(recordsToCsv(filtered));
    }
    return res.json({ items: filtered, count: filtered.length });
  });
  app.post("/api/features/:id/ai/:kind", auth, async (req, res) => {
    const feature = featureById(req.params.id);
    if (!INSIGHT_KINDS.includes(req.params.kind)) return res.status(404).json({ error: "Unknown insight kind" });
    const rows = (await pool.query("SELECT * FROM feature_records WHERE feature_id=$1 ORDER BY updated_at DESC,id DESC", [feature.id])).rows;
    return res.json({ result: buildInsights(rows, req.params.kind, feature.title) });
  });
}

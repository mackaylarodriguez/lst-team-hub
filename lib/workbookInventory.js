/**
 * Parse housing budget "workbooks" strings into { qty, name } lines.
 * Examples: "8-Reflection; 4 Good News; 6f Esther; send 9 Acts 1"
 */

export function normalizeWorkbookNameKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseOneWorkbookToken(segment) {
  const t = String(segment || "").trim();
  if (!t) return null;

  let m = /^(\d+)\s*[-–]\s*(.+)$/i.exec(t);
  if (m) {
    const q = Number(m[1]);
    if (Number.isFinite(q) && q > 0) return { qty: q, name: m[2].trim() };
  }

  m = /^(\d+)\s+(.+)$/i.exec(t);
  if (m) {
    const q = Number(m[1]);
    if (Number.isFinite(q) && q > 0) return { qty: q, name: m[2].trim() };
  }

  m = /^(\d+)f\s+(.+)$/i.exec(t);
  if (m) {
    const q = Number(m[1]);
    if (Number.isFinite(q) && q > 0) return { qty: q, name: m[2].trim() };
  }

  m = /^(\d+)f[-–]\s*(.+)$/i.exec(t);
  if (m) {
    const q = Number(m[1]);
    if (Number.isFinite(q) && q > 0) return { qty: q, name: m[2].trim() };
  }

  return { qty: 1, name: t };
}

export function parseWorkbookInventoryString(raw) {
  if (raw === null || raw === undefined) return [];
  const s = String(raw).trim();
  if (!s) return [];

  const parts = s.split(/[;\n]+/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const part of parts) {
    const parsed = parseOneWorkbookToken(part);
    if (parsed && parsed.name) out.push(parsed);
  }
  return out;
}

function stripLeadingDatePrefix(segment) {
  return String(segment || "")
    .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+/i, "")
    .trim();
}

/**
 * Site budget notes often use "Title - qty; Title - qty" (qty last). Also accepts team-style "8-Reflection; …".
 */
export function parseSiteWorkbookNotesString(raw) {
  if (raw === null || raw === undefined) return [];
  let s = String(raw).trim();
  if (!s) return [];
  s = stripLeadingDatePrefix(s);

  const parts = s.split(/[;\n]+/).map((p) => stripLeadingDatePrefix(p.trim())).filter(Boolean);
  const out = [];
  for (const part of parts) {
    const titleQty = /^(.+?)\s*-\s*(\d+)\s*$/.exec(part);
    if (titleQty) {
      const name = titleQty[1].trim();
      const q = Number(titleQty[2]);
      if (name && Number.isFinite(q) && q >= 0) {
        out.push({ qty: q, name });
        continue;
      }
    }
    const parsed = parseOneWorkbookToken(part);
    if (parsed && parsed.name) out.push(parsed);
  }
  return out;
}

/** Prefer site-style parsing when it yields lines; otherwise team inventory format. */
export function parseAnyWorkbookInventoryString(raw) {
  const siteTry = parseSiteWorkbookNotesString(raw);
  if (siteTry.length > 0) return siteTry;
  return parseWorkbookInventoryString(raw);
}

/**
 * Build updated site workbook_notes: column drafts (by normalized key) plus any existing lines
 * whose titles are not represented in columns (preserves odd spellings / one-off titles).
 */
export function mergeSiteWorkbookNotesWithDraft(existingRaw, columns, draftRecord) {
  const columnKeys = new Set((columns || []).map((c) => c.key));
  const extraParts = [];
  for (const { name, qty } of parseAnyWorkbookInventoryString(String(existingRaw || ""))) {
    const k = normalizeWorkbookNameKey(name);
    if (!k || columnKeys.has(k)) continue;
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) continue;
    extraParts.push(`${String(name).trim()} - ${n}`);
  }
  const editedParts = [];
  for (const col of columns || []) {
    const raw = String(draftRecord[col.key] ?? "").trim();
    if (raw === "") continue;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) continue;
    editedParts.push(`${col.label} - ${n}`);
  }
  return [...editedParts, ...extraParts].join("; ");
}

/**
 * Shipping summary: lines with qty > 0, distinct title count, sum of quantities.
 */
export function summarizeWorkbookItemsForShipping(items) {
  const list = items || [];
  const positive = list.filter((x) => Number(x.qty) > 0);
  const distinctTitles = positive.length;
  const totalCopies = positive.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
  return { distinctTitles, totalCopies, positiveLines: positive, allLines: list };
}

/**
 * Aggregate workbook lines for teams at one site: sum qty per workbook title, track last update.
 * @param {Array<{ workbooks: string, updatedAt?: string }>} teams
 * @returns {Map<string, { displayName: string, totalQty: number, lastUpdatedMs: number }>}
 */
export function aggregateWorkbooksForSiteTeams(teams) {
  const map = new Map();

  for (const team of teams || []) {
    const items = parseWorkbookInventoryString(team.workbooks || "");
    const teamMs = team.updatedAt ? Date.parse(team.updatedAt) : 0;

    for (const { qty, name } of items) {
      const nk = normalizeWorkbookNameKey(name);
      if (!nk) continue;

      const prev = map.get(nk);
      const displayName = prev?.displayName || name.trim();
      const totalQty = (prev?.totalQty || 0) + (Number.isFinite(qty) && qty > 0 ? qty : 0);
      const lastUpdatedMs = Math.max(prev?.lastUpdatedMs || 0, teamMs);

      map.set(nk, { displayName, totalQty, lastUpdatedMs });
    }
  }

  return map;
}

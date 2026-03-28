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

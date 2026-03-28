import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  findSiteBudgetNoteForOption,
} from "@/lib/siteMaterials";
import {
  listSiteBudgetNotes,
  updateSiteBudgetNote,
  upsertSiteBudgetNote,
} from "@/lib/tripBudget";
import { SITE_OPTIONS } from "@/lib/siteOptions";
import { WORKBOOK_REFERENCE_TITLES } from "@/lib/workbookCatalog";
import {
  mergeSiteWorkbookNotesWithDraft,
  normalizeWorkbookNameKey,
  parseAnyWorkbookInventoryString,
  summarizeWorkbookItemsForShipping,
} from "@/lib/workbookInventory";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import { showToast } from "@/components/Toast";

export default function SitesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [siteNotes, setSiteNotes] = useState([]);
  const [editingLogisticsSite, setEditingLogisticsSite] = useState("");
  const [logisticsUrlDraft, setLogisticsUrlDraft] = useState("");
  const [savingLogisticsFor, setSavingLogisticsFor] = useState("");
  const [editingWorkbookSite, setEditingWorkbookSite] = useState("");
  const [workbookQtyDraft, setWorkbookQtyDraft] = useState({});
  const [savingWorkbookFor, setSavingWorkbookFor] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextSession = await requireSession(router);
      if (cancelled || !nextSession) return;
      setSession(nextSession);
      if (!isManagerRole(nextSession.permissionRole || nextSession.role)) {
        router.replace("/trips");
        return;
      }

      try {
        setLoading(true);
        const rows = await listSiteBudgetNotes();
        if (cancelled) return;
        setSiteNotes(rows || []);
        setStatus("");
      } catch (e) {
        if (!cancelled) {
          setStatus(e.message || "Unable to load sites.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const workbookCountsMatrix = useMemo(() => {
    const seen = new Set();
    const refCols = [];
    for (const t of WORKBOOK_REFERENCE_TITLES) {
      const key = normalizeWorkbookNameKey(t);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      refCols.push({ key, label: t });
    }

    const extraMap = new Map();
    for (const siteLabel of SITE_OPTIONS) {
      const note = findSiteBudgetNoteForOption(siteLabel, siteNotes);
      const raw = note?.workbookNotes ?? "";
      for (const { name, qty } of parseAnyWorkbookInventoryString(raw)) {
        if (!(Number(qty) > 0)) continue;
        const k = normalizeWorkbookNameKey(name);
        if (!k || seen.has(k)) continue;
        if (!extraMap.has(k)) extraMap.set(k, String(name).trim());
      }
    }
    const extraCols = [...extraMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }))
      .map(([key, label]) => ({ key, label }));
    const columns = [...refCols, ...extraCols];

    const rows = SITE_OPTIONS.map((siteLabel) => {
      const note = findSiteBudgetNoteForOption(siteLabel, siteNotes);
      const raw = note?.workbookNotes ?? "";
      const items = parseAnyWorkbookInventoryString(raw);
      const qtyByKey = new Map();
      for (const { name, qty } of items) {
        const k = normalizeWorkbookNameKey(name);
        if (!k) continue;
        const n = Number(qty);
        if (!Number.isFinite(n) || n < 0) continue;
        qtyByKey.set(k, (qtyByKey.get(k) || 0) + n);
      }
      const summary = summarizeWorkbookItemsForShipping(items);
      const customUrl = String(note?.logisticsUrl || "").trim();
      const effectiveLogisticsUrl = customUrl || resolveSiteLogisticsUrl(siteLabel);
      return {
        siteLabel,
        note,
        qtyByKey,
        totalCopies: summary.totalCopies,
        effectiveLogisticsUrl,
        customLogisticsUrl: customUrl,
      };
    });

    return { columns, rows };
  }, [siteNotes]);

  async function saveSiteLogisticsUrl(siteOption) {
    const url = logisticsUrlDraft.trim();
    const matched = findSiteBudgetNoteForOption(siteOption, siteNotes);
    try {
      setSavingLogisticsFor(siteOption);
      setStatus("");
      let saved;
      if (matched) {
        saved = await updateSiteBudgetNote(matched.id, {
          siteName: siteOption,
          workbookNotes: matched.workbookNotes ?? "",
          notes: matched.notes ?? "",
          effectiveDate: matched.effectiveDate || null,
          logisticsUrl: url || null,
        });
      } else {
        saved = await upsertSiteBudgetNote({
          siteName: siteOption,
          workbookNotes: "",
          notes: "",
          logisticsUrl: url || null,
        });
      }
      setSiteNotes((prev) => {
        const others = prev.filter((r) => r.id !== saved.id);
        return [...others, saved].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
      });
      setEditingLogisticsSite("");
      setLogisticsUrlDraft("");
      showToast(`Saved logistics link for ${siteOption}`, "success");
    } catch (e) {
      const msg = e.message || "Save failed.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSavingLogisticsFor("");
    }
  }

  function openWorkbookEdit(siteLabel, row, columns) {
    setEditingWorkbookSite(siteLabel);
    const next = {};
    for (const col of columns) {
      const q = row.qtyByKey.get(col.key);
      next[col.key] = q !== undefined && q !== null ? String(q) : "";
    }
    setWorkbookQtyDraft(next);
  }

  async function saveSiteWorkbookCounts(siteOption, columns) {
    const matched = findSiteBudgetNoteForOption(siteOption, siteNotes);
    const existingRaw = matched?.workbookNotes ?? "";
    const workbookNotesStr = mergeSiteWorkbookNotesWithDraft(
      existingRaw,
      columns,
      workbookQtyDraft
    );
    try {
      setSavingWorkbookFor(siteOption);
      setStatus("");
      let saved;
      if (matched) {
        saved = await updateSiteBudgetNote(matched.id, {
          siteName: siteOption,
          workbookNotes: workbookNotesStr,
          notes: matched.notes ?? "",
          effectiveDate: matched.effectiveDate || null,
        });
      } else {
        saved = await upsertSiteBudgetNote({
          siteName: siteOption,
          workbookNotes: workbookNotesStr,
          notes: "",
          logisticsUrl: null,
        });
      }
      setSiteNotes((prev) => {
        const others = prev.filter((r) => r.id !== saved.id);
        return [...others, saved].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
      });
      setEditingWorkbookSite("");
      setWorkbookQtyDraft({});
      showToast(`Saved workbook counts for ${siteOption}`, "success");
    } catch (e) {
      const msg = e.message || "Save failed.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSavingWorkbookFor("");
    }
  }

  if (!session || loading) {
    return (
      <Shell>
        <div
          className="card pad"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
        >
          <Spinner size={40} />
          <div style={{ fontWeight: 900 }}>
            {loading ? "Loading sites…" : "Redirecting…"}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="h1" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="active" className="pageEyebrowIcon" />
        <span>Sites</span>
      </h1>
      <p className="small" style={{ marginBottom: 20, maxWidth: 760 }}>
        Workbook counts and housing notes are stored in <code>site_budget_notes</code>. Use{" "}
        <strong>Edit counts</strong> on a row to change quantities; housing text is still easiest from
        your admin tools or trip flows. Override site logistics links from the last column.
      </p>

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      <div className="card pad" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Workbook counts by site</div>
        <div className="small" style={{ marginBottom: 12, color: "var(--muted)", maxWidth: 900 }}>
          One row per mission site. Columns follow <code>lib/workbookCatalog.js</code> plus extra titles
          found in saved plans. Leave a cell blank when editing to drop that title from this site&apos;s
          plan (quantities ≥ 0 allowed, including 0). Clear a custom logistics URL to use the built-in map.
        </div>
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(15,23,42,.08)" }}>
          <table
            className="table"
            style={{
              minWidth: Math.max(720, 160 + workbookCountsMatrix.columns.length * 56 + 340),
              fontSize: 12,
              margin: 0,
            }}
          >
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, background: "#fff", zIndex: 1, whiteSpace: "nowrap" }}>
                  Site
                </th>
                {workbookCountsMatrix.columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      whiteSpace: "nowrap",
                      textAlign: "right",
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={col.label}
                  >
                    {col.label}
                  </th>
                ))}
                <th style={{ whiteSpace: "nowrap", textAlign: "right" }}>Total books</th>
                <th style={{ whiteSpace: "nowrap", minWidth: 120 }}>Workbooks</th>
                <th style={{ whiteSpace: "nowrap", minWidth: 200 }}>Site logistics</th>
              </tr>
            </thead>
            <tbody>
              {workbookCountsMatrix.rows.map((row) => {
                const isEditingWorkbooks = editingWorkbookSite === row.siteLabel;
                const cols = workbookCountsMatrix.columns;
                return (
                <tr key={row.siteLabel}>
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      background: "#fff",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      boxShadow: "4px 0 8px -6px rgba(15,23,42,.15)",
                    }}
                  >
                    {row.siteLabel}
                  </td>
                  {cols.map((col) => {
                    const q = row.qtyByKey.get(col.key);
                    const hasVal = q !== undefined && q !== null;
                    if (isEditingWorkbooks) {
                      return (
                        <td key={col.key} style={{ textAlign: "right", verticalAlign: "middle" }}>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step={1}
                            value={workbookQtyDraft[col.key] ?? ""}
                            onChange={(e) =>
                              setWorkbookQtyDraft((prev) => ({
                                ...prev,
                                [col.key]: e.target.value,
                              }))
                            }
                            placeholder="—"
                            disabled={savingWorkbookFor === row.siteLabel}
                            style={{
                              width: 56,
                              textAlign: "right",
                              padding: "4px 6px",
                              fontSize: 12,
                            }}
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} style={{ textAlign: "right", color: "var(--muted)" }}>
                        {hasVal ? (
                          Number(q) > 0 ? (
                            <strong style={{ color: "inherit" }}>{q}</strong>
                          ) : (
                            <span>{q}</span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right", fontWeight: 800 }}>
                    {row.totalCopies > 0 ? row.totalCopies : "—"}
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {isEditingWorkbooks ? (
                        <>
                          <button
                            type="button"
                            className="btn btnPrimary"
                            style={{ fontSize: 12, padding: "6px 12px" }}
                            disabled={savingWorkbookFor === row.siteLabel}
                            onClick={() => void saveSiteWorkbookCounts(row.siteLabel, cols)}
                          >
                            {savingWorkbookFor === row.siteLabel ? "Saving…" : "Save counts"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ fontSize: 12, padding: "6px 12px" }}
                            disabled={savingWorkbookFor === row.siteLabel}
                            onClick={() => {
                              setEditingWorkbookSite("");
                              setWorkbookQtyDraft({});
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: 12, padding: "6px 12px" }}
                          disabled={
                            !!savingWorkbookFor ||
                            (!!editingWorkbookSite && editingWorkbookSite !== row.siteLabel)
                          }
                          onClick={() => openWorkbookEdit(row.siteLabel, row, cols)}
                        >
                          Edit counts
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {row.effectiveLogisticsUrl ? (
                        <a
                          className="btn btnPrimary"
                          href={row.effectiveLogisticsUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          Open logistics
                        </a>
                      ) : (
                        <span className="small" style={{ color: "var(--muted)" }}>
                          No link
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: "6px 12px" }}
                        onClick={() => {
                          setEditingLogisticsSite(row.siteLabel);
                          setLogisticsUrlDraft(row.customLogisticsUrl || "");
                        }}
                      >
                        Edit link
                      </button>
                    </div>
                    {row.customLogisticsUrl ? (
                      <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                        Custom URL (overrides map)
                      </div>
                    ) : row.effectiveLogisticsUrl ? (
                      <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                        From built-in map
                      </div>
                    ) : null}
                    {editingLogisticsSite === row.siteLabel ? (
                      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                        <input
                          className="input"
                          type="url"
                          placeholder="https://…"
                          value={logisticsUrlDraft}
                          onChange={(e) => setLogisticsUrlDraft(e.target.value)}
                          style={{ minWidth: 220 }}
                        />
                        <div className="small" style={{ color: "var(--muted)" }}>
                          Leave empty to use the default SharePoint map for this site name.
                        </div>
                        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn btnPrimary"
                            disabled={savingLogisticsFor === row.siteLabel}
                            onClick={() => void saveSiteLogisticsUrl(row.siteLabel)}
                          >
                            {savingLogisticsFor === row.siteLabel ? "Saving…" : "Save link"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            disabled={savingLogisticsFor === row.siteLabel}
                            onClick={() => {
                              setEditingLogisticsSite("");
                              setLogisticsUrlDraft("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

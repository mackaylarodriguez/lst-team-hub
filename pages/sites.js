import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/router";
import { Fragment, useEffect, useMemo, useState } from "react";
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
import {
  WORKBOOK_REFERENCE_COLUMNS,
  WORKBOOK_SERIES_HEADER_STYLE,
  workbookNameToCanonicalKey,
} from "@/lib/workbookCatalog";
import {
  mergeSiteWorkbookNotesWithDraft,
  parseAnyWorkbookInventoryString,
  summarizeWorkbookItemsForShipping,
} from "@/lib/workbookInventory";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import { showToast } from "@/components/Toast";

/** Fixed column widths (px) for Sites workbook grid — keeps headers aligned while scrolling. */
const WB_TABLE = {
  site: 172,
  workbookQty: 86,
  totalBooks: 92,
  workbooksUpdated: 118,
  workbooksActions: 220,
};

function formatWorkbookInventoryUpdatedAt(iso) {
  const s = String(iso || "").trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function workbookQtyHeaderStyle(col) {
  if (col.series && WORKBOOK_SERIES_HEADER_STYLE[col.series]) {
    return WORKBOOK_SERIES_HEADER_STYLE[col.series];
  }
  return {
    background: "rgba(248, 250, 252, 0.98)",
    color: "var(--muted)",
    borderBottom: "1px solid var(--border)",
  };
}

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
    const refCols = WORKBOOK_REFERENCE_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      series: c.series,
    }));
    const seen = new Set(refCols.map((c) => c.key));

    const extraMap = new Map();
    for (const siteLabel of SITE_OPTIONS) {
      const note = findSiteBudgetNoteForOption(siteLabel, siteNotes);
      const raw = note?.workbookNotes ?? "";
      for (const { name, qty } of parseAnyWorkbookInventoryString(raw)) {
        if (!(Number(qty) > 0)) continue;
        const k = workbookNameToCanonicalKey(name);
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
        const k = workbookNameToCanonicalKey(name);
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
        workbookNotesUpdatedAt: note?.workbookNotesUpdatedAt || "",
        qtyByKey,
        totalCopies: summary.totalCopies,
        effectiveLogisticsUrl,
        customLogisticsUrl: customUrl,
      };
    });

    return { columns, rows };
  }, [siteNotes]);

  const workbookTableWidthPx = useMemo(() => {
    const { site, workbookQty, totalBooks, workbooksUpdated, workbooksActions } = WB_TABLE;
    const n = workbookCountsMatrix.columns.length;
    return site + n * workbookQty + totalBooks + workbooksUpdated + workbooksActions;
  }, [workbookCountsMatrix.columns.length]);

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
          setWorkbookNotesUpdatedAt: true,
        });
      } else {
        saved = await upsertSiteBudgetNote({
          siteName: siteOption,
          workbookNotes: workbookNotesStr,
          notes: "",
          logisticsUrl: null,
          setWorkbookNotesUpdatedAt: true,
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
        Workbook counts, housing notes, and logistics URLs live in <code>site_budget_notes</code>. Edit
        quantities in the workbook grid; set SharePoint map links in <strong>Site logistics maps</strong> below.
      </p>

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      <div className="card pad" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Workbook counts by site</div>
        <div className="small" style={{ marginBottom: 12, color: "var(--muted)", maxWidth: 900 }}>
          One row per mission site. Book columns follow series order in <code>lib/workbookCatalog.js</code>{" "}
          (Core → Discover → Advanced), with distinct header colors. Extra titles from saved plans appear
          after those. Leave a cell blank when editing to drop that title (quantities ≥ 0 allowed, including
          0).
        </div>
        <div className="sitesWorkbookScroller">
          <table
            className="table sitesWorkbookTable"
            style={{
              width: workbookTableWidthPx,
              minWidth: workbookTableWidthPx,
              fontSize: 12,
            }}
          >
            <colgroup>
              <col style={{ width: WB_TABLE.site }} />
              {workbookCountsMatrix.columns.map((col) => (
                <col key={col.key} style={{ width: WB_TABLE.workbookQty }} />
              ))}
              <col style={{ width: WB_TABLE.totalBooks }} />
              <col style={{ width: WB_TABLE.workbooksUpdated }} />
              <col style={{ width: WB_TABLE.workbooksActions }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  className="sitesWorkbookCorner"
                  style={{ whiteSpace: "nowrap", maxWidth: WB_TABLE.site, boxSizing: "border-box" }}
                >
                  Site
                </th>
                {workbookCountsMatrix.columns.map((col) => (
                  <th
                    key={col.key}
                    className="sitesWorkbookQtyHead"
                    style={{
                      textAlign: "center",
                      ...workbookQtyHeaderStyle(col),
                    }}
                    title={col.label}
                  >
                    {col.label}
                  </th>
                ))}
                <th style={{ whiteSpace: "nowrap", textAlign: "right" }}>Total books</th>
                <th
                  style={{ whiteSpace: "nowrap", fontSize: 11, fontWeight: 800, color: "var(--muted)" }}
                  title="When workbook counts were last saved on this page"
                >
                  Inventory updated
                </th>
                <th style={{ whiteSpace: "nowrap" }}>Workbooks</th>
              </tr>
            </thead>
            <tbody>
              {workbookCountsMatrix.rows.map((row) => {
                const isEditingWorkbooks = editingWorkbookSite === row.siteLabel;
                const cols = workbookCountsMatrix.columns;
                return (
                <tr key={row.siteLabel}>
                  <td
                    className="sitesWorkbookSiteCell"
                    style={{ fontWeight: 700, maxWidth: WB_TABLE.site, boxSizing: "border-box" }}
                    title={row.siteLabel}
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
                  <td
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      verticalAlign: "middle",
                    }}
                    title={row.workbookNotesUpdatedAt || undefined}
                  >
                    {formatWorkbookInventoryUpdatedAt(row.workbookNotesUpdatedAt)}
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      {isEditingWorkbooks ? (
                        <>
                          <button
                            type="button"
                            className="btn btnPrimary"
                            style={{ fontSize: 12, padding: "6px 14px", borderRadius: 10 }}
                            disabled={savingWorkbookFor === row.siteLabel}
                            onClick={() => void saveSiteWorkbookCounts(row.siteLabel, cols)}
                          >
                            {savingWorkbookFor === row.siteLabel ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="sitesBtnGhost"
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
                          className="sitesBtnGhost"
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
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Site logistics</div>
        <div className="small" style={{ marginBottom: 12, color: "var(--muted)", maxWidth: 900 }}>
          Add a custom URL to override.
        </div>
        <div className="sitesLogisticsScroller">
          <table className="table sitesLogisticsTable">
            <thead>
              <tr>
                <th>Site</th>
                <th>Map</th>
                <th>Source</th>
                <th className="small" style={{ textAlign: "right", color: "var(--muted)", fontWeight: 700 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workbookCountsMatrix.rows.map((row) => (
                <Fragment key={row.siteLabel}>
                  <tr>
                    <td className="sitesLogisticsSiteCell">{row.siteLabel}</td>
                    <td className="sitesLogisticsLinkCell">
                      {row.effectiveLogisticsUrl ? (
                        <a
                          className="sitesLogisticsOpenLink"
                          href={row.effectiveLogisticsUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Open logistics map ↗
                        </a>
                      ) : (
                        <span className="small" style={{ color: "var(--muted)" }}>
                          No map matched — set a custom URL
                        </span>
                      )}
                    </td>
                    <td className="sitesLogisticsMetaCell">
                      {row.customLogisticsUrl
                        ? "Custom URL"
                        : row.effectiveLogisticsUrl
                          ? "Built-in directory"
                          : "—"}
                    </td>
                    <td className="sitesLogisticsActionCell">
                      <button
                        type="button"
                        className="sitesBtnGhost"
                        disabled={!!savingLogisticsFor}
                        onClick={() => {
                          setEditingLogisticsSite((cur) =>
                            cur === row.siteLabel ? "" : row.siteLabel
                          );
                          setLogisticsUrlDraft(row.customLogisticsUrl || "");
                        }}
                      >
                        {editingLogisticsSite === row.siteLabel ? "Close" : "Edit URL"}
                      </button>
                    </td>
                  </tr>
                  {editingLogisticsSite === row.siteLabel ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          background: "var(--skySoft)",
                          padding: "14px 16px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
                          <label className="small" style={{ fontWeight: 700, color: "var(--text)" }}>
                            Custom logistics URL (optional)
                          </label>
                          <input
                            className="input"
                            type="url"
                            placeholder="https://…"
                            value={logisticsUrlDraft}
                            onChange={(e) => setLogisticsUrlDraft(e.target.value)}
                          />
                          <div className="small" style={{ color: "var(--muted)", lineHeight: 1.45 }}>
                            Leave empty to use only the built-in SharePoint link when one matches this site.
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 10 }}
                              disabled={savingLogisticsFor === row.siteLabel}
                              onClick={() => void saveSiteLogisticsUrl(row.siteLabel)}
                            >
                              {savingLogisticsFor === row.siteLabel ? "Saving…" : "Save URL"}
                            </button>
                            <button
                              type="button"
                              className="sitesBtnGhost"
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
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

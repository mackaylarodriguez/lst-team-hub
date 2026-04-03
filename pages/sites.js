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
import {
  SITE_OPTIONS,
  isLegacyCombinedVicenzaPadovaSiteName,
  isValidSiteOptionLabelFormat,
  normalizeSiteOptionLabel,
} from "@/lib/siteOptions";
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
  /** Medium-style date only; keep narrow (table-layout: fixed). */
  lastEdited: 108,
  /** Edit counts / Save / Cancel */
  workbookActions: 200,
};

function formatWorkbookInventoryUpdatedAt(iso) {
  const s = String(iso || "").trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
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
  const [editingHousingNotesSite, setEditingHousingNotesSite] = useState("");
  const [housingNotesDraft, setHousingNotesDraft] = useState("");
  const [savingHousingNotesFor, setSavingHousingNotesFor] = useState("");
  const [editingWorkbookSite, setEditingWorkbookSite] = useState("");
  const [workbookQtyDraft, setWorkbookQtyDraft] = useState({});
  const [savingWorkbookFor, setSavingWorkbookFor] = useState("");
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [addSiteNameDraft, setAddSiteNameDraft] = useState("");
  const [addSiteLogisticsDraft, setAddSiteLogisticsDraft] = useState("");
  const [savingAddSite, setSavingAddSite] = useState(false);

  const siteLabelsOrdered = useMemo(() => {
    const matchedNoteIds = new Set();
    for (const o of SITE_OPTIONS) {
      const n = findSiteBudgetNoteForOption(o, siteNotes);
      if (n?.id) matchedNoteIds.add(n.id);
    }
    const extras = [];
    const seenExtraLower = new Set();
    for (const note of siteNotes) {
      const sn = String(note?.siteName || "").trim();
      if (!sn || matchedNoteIds.has(note.id)) continue;
      if (isLegacyCombinedVicenzaPadovaSiteName(sn)) continue;
      const k = sn.toLowerCase();
      if (seenExtraLower.has(k)) continue;
      seenExtraLower.add(k);
      extras.push(sn);
    }
    extras.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return [...SITE_OPTIONS, ...extras];
  }, [siteNotes]);

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
    for (const siteLabel of siteLabelsOrdered) {
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

    const rows = siteLabelsOrdered.map((siteLabel) => {
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
        housingNotes: String(note?.notes || "").trim(),
      };
    });

    return { columns, rows };
  }, [siteNotes, siteLabelsOrdered]);

  const workbookTableWidthPx = useMemo(() => {
    const { site, workbookQty, totalBooks, lastEdited, workbookActions } = WB_TABLE;
    const n = workbookCountsMatrix.columns.length;
    return site + n * workbookQty + totalBooks + lastEdited + workbookActions;
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

  async function saveSiteHousingNotes(siteOption) {
    const matched = findSiteBudgetNoteForOption(siteOption, siteNotes);
    try {
      setSavingHousingNotesFor(siteOption);
      setStatus("");
      let saved;
      if (matched) {
        saved = await updateSiteBudgetNote(matched.id, {
          siteName: siteOption,
          workbookNotes: matched.workbookNotes ?? "",
          notes: housingNotesDraft,
          effectiveDate: matched.effectiveDate || null,
          logisticsUrl: matched.logisticsUrl ?? "",
        });
      } else {
        saved = await upsertSiteBudgetNote({
          siteName: siteOption,
          workbookNotes: "",
          notes: housingNotesDraft,
          logisticsUrl: null,
        });
      }
      setSiteNotes((prev) => {
        const others = prev.filter((r) => r.id !== saved.id);
        return [...others, saved].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
      });
      setEditingHousingNotesSite("");
      setHousingNotesDraft("");
      showToast(`Saved housing note for ${siteOption}`, "success");
    } catch (e) {
      const msg = e.message || "Save failed.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSavingHousingNotesFor("");
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

  function closeAddSiteModal() {
    setAddSiteOpen(false);
    setAddSiteNameDraft("");
    setAddSiteLogisticsDraft("");
  }

  async function submitAddSite() {
    const name = normalizeSiteOptionLabel(addSiteNameDraft);
    const url = String(addSiteLogisticsDraft || "").trim();
    if (!name) {
      showToast("Enter a site name.", "error");
      return;
    }
    if (!isValidSiteOptionLabelFormat(name)) {
      showToast('Use the same pattern as other sites: "Country - City" (spaces around the hyphen).', "error");
      return;
    }
    const nameLower = name.toLowerCase();
    if (siteLabelsOrdered.some((l) => l.toLowerCase() === nameLower)) {
      showToast("That site is already listed. Edit logistics or workbooks on its row.", "error");
      return;
    }
    try {
      setSavingAddSite(true);
      setStatus("");
      const saved = await upsertSiteBudgetNote({
        siteName: name,
        notes: "",
        workbookNotes: "",
        logisticsUrl: url || null,
      });
      setSiteNotes((prev) => {
        const others = prev.filter((r) => r.id !== saved.id);
        return [...others, saved].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
      });
      closeAddSiteModal();
      showToast(`Added site ${name}`, "success");
    } catch (e) {
      const msg = e.message || "Could not add site.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSavingAddSite(false);
    }
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

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      <div className="card pad" style={{ marginBottom: 24 }}>
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <div className="appSectionBadge" style={{ marginBottom: 8 }}>Workbooks</div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Workbook counts by site</div>
          </div>
          <button
            type="button"
            className="btn btnPrimary"
            style={{ fontSize: 13, padding: "8px 16px", borderRadius: 10, flexShrink: 0 }}
            onClick={() => {
              setAddSiteNameDraft("");
              setAddSiteLogisticsDraft("");
              setAddSiteOpen(true);
            }}
          >
            Add site
          </button>
        </div>
        <div className="sitesWorkbookScroller">
          <table
            className="table sitesWorkbookTable dataTableStriped"
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
              <col style={{ width: WB_TABLE.lastEdited }} />
              <col style={{ width: WB_TABLE.workbookActions }} />
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
                <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>Total books</th>
                <th
                  className="sitesWorkbookLastEditedHead"
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--muted)",
                    textAlign: "center",
                  }}
                  title="When workbook inventory was last saved"
                >
                  Last edited
                </th>
                <th
                  className="sitesWorkbookActionsHead"
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--muted)",
                    textAlign: "center",
                  }}
                >
                  Actions
                </th>
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
                        <td key={col.key} className="sitesWorkbookQtyCell" style={{ verticalAlign: "middle" }}>
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
                              textAlign: "center",
                              padding: "4px 6px",
                              fontSize: 12,
                            }}
                          />
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="sitesWorkbookQtyCell" style={{ color: "var(--muted)" }}>
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
                  <td className="sitesWorkbookQtyCell" style={{ fontWeight: 800 }}>
                    {row.totalCopies > 0 ? row.totalCopies : "—"}
                  </td>
                  <td className="sitesWorkbookQtyCell sitesWorkbookLastEditedCell" style={{ verticalAlign: "middle" }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatWorkbookInventoryUpdatedAt(row.workbookNotesUpdatedAt)}
                    </span>
                  </td>
                  <td className="sitesWorkbookQtyCell sitesWorkbookActionsCell" style={{ verticalAlign: "middle" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
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
        <div className="appSectionBadge" style={{ marginBottom: 8 }}>Logistics</div>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Site logistics</div>
        <div className="sitesLogisticsScroller">
          <table className="table sitesLogisticsTable dataTableStriped">
            <thead>
              <tr>
                <th>Site</th>
                <th>Map</th>
                <th>Source</th>
                <th>Housing notes</th>
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
                    <td className="sitesLogisticsHousingCell">
                      {row.housingNotes ? (
                        <div
                          className="small"
                          style={{
                            lineHeight: 1.45,
                            maxHeight: "4.35em",
                            overflow: "hidden",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                          }}
                          title={row.housingNotes}
                        >
                          {row.housingNotes.length > 220
                            ? `${row.housingNotes.slice(0, 220)}…`
                            : row.housingNotes}
                        </div>
                      ) : (
                        <span className="small" style={{ color: "var(--muted)" }}>
                          No housing note yet
                        </span>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="sitesBtnGhost"
                          disabled={!!savingLogisticsFor || !!savingHousingNotesFor}
                          onClick={() => {
                            setEditingLogisticsSite("");
                            setLogisticsUrlDraft("");
                            if (editingHousingNotesSite === row.siteLabel) {
                              setEditingHousingNotesSite("");
                              setHousingNotesDraft("");
                            } else {
                              setEditingHousingNotesSite(row.siteLabel);
                              setHousingNotesDraft(row.housingNotes || "");
                            }
                          }}
                        >
                          {editingHousingNotesSite === row.siteLabel ? "Close" : "Edit note"}
                        </button>
                      </div>
                    </td>
                    <td className="sitesLogisticsActionCell">
                      <button
                        type="button"
                        className="sitesBtnGhost"
                        disabled={!!savingLogisticsFor || !!savingHousingNotesFor}
                        onClick={() => {
                          setEditingHousingNotesSite("");
                          setHousingNotesDraft("");
                          if (editingLogisticsSite === row.siteLabel) {
                            setEditingLogisticsSite("");
                            setLogisticsUrlDraft("");
                          } else {
                            setEditingLogisticsSite(row.siteLabel);
                            setLogisticsUrlDraft(row.customLogisticsUrl || "");
                          }
                        }}
                      >
                        {editingLogisticsSite === row.siteLabel ? "Close" : "Edit URL"}
                      </button>
                    </td>
                  </tr>
                  {editingLogisticsSite === row.siteLabel ? (
                    <tr>
                      <td
                        colSpan={5}
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
                  {editingHousingNotesSite === row.siteLabel ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          background: "var(--skySoft)",
                          padding: "14px 16px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
                          <label className="small" style={{ fontWeight: 700, color: "var(--text)" }}>
                            Housing / logistics note (same as Budget → Site housing notes)
                          </label>
                          <textarea
                            className="input"
                            rows={6}
                            placeholder="Costs, contacts, utilities, shuttles, etc."
                            value={housingNotesDraft}
                            onChange={(e) => setHousingNotesDraft(e.target.value)}
                          />
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 10 }}
                              disabled={savingHousingNotesFor === row.siteLabel}
                              onClick={() => void saveSiteHousingNotes(row.siteLabel)}
                            >
                              {savingHousingNotesFor === row.siteLabel ? "Saving…" : "Save note"}
                            </button>
                            <button
                              type="button"
                              className="sitesBtnGhost"
                              disabled={savingHousingNotesFor === row.siteLabel}
                              onClick={() => {
                                setEditingHousingNotesSite("");
                                setHousingNotesDraft("");
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

      {addSiteOpen ? (
        <div
          className="appModalOverlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 100,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-site-title"
          onClick={() => !savingAddSite && closeAddSiteModal()}
        >
          <div
            className="card pad"
            style={{ width: "min(480px, 100%)", maxHeight: "90vh", overflow: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-site-title" style={{ margin: "0 0 6px 0", fontSize: 18 }}>
              Add site
            </h2>
            <p className="small" style={{ margin: "0 0 16px 0", color: "var(--muted)", lineHeight: 1.45 }}>
              Name it like the built-in list: <strong>Country - City</strong> (spaces around{" "}
              <code> - </code>), e.g. <code>Brazil - Joao Pessoa</code>.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                  Site name
                </label>
                <input
                  className="input"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Italy - Padova"
                  value={addSiteNameDraft}
                  onChange={(e) => setAddSiteNameDraft(e.target.value)}
                  disabled={savingAddSite}
                />
              </div>
              <div>
                <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                  Logistics link
                </label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://…"
                  value={addSiteLogisticsDraft}
                  onChange={(e) => setAddSiteLogisticsDraft(e.target.value)}
                  disabled={savingAddSite}
                />
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={savingAddSite} onClick={closeAddSiteModal}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={savingAddSite}
                onClick={() => void submitAddSite()}
              >
                {savingAddSite ? "Saving…" : "Add site"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  buildSiteLabelsOrdered,
  findSiteBudgetNoteForOption,
  resolveCanonicalSiteLabelForTrip,
  resolveEffectiveSiteHostName,
} from "@/lib/siteMaterials";
import {
  listSiteBudgetNotes,
  updateSiteBudgetNote,
  upsertSiteBudgetNote,
} from "@/lib/tripBudget";
import {
  getDefaultSiteHostName,
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
import SitesAvailabilityTab from "@/components/sites/SitesAvailabilityTab";
import SiteEditorModal from "@/components/sites/SiteEditorModal";
import { migrateLegacySiteAvailabilityFromNotes } from "@/lib/siteAvailability";

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
  const [isEditingLogistics, setIsEditingLogistics] = useState(false);
  const [logisticsDraftBySite, setLogisticsDraftBySite] = useState({});
  const [savingLogistics, setSavingLogistics] = useState(false);
  const [editingWorkbookSite, setEditingWorkbookSite] = useState("");
  const [workbookQtyDraft, setWorkbookQtyDraft] = useState({});
  const [savingWorkbookFor, setSavingWorkbookFor] = useState("");
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [addSiteNameDraft, setAddSiteNameDraft] = useState("");
  const [addSiteLogisticsDraft, setAddSiteLogisticsDraft] = useState("");
  const [addSiteBudgetNotesDraft, setAddSiteBudgetNotesDraft] = useState("");
  const [savingAddSite, setSavingAddSite] = useState(false);
  const [tab, setTab] = useState("Availability");
  const [editingSiteLabel, setEditingSiteLabel] = useState("");
  const [availabilityReloadKey, setAvailabilityReloadKey] = useState(0);

  const siteLabelsOrdered = useMemo(() => buildSiteLabelsOrdered(siteNotes), [siteNotes]);

  useEffect(() => {
    const t = String(router.query.tab || "").toLowerCase();
    if (t === "logistics" || t === "site-logistics") setTab("Site logistics");
    else if (t === "availability") setTab("Availability");
    else if (t === "workbooks") setTab("Workbooks");
  }, [router.query.tab]);

  function switchSitesTab(nextTab) {
    setTab(nextTab);
    setIsEditingLogistics(false);
    setLogisticsDraftBySite({});
    setEditingWorkbookSite("");
    setWorkbookQtyDraft({});
  }

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
        try {
          await migrateLegacySiteAvailabilityFromNotes(2027);
        } catch {
          /* optional cleanup of hidden availability rows */
        }
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
      const effectiveHostName = resolveEffectiveSiteHostName(siteLabel, siteNotes);
      const defaultHostHint = getDefaultSiteHostName(
        resolveCanonicalSiteLabelForTrip(siteLabel, siteNotes) || siteLabel
      );
      const hostOverride = String(note?.hostName || "").trim();
      return {
        siteLabel,
        note,
        workbookNotesUpdatedAt: note?.workbookNotesUpdatedAt || "",
        qtyByKey,
        totalCopies: summary.totalCopies,
        effectiveLogisticsUrl,
        customLogisticsUrl: customUrl,
        housingNotes: String(note?.notes || "").trim(),
        effectiveHostName,
        defaultHostHint,
        hostOverride,
      };
    });

    return { columns, rows };
  }, [siteNotes, siteLabelsOrdered]);

  const workbookTableWidthPx = useMemo(() => {
    const { site, workbookQty, totalBooks, lastEdited, workbookActions } = WB_TABLE;
    const n = workbookCountsMatrix.columns.length;
    return site + n * workbookQty + totalBooks + lastEdited + workbookActions;
  }, [workbookCountsMatrix.columns.length]);

  function beginLogisticsEdit() {
    const drafts = {};
    for (const row of workbookCountsMatrix.rows) {
      drafts[row.siteLabel] = {
        hostName: row.hostOverride || "",
        logisticsUrl: row.customLogisticsUrl || "",
        housingNotes: row.housingNotes || "",
      };
    }
    setLogisticsDraftBySite(drafts);
    setIsEditingLogistics(true);
  }

  function cancelLogisticsEdit() {
    setIsEditingLogistics(false);
    setLogisticsDraftBySite({});
  }

  function updateLogisticsDraft(siteLabel, patch) {
    setLogisticsDraftBySite((current) => ({
      ...current,
      [siteLabel]: {
        ...(current[siteLabel] || { hostName: "", logisticsUrl: "", housingNotes: "" }),
        ...patch,
      },
    }));
  }

  async function saveAllLogisticsEdits() {
    try {
      setSavingLogistics(true);
      setStatus("");
      let nextNotes = siteNotes;
      let savedCount = 0;

      for (const row of workbookCountsMatrix.rows) {
        const draft = logisticsDraftBySite[row.siteLabel];
        if (!draft) continue;
        const nextHost = String(draft.hostName || "").trim();
        const nextUrl = String(draft.logisticsUrl || "").trim();
        const nextHousingNotes = String(draft.housingNotes || "");
        const changed =
          nextHost !== String(row.hostOverride || "").trim() ||
          nextUrl !== String(row.customLogisticsUrl || "").trim() ||
          nextHousingNotes !== String(row.housingNotes || "");
        if (!changed) continue;

        const matched = findSiteBudgetNoteForOption(row.siteLabel, nextNotes);
        let saved;
        if (matched) {
          saved = await updateSiteBudgetNote(matched.id, {
            siteName: row.siteLabel,
            workbookNotes: matched.workbookNotes ?? "",
            notes: nextHousingNotes,
            effectiveDate: matched.effectiveDate || null,
            logisticsUrl: nextUrl || null,
            hostName: nextHost || null,
          });
        } else {
          saved = await upsertSiteBudgetNote({
            siteName: row.siteLabel,
            workbookNotes: "",
            notes: nextHousingNotes,
            logisticsUrl: nextUrl || null,
            hostName: nextHost || null,
          });
        }
        nextNotes = [...nextNotes.filter((r) => r.id !== saved.id), saved].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
        savedCount += 1;
      }

      setSiteNotes(nextNotes);
      setIsEditingLogistics(false);
      setLogisticsDraftBySite({});
      showToast(
        savedCount > 0 ? `Saved logistics for ${savedCount} site${savedCount === 1 ? "" : "s"}` : "No logistics changes to save",
        "success"
      );
    } catch (e) {
      const msg = e.message || "Save failed.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSavingLogistics(false);
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

  function openSiteEditor(siteLabel) {
    const label = String(siteLabel || "").trim();
    if (!label) return;
    setEditingSiteLabel(label);
  }

  function closeAddSiteModal() {
    setAddSiteOpen(false);
    setAddSiteNameDraft("");
    setAddSiteLogisticsDraft("");
    setAddSiteBudgetNotesDraft("");
  }

  function handleSiteEditorSaved({ note, siteLabel }) {
    if (note) {
      setSiteNotes((prev) => {
        const others = prev.filter((r) => r.id !== note.id);
        return [...others, note].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
      });
    } else {
      void listSiteBudgetNotes().then((rows) => setSiteNotes(rows || []));
    }
    setAvailabilityReloadKey((n) => n + 1);
  }

  async function submitAddSite() {
    const name = normalizeSiteOptionLabel(addSiteNameDraft);
    const url = String(addSiteLogisticsDraft || "").trim();
    const budgetNotes = String(addSiteBudgetNotesDraft || "");
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
        notes: budgetNotes,
        workbookNotes: "",
        logisticsUrl: url || null,
        hostName: null,
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
          logisticsUrl: matched.logisticsUrl ?? "",
          hostName: matched.hostName ?? "",
          setWorkbookNotesUpdatedAt: true,
        });
      } else {
        saved = await upsertSiteBudgetNote({
          siteName: siteOption,
          workbookNotes: workbookNotesStr,
          notes: "",
          logisticsUrl: null,
          hostName: null,
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

      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="tabs">
          <button
            type="button"
            className={"tab " + (tab === "Availability" ? "tabActive" : "")}
            onClick={() => switchSitesTab("Availability")}
          >
            Availability
          </button>
          <button
            type="button"
            className={"tab " + (tab === "Workbooks" ? "tabActive" : "")}
            onClick={() => switchSitesTab("Workbooks")}
          >
            Workbooks
          </button>
          <button
            type="button"
            className={"tab " + (tab === "Site logistics" ? "tabActive" : "")}
            onClick={() => switchSitesTab("Site logistics")}
          >
            Site logistics
          </button>
        </div>
        <button
          type="button"
          className="btn btnPrimary"
          style={{ fontSize: 13, padding: "8px 16px", borderRadius: 10, flexShrink: 0 }}
          onClick={() => {
            setAddSiteNameDraft("");
            setAddSiteLogisticsDraft("");
            setAddSiteBudgetNotesDraft("");
            setAddSiteOpen(true);
          }}
        >
          Add site
        </button>
      </div>

      {tab === "Workbooks" ? (
      <div className="card pad" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Workbook counts by site</div>
          <p className="small" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.45 }}>
            Inventory on hand at each mission site for shipping and materials planning.
          </p>
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
                    title={`${row.siteLabel} — click to edit site`}
                  >
                    <button
                      type="button"
                      className="sitesSiteNameButton"
                      onClick={() => openSiteEditor(row.siteLabel)}
                    >
                      {row.siteLabel}
                    </button>
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
      ) : null}

      {tab === "Availability" ? (
        <SitesAvailabilityTab
          key={availabilityReloadKey}
          siteLabels={siteLabelsOrdered}
          onEditSite={openSiteEditor}
        />
      ) : null}

      {tab === "Site logistics" ? (
      <div className="card pad" style={{ marginBottom: 24 }}>
        <div
          className="row"
          style={{
            marginBottom: 8,
            gap: 12,
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Site logistics</div>
            <p className="small" style={{ margin: 0, color: "var(--muted)", lineHeight: 1.45 }}>
              Host contacts, logistics maps, and notes for each site.
            </p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
            {isEditingLogistics ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={savingLogistics}
                  onClick={cancelLogisticsEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={savingLogistics}
                  onClick={() => void saveAllLogisticsEdits()}
                >
                  {savingLogistics ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button type="button" className="btn btnPrimary" onClick={beginLogisticsEdit}>
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="sitesLogisticsScroller">
          <table className="table sitesLogisticsTable dataTableStriped">
            <thead>
              <tr>
                <th>Site</th>
                <th>Host</th>
                <th>Map</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {workbookCountsMatrix.rows.map((row) => {
                const draft = logisticsDraftBySite[row.siteLabel] || {
                  hostName: "",
                  logisticsUrl: "",
                  housingNotes: "",
                };
                return (
                  <tr key={row.siteLabel}>
                    <td className="sitesLogisticsSiteCell">
                      <button
                        type="button"
                        className="sitesSiteNameButton"
                        onClick={() => openSiteEditor(row.siteLabel)}
                        title={`${row.siteLabel} — click to edit site`}
                      >
                        {row.siteLabel}
                      </button>
                    </td>
                    <td className="sitesLogisticsHostCell">
                      {isEditingLogistics ? (
                        <input
                          className="input"
                          type="text"
                          autoComplete="off"
                          disabled={savingLogistics}
                          placeholder={
                            row.defaultHostHint
                              ? `Default: ${row.defaultHostHint}`
                              : "Host name (optional)"
                          }
                          value={draft.hostName}
                          onChange={(e) =>
                            updateLogisticsDraft(row.siteLabel, { hostName: e.target.value })
                          }
                        />
                      ) : row.effectiveHostName ? (
                        <span style={{ fontWeight: 600 }}>{row.effectiveHostName}</span>
                      ) : (
                        <span className="small" style={{ color: "var(--muted)" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="sitesLogisticsLinkCell">
                      {isEditingLogistics ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <input
                            className="input"
                            type="url"
                            disabled={savingLogistics}
                            placeholder="https://… (optional custom map URL)"
                            value={draft.logisticsUrl}
                            onChange={(e) =>
                              updateLogisticsDraft(row.siteLabel, { logisticsUrl: e.target.value })
                            }
                          />
                          {row.effectiveLogisticsUrl && !String(draft.logisticsUrl || "").trim() ? (
                            <a
                              className="sitesLogisticsOpenLink small"
                              href={row.effectiveLogisticsUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                            >
                              Open built-in map ↗
                            </a>
                          ) : null}
                        </div>
                      ) : row.effectiveLogisticsUrl ? (
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
                          No map yet
                        </span>
                      )}
                    </td>
                    <td className="sitesLogisticsHousingCell">
                      {isEditingLogistics ? (
                        <textarea
                          className="input"
                          rows={3}
                          disabled={savingLogistics}
                          placeholder="Costs, contacts, utilities, shuttles, etc."
                          value={draft.housingNotes}
                          onChange={(e) =>
                            updateLogisticsDraft(row.siteLabel, { housingNotes: e.target.value })
                          }
                        />
                      ) : row.housingNotes ? (
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
                          No budget note yet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}

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
              <div>
                <label className="small" style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>
                  Notes
                </label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Costs, contacts, utilities, shuttles, etc."
                  value={addSiteBudgetNotesDraft}
                  onChange={(e) => setAddSiteBudgetNotesDraft(e.target.value)}
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

      <SiteEditorModal
        open={Boolean(editingSiteLabel)}
        siteLabel={editingSiteLabel}
        siteNotes={siteNotes}
        allSiteLabels={siteLabelsOrdered}
        onClose={() => setEditingSiteLabel("")}
        onSaved={handleSiteEditorSaved}
      />
    </Shell>
  );
}

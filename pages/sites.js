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
      const positive = items.filter((x) => Number(x.qty) > 0);
      const qtyByKey = new Map();
      for (const { name, qty } of positive) {
        const k = normalizeWorkbookNameKey(name);
        if (!k) continue;
        qtyByKey.set(k, (qtyByKey.get(k) || 0) + (Number(qty) || 0));
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
        Workbook strings and housing notes for each site live in <code>site_budget_notes</code> and are
        edited from <strong>Trip → Materials</strong> (managers) or your database admin tools. This page
        summarizes counts from those saved plans and lets you override site logistics links.
      </p>

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      <div className="card pad" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Workbook counts by site</div>
        <div className="small" style={{ marginBottom: 12, color: "var(--muted)", maxWidth: 900 }}>
          One row per mission site. Columns follow <code>lib/workbookCatalog.js</code> plus any extra
          titles found in saved workbook plans. Clear a custom logistics URL to fall back to the built-in
          map in <code>lib/siteInfoLinks.js</code>.
        </div>
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(15,23,42,.08)" }}>
          <table
            className="table"
            style={{
              minWidth: Math.max(720, 160 + workbookCountsMatrix.columns.length * 56 + 220),
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
                <th style={{ whiteSpace: "nowrap", minWidth: 200 }}>Site logistics</th>
              </tr>
            </thead>
            <tbody>
              {workbookCountsMatrix.rows.map((row) => (
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
                  {workbookCountsMatrix.columns.map((col) => {
                    const q = row.qtyByKey.get(col.key) ?? 0;
                    return (
                      <td key={col.key} style={{ textAlign: "right", color: "var(--muted)" }}>
                        {q > 0 ? <strong style={{ color: "inherit" }}>{q}</strong> : "—"}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right", fontWeight: 800 }}>
                    {row.totalCopies > 0 ? row.totalCopies : "—"}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

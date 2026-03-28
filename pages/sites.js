import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  buildSiteWorkbookInventoryRows,
  groupTripsBySiteForMaterials,
  listAllTripBudgets,
  saveTripBudget,
} from "@/lib/tripBudget";
import { listTripsForCurrentUser } from "@/lib/trips";
import { showToast } from "@/components/Toast";

function formatInventoryDate(ms) {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function SitesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [trips, setTrips] = useState([]);
  const [budgetRows, setBudgetRows] = useState([]);
  const [sitesWorkbooksEditing, setSitesWorkbooksEditing] = useState(false);
  const [sitesWorkbooksDraft, setSitesWorkbooksDraft] = useState({});
  const [sitesWorkbooksSaving, setSitesWorkbooksSaving] = useState(false);

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
        const [tripsRes, budgetsRes] = await Promise.all([
          listTripsForCurrentUser(),
          listAllTripBudgets(),
        ]);
        if (cancelled) return;
        setTrips(tripsRes || []);
        setBudgetRows(budgetsRes || []);
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

  const siteGroups = useMemo(
    () => groupTripsBySiteForMaterials(trips, budgetRows),
    [budgetRows, trips]
  );

  const inventoryRows = useMemo(
    () => buildSiteWorkbookInventoryRows(siteGroups),
    [siteGroups]
  );

  function beginSitesWorkbooksEdit() {
    const next = {};
    for (const g of siteGroups) {
      for (const t of g.teams) {
        next[t.tripId] = t.workbooks || "";
      }
    }
    setSitesWorkbooksDraft(next);
    setSitesWorkbooksEditing(true);
  }

  function cancelSitesWorkbooksEdit() {
    setSitesWorkbooksEditing(false);
    setSitesWorkbooksDraft({});
  }

  async function saveSitesWorkbooks() {
    if (sitesWorkbooksSaving) return;
    try {
      setSitesWorkbooksSaving(true);
      setStatus("Saving workbooks…");
      for (const g of siteGroups) {
        for (const t of g.teams) {
          const workbooks =
            sitesWorkbooksDraft[t.tripId] !== undefined
              ? sitesWorkbooksDraft[t.tripId]
              : t.workbooks || "";
          if ((t.workbooks || "") === workbooks) continue;
          await saveTripBudget(t.tripId, { workbooks });
        }
      }
      const budgetsRes = await listAllTripBudgets();
      setBudgetRows(budgetsRes || []);
      setSitesWorkbooksEditing(false);
      setSitesWorkbooksDraft({});
      setStatus("");
      showToast("Workbooks saved for all listed teams.", "success");
    } catch (e) {
      const msg = e.message || "Could not save workbooks.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSitesWorkbooksSaving(false);
    }
  }

  function updateWorkbooksDraft(tripId, value) {
    setSitesWorkbooksDraft((prev) => ({ ...prev, [tripId]: value }));
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
      <p className="small" style={{ marginBottom: 20, maxWidth: 720 }}>
        Every trip is grouped by site (from the housing budget country/city when set, otherwise the
        trip&apos;s location). Use <strong>Teams by site</strong> below to edit workbook inventory
        strings for any team—same field as Trip → Materials and the housing budget row in the
        database. The summary table sums quantities per workbook title per site (e.g.{" "}
        <code>8-Reflection; 4 Good News</code>). Open <strong>Site logistics</strong> when a
        SharePoint link is configured for that location.
      </p>

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      {inventoryRows.length > 0 ? (
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Workbook totals by site</div>
          <table className="table" style={{ minWidth: 720, fontSize: 13 }}>
            <thead>
              <tr>
                <th>Site</th>
                <th>Workbook</th>
                <th>Qty (total)</th>
                <th>Last updated</th>
                <th>Site link</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((row) => (
                <tr key={`${row.siteLabel}|${row.workbookName}`}>
                  <td>
                    <strong>{row.siteLabel}</strong>
                  </td>
                  <td>{row.workbookName}</td>
                  <td>{row.totalQty}</td>
                  <td>{formatInventoryDate(row.lastUpdatedMs)}</td>
                  <td>
                    {row.logisticsUrl ? (
                      <a
                        className="btn btnPrimary"
                        href={row.logisticsUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        Site logistics
                      </a>
                    ) : (
                      <span className="small" style={{ color: "var(--muted)" }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : trips.length > 0 ? (
        <div className="card pad" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800 }}>No workbook lines parsed yet</div>
          <div className="small" style={{ marginTop: 8 }}>
            Add workbook text under a team below (e.g. <code>8-Reflection; 4 Good News</code>) and
            save. Totals will appear here once there is something to parse.
          </div>
        </div>
      ) : null}

      {trips.length === 0 ? (
        <div className="card pad">
          <div style={{ fontWeight: 800 }}>No trips yet</div>
          <div className="small" style={{ marginTop: 8 }}>
            Create a trip first; then sites and workbook strings will show up here.
          </div>
        </div>
      ) : (
        <div className="card pad">
          <div className="row" style={{ marginBottom: 12, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>Teams by site</div>
              <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                {trips.length} trip{trips.length === 1 ? "" : "s"} across {siteGroups.length} site
                {siteGroups.length === 1 ? "" : "s"}. Edit workbook strings in place, then save.
              </div>
            </div>
            <div className="spacer" />
            {sitesWorkbooksEditing ? (
              <>
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={sitesWorkbooksSaving}
                  onClick={() => void saveSitesWorkbooks()}
                >
                  {sitesWorkbooksSaving ? "Saving…" : "Save workbooks"}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={sitesWorkbooksSaving}
                  onClick={cancelSitesWorkbooksEdit}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" className="btn" onClick={beginSitesWorkbooksEdit}>
                Edit workbooks
              </button>
            )}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {siteGroups.map((group) => (
              <div key={group.siteLabel}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{group.siteLabel}</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ minWidth: 640, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>Status</th>
                        <th># Workers</th>
                        <th>Workbooks</th>
                        <th style={{ width: 100 }}>Trip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((t) => (
                        <tr key={t.tripId}>
                          <td>{t.tripName || t.tripId}</td>
                          <td>{t.status === "archived" ? "Archived" : "Active"}</td>
                          <td>{t.numWorkers != null ? t.numWorkers : "—"}</td>
                          <td style={{ minWidth: 280 }}>
                            {sitesWorkbooksEditing ? (
                              <textarea
                                className="input"
                                rows={3}
                                value={
                                  sitesWorkbooksDraft[t.tripId] !== undefined
                                    ? sitesWorkbooksDraft[t.tripId]
                                    : t.workbooks || ""
                                }
                                onChange={(e) => updateWorkbooksDraft(t.tripId, e.target.value)}
                                placeholder="e.g. 8-Reflection; 4 Good News"
                                style={{ width: "100%", minWidth: 260, fontSize: 12 }}
                              />
                            ) : (
                              <span style={{ whiteSpace: "pre-wrap" }}>
                                {t.workbooks ? t.workbooks : "—"}
                              </span>
                            )}
                          </td>
                          <td>
                            <Link
                              className="btn"
                              href={`/trips/${encodeURIComponent(t.tripId)}?tab=Materials`}
                              style={{ padding: "6px 10px", fontSize: 11 }}
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

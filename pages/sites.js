import Shell from "@/components/Shell";
import AppIcon from "@/components/AppIcon";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { requireSession } from "@/lib/auth";
import { isManagerRole } from "@/lib/roles";
import {
  buildSiteWorkbookInventoryRows,
  groupBudgetRowsBySiteForMaterials,
  listAllTripBudgets,
} from "@/lib/tripBudget";
import { listTripsForCurrentUser } from "@/lib/trips";

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
    () => groupBudgetRowsBySiteForMaterials(budgetRows, trips),
    [budgetRows, trips]
  );

  const inventoryRows = useMemo(
    () => buildSiteWorkbookInventoryRows(siteGroups),
    [siteGroups]
  );

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
        Materials inventory by site: workbook lines are parsed from each team&apos;s housing budget
        (e.g. <code>8-Reflection; 4 Good News</code>). Quantities are summed per site. Last updated
        comes from the most recent budget save for that workbook line at the site. Use{" "}
        <strong>Site logistics</strong> when a SharePoint link is configured for that location.
      </p>

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      {inventoryRows.length === 0 ? (
        <div className="card pad">
          <div style={{ fontWeight: 800 }}>No workbook inventory yet</div>
          <div className="small" style={{ marginTop: 8 }}>
            Enter workbook strings on the Budget → Housing grid or on each trip&apos;s Materials tab.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
      )}

      {siteGroups.length > 0 && (
        <div className="card pad" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Teams by site</div>
          <div className="small" style={{ marginBottom: 12, color: "var(--muted)" }}>
            Raw workbook text per team (same as Budget housing).
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {siteGroups.map((group) => (
              <div key={group.siteLabel}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{group.siteLabel}</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ minWidth: 520, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>Status</th>
                        <th># Workers</th>
                        <th>Workbooks (raw)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams.map((t) => (
                        <tr key={t.tripId}>
                          <td>{t.tripName || t.tripId}</td>
                          <td>{t.status === "archived" ? "Archived" : "Active"}</td>
                          <td>{t.numWorkers != null ? t.numWorkers : "—"}</td>
                          <td>{t.workbooks ? t.workbooks : "—"}</td>
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

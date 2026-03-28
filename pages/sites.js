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
  parseAnyWorkbookInventoryString,
  summarizeWorkbookItemsForShipping,
} from "@/lib/workbookInventory";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
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
  const [siteNotes, setSiteNotes] = useState([]);
  const [draftWorkbook, setDraftWorkbook] = useState({});
  const [draftNotes, setDraftNotes] = useState({});
  const [savingSite, setSavingSite] = useState("");

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
        const list = rows || [];
        setSiteNotes(list);
        const w = {};
        const n = {};
        for (const opt of SITE_OPTIONS) {
          const note = findSiteBudgetNoteForOption(opt, list);
          w[opt] = note?.workbookNotes || "";
          n[opt] = note?.notes || "";
        }
        setDraftWorkbook(w);
        setDraftNotes(n);
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

  const siteSummaries = useMemo(() => {
    return SITE_OPTIONS.map((siteLabel) => {
      const note = findSiteBudgetNoteForOption(siteLabel, siteNotes);
      const raw = note?.workbookNotes || "";
      const items = parseAnyWorkbookInventoryString(raw);
      const summary = summarizeWorkbookItemsForShipping(items);
      const logisticsUrl = resolveSiteLogisticsUrl(siteLabel);
      return {
        siteLabel,
        note,
        raw,
        logisticsUrl,
        ...summary,
      };
    });
  }, [siteNotes]);

  async function saveSiteRow(siteOption) {
    const workbookNotes = draftWorkbook[siteOption] ?? "";
    const notes = draftNotes[siteOption] ?? "";
    const matched = findSiteBudgetNoteForOption(siteOption, siteNotes);

    try {
      setSavingSite(siteOption);
      setStatus("");
      let saved;
      if (matched) {
        saved = await updateSiteBudgetNote(matched.id, {
          siteName: siteOption,
          workbookNotes,
          notes,
          effectiveDate: matched.effectiveDate || null,
        });
      } else {
        saved = await upsertSiteBudgetNote({
          siteName: siteOption,
          workbookNotes,
          notes,
        });
      }

      setSiteNotes((prev) => {
        const others = prev.filter((r) => r.id !== saved.id);
        return [...others, saved].sort((a, b) =>
          a.siteName.localeCompare(b.siteName, undefined, { sensitivity: "base" })
        );
      });
      setDraftWorkbook((d) => ({ ...d, [siteOption]: workbookNotes }));
      setDraftNotes((d) => ({ ...d, [siteOption]: notes }));
      showToast(`Saved ${siteOption}`, "success");
    } catch (e) {
      const msg = e.message || "Save failed.";
      setStatus(msg);
      showToast(msg, "error");
    } finally {
      setSavingSite("");
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
        Canonical list of mission sites and workbook plans. This data is stored in{" "}
        <code>site_budget_notes</code> and is only visible to staff in this app (not workers). Use{" "}
        <strong>Title - qty</strong> separated by semicolons (e.g.{" "}
        <code>Luke - 19; Good News - 4</code>) or the same <code>8-Reflection</code> style as team
        materials. Trips whose <strong>location</strong> matches a site here will show counts on{" "}
        <strong>Trip → Materials</strong> for managers.
      </p>

      {status ? (
        <div className="small" style={{ marginBottom: 16, color: "var(--danger)" }}>
          {status}
        </div>
      ) : null}

      <div className="card pad" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Workbook titles (reference)</div>
        <div className="small" style={{ marginBottom: 10, color: "var(--muted)" }}>
          Edit the list in <code>lib/workbookCatalog.js</code> if your program adds titles.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {WORKBOOK_REFERENCE_TITLES.map((t) => (
            <span key={t} className="badge" style={{ fontWeight: 600 }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Workbook counts by site</div>
        <table className="table" style={{ minWidth: 640, fontSize: 13 }}>
          <thead>
            <tr>
              <th>Site</th>
              <th>Titles (qty &gt; 0)</th>
              <th>Total copies</th>
              <th>Site link</th>
            </tr>
          </thead>
          <tbody>
            {siteSummaries.map((row) => (
              <tr key={row.siteLabel}>
                <td>
                  <strong>{row.siteLabel}</strong>
                </td>
                <td>{row.distinctTitles > 0 ? row.distinctTitles : "—"}</td>
                <td>{row.totalCopies > 0 ? row.totalCopies : "—"}</td>
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

      <div style={{ fontWeight: 800, marginBottom: 10 }}>Site notes & workbook plan</div>
      <div className="small" style={{ marginBottom: 16, color: "var(--muted)" }}>
        One block per site. Save updates the staff-only site record (and may rename legacy rows to the
        canonical site name). Last updated: shown when present on matched note.
      </div>

      <div style={{ display: "grid", gap: 20 }}>
        {SITE_OPTIONS.map((siteOption) => {
          const matched = findSiteBudgetNoteForOption(siteOption, siteNotes);
          const raw = draftWorkbook[siteOption] ?? "";
          const items = parseAnyWorkbookInventoryString(raw);
          const liveSummary = summarizeWorkbookItemsForShipping(items);
          const isSaving = savingSite === siteOption;

          return (
            <div key={siteOption} className="card pad" style={{ display: "grid", gap: 10 }}>
              <div className="row" style={{ alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontWeight: 900 }}>{siteOption}</div>
                {matched?.effectiveDate ? (
                  <span className="small" style={{ color: "var(--muted)" }}>
                    Effective {matched.effectiveDate}
                  </span>
                ) : null}
                {matched?.id && matched.siteName !== siteOption ? (
                  <span className="small badge" title="Will use this row and rename site to match">
                    Linked from “{matched.siteName}”
                  </span>
                ) : null}
                <div className="spacer" />
                <button
                  type="button"
                  className="btn btnPrimary"
                  disabled={isSaving}
                  onClick={() => void saveSiteRow(siteOption)}
                >
                  {isSaving ? "Saving…" : "Save site"}
                </button>
              </div>

                  {liveSummary.distinctTitles > 0 || liveSummary.totalCopies > 0 ? (
                <div className="small" style={{ color: "var(--muted)" }}>
                  Preview:{" "}
                  <strong>
                    {liveSummary.distinctTitles} title{liveSummary.distinctTitles === 1 ? "" : "s"},{" "}
                    {liveSummary.totalCopies} cop{liveSummary.totalCopies === 1 ? "y" : "ies"}
                  </strong>
                  {matched?.updatedAt &&
                  !Number.isNaN(Date.parse(matched.updatedAt))
                    ? ` · Row last saved ${formatInventoryDate(Date.parse(matched.updatedAt))}`
                    : null}
                </div>
              ) : matched?.updatedAt && !Number.isNaN(Date.parse(matched.updatedAt)) ? (
                <div className="small" style={{ color: "var(--muted)" }}>
                  Row last saved {formatInventoryDate(Date.parse(matched.updatedAt))}
                </div>
              ) : null}

              <div>
                <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                  Housing / logistics notes
                </div>
                <textarea
                  className="input"
                  rows={3}
                  value={draftNotes[siteOption] ?? ""}
                  onChange={(e) =>
                    setDraftNotes((d) => ({ ...d, [siteOption]: e.target.value }))
                  }
                  placeholder="Costs, shuttles, housing reminders…"
                />
              </div>

              <div>
                <div className="small" style={{ marginBottom: 4, fontWeight: 700 }}>
                  Workbook plan (parsed for trip Materials)
                </div>
                <textarea
                  className="input"
                  rows={4}
                  value={draftWorkbook[siteOption] ?? ""}
                  onChange={(e) =>
                    setDraftWorkbook((d) => ({ ...d, [siteOption]: e.target.value }))
                  }
                  placeholder="e.g. Luke - 19; Good News - 4; 8-Reflection"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

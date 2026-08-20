import { useEffect, useMemo, useState } from "react";
import { showToast } from "@/components/Toast";
import {
  listSiteAvailabilityEdits,
  renameSiteAvailabilityEdit,
  renameSiteInAvailabilityGridPrefs,
  saveSiteAvailabilityEdit,
} from "@/lib/siteAvailability";
import {
  findSiteBudgetNoteForOption,
  resolveEffectiveSiteHostName,
} from "@/lib/siteMaterials";
import {
  getDefaultSiteHostName,
  isValidSiteOptionLabelFormat,
  normalizeSiteOptionLabel,
  SITE_OPTIONS,
} from "@/lib/siteOptions";
import { resolveSiteLogisticsUrl } from "@/lib/siteInfoLinks";
import {
  updateSiteBudgetNote,
  upsertSiteBudgetNote,
} from "@/lib/tripBudget";

const AVAILABILITY_YEAR = 2027;

function isBuiltInSiteLabel(label) {
  const lower = String(label || "")
    .trim()
    .toLowerCase();
  if (!lower) return false;
  return SITE_OPTIONS.some((opt) => opt.toLowerCase() === lower);
}

function blankDraft(siteLabel, note, availability, siteNotes) {
  const label = String(siteLabel || "").trim();
  const defaultHost = getDefaultSiteHostName(label) || "";
  const effectiveHost = resolveEffectiveSiteHostName(label, siteNotes) || "";
  return {
    siteName: label,
    hostName: String(note?.hostName || "").trim() || (effectiveHost !== defaultHost ? effectiveHost : ""),
    logisticsUrl: String(note?.logisticsUrl || "").trim(),
    notes: String(note?.notes || "").trim(),
    availableStart: availability?.availableStart || "",
    availableEnd: availability?.availableEnd || "",
    preferredTeamSize: availability?.preferredTeamSize || "",
    otherBackgrounds: availability?.otherBackgrounds || "",
    teamNotesText: (availability?.teamNotes || []).join("\n"),
    siteType: availability?.siteType || "Partner site",
  };
}

/**
 * Unified editor for one site across logistics + availability boards.
 */
export default function SiteEditorModal({
  open,
  siteLabel,
  siteNotes = [],
  allSiteLabels = [],
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [noteId, setNoteId] = useState("");
  const [workbookNotes, setWorkbookNotes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");

  const builtIn = useMemo(() => isBuiltInSiteLabel(siteLabel), [siteLabel]);
  const defaultHostHint = useMemo(
    () => getDefaultSiteHostName(String(siteLabel || "").trim()) || "",
    [siteLabel]
  );
  const builtInMapUrl = useMemo(
    () => resolveSiteLogisticsUrl(String(siteLabel || "").trim()) || "",
    [siteLabel]
  );

  useEffect(() => {
    if (!open || !siteLabel) {
      setDraft(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const note = findSiteBudgetNoteForOption(siteLabel, siteNotes);
        const map = await listSiteAvailabilityEdits(AVAILABILITY_YEAR);
        const availability = map?.[siteLabel] || null;
        if (cancelled) return;
        setNoteId(note?.id || "");
        setWorkbookNotes(note?.workbookNotes || "");
        setEffectiveDate(note?.effectiveDate || "");
        setDraft(blankDraft(siteLabel, note, availability, siteNotes));
      } catch (e) {
        if (!cancelled) {
          showToast(e?.message || "Unable to load site details.");
          onClose?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, siteLabel, siteNotes, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !saving) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  function updateDraft(patch) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveAll() {
    if (!draft || saving) return;

    const nextName = normalizeSiteOptionLabel(draft.siteName);
    if (!nextName) {
      showToast("Enter a site name.", "error");
      return;
    }
    if (!isValidSiteOptionLabelFormat(nextName)) {
      showToast(
        'Use the same pattern as other sites: "Country - City" (spaces around the hyphen).',
        "error"
      );
      return;
    }

    const original = String(siteLabel || "").trim();
    let saveLabel = nextName;
    let renaming = nextName.toLowerCase() !== original.toLowerCase();

    if (renaming && builtIn) {
      showToast("Built-in site names can’t be renamed. Saving other fields…");
      saveLabel = original;
      renaming = false;
      updateDraft({ siteName: original });
    }

    if (renaming) {
      const taken = (allSiteLabels || []).some(
        (label) =>
          String(label || "").trim().toLowerCase() === nextName.toLowerCase() &&
          String(label || "").trim().toLowerCase() !== original.toLowerCase()
      );
      if (taken) {
        showToast("That site name is already listed.", "error");
        return;
      }
    }

    const availableStart = String(draft.availableStart || "").trim();
    const availableEnd = String(draft.availableEnd || "").trim();
    const hasStart = Boolean(availableStart);
    const hasEnd = Boolean(availableEnd);
    if (hasStart !== hasEnd) {
      showToast("Set both Available from and Available to, or leave both empty.", "error");
      return;
    }

    setSaving(true);
    try {
      const hostName = String(draft.hostName || "").trim();
      const logisticsUrl = String(draft.logisticsUrl || "").trim();
      const notes = String(draft.notes || "").trim();

      let savedNote;
      if (noteId) {
        savedNote = await updateSiteBudgetNote(noteId, {
          siteName: saveLabel,
          notes,
          workbookNotes,
          logisticsUrl: logisticsUrl || null,
          hostName: hostName || null,
          effectiveDate: effectiveDate || null,
        });
      } else {
        savedNote = await upsertSiteBudgetNote({
          siteName: saveLabel,
          notes,
          workbookNotes: workbookNotes || "",
          logisticsUrl: logisticsUrl || null,
          hostName: hostName || null,
          effectiveDate: effectiveDate || null,
        });
      }

      if (renaming) {
        await renameSiteAvailabilityEdit(original, saveLabel, AVAILABILITY_YEAR);
        try {
          await renameSiteInAvailabilityGridPrefs(AVAILABILITY_YEAR, original, saveLabel);
        } catch {
          /* prefs optional */
        }
      }

      if (hasStart && hasEnd) {
        await saveSiteAvailabilityEdit(saveLabel, AVAILABILITY_YEAR, {
          availableStart,
          availableEnd,
          siteType: draft.siteType || "Partner site",
          churchName: saveLabel,
          preferredTeamSize: String(draft.preferredTeamSize || "").trim(),
          otherBackgrounds: String(draft.otherBackgrounds || "").trim(),
          teamNotes: String(draft.teamNotesText || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        });
      }

      showToast(`Saved ${saveLabel}`);
      onSaved?.({
        previousLabel: original,
        siteLabel: saveLabel,
        note: savedNote,
        renamed: renaming,
      });
      onClose?.();
    } catch (e) {
      showToast(e?.message || "Unable to save site.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
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
      aria-labelledby="site-editor-title"
      onClick={() => !saving && onClose?.()}
    >
      <div
        className="card pad"
        style={{
          width: "min(640px, 100%)",
          maxHeight: "min(90vh, 900px)",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 id="site-editor-title" style={{ margin: 0, fontSize: 18 }}>
              Edit site
            </h2>
            <p className="small" style={{ margin: "4px 0 0", color: "var(--muted)" }}>
              Logistics, notes, and {AVAILABILITY_YEAR} availability in one place.
            </p>
          </div>
          <button type="button" className="btn" disabled={saving} onClick={() => onClose?.()}>
            Close
          </button>
        </div>

        {loading || !draft ? (
          <div className="small" style={{ color: "var(--muted)" }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <section>
              <div className="sitesAvailabilityEditSectionTitle">Site</div>
              <label className="sitesAvailabilityEditField" style={{ marginTop: 8 }}>
                <span>Site name</span>
                <input
                  className="input"
                  value={draft.siteName}
                  onChange={(e) => updateDraft({ siteName: e.target.value })}
                  disabled={saving || builtIn}
                  placeholder='Country - City'
                />
              </label>
              {builtIn ? (
                <div className="small" style={{ marginTop: 6, color: "var(--muted)" }}>
                  Built-in site names can’t be renamed.
                </div>
              ) : null}
            </section>

            <section>
              <div className="sitesAvailabilityEditSectionTitle">Logistics</div>
              <div className="sitesAvailabilityEditGrid" style={{ marginTop: 8 }}>
                <label className="sitesAvailabilityEditField">
                  <span>Host name</span>
                  <input
                    className="input"
                    value={draft.hostName}
                    onChange={(e) => updateDraft({ hostName: e.target.value })}
                    disabled={saving}
                    placeholder={
                      defaultHostHint ? `Default: ${defaultHostHint}` : "Host name (optional)"
                    }
                  />
                </label>
                <label className="sitesAvailabilityEditField">
                  <span>Logistics map URL</span>
                  <input
                    className="input"
                    type="url"
                    value={draft.logisticsUrl}
                    onChange={(e) => updateDraft({ logisticsUrl: e.target.value })}
                    disabled={saving}
                    placeholder="https://…"
                  />
                </label>
              </div>
              {builtInMapUrl && !String(draft.logisticsUrl || "").trim() ? (
                <a
                  className="sitesLogisticsOpenLink small"
                  href={builtInMapUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ display: "inline-block", marginTop: 8 }}
                >
                  Open built-in map ↗
                </a>
              ) : null}
              <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                <span>Notes</span>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.notes}
                  onChange={(e) => updateDraft({ notes: e.target.value })}
                  disabled={saving}
                  placeholder="Costs, contacts, utilities, shuttles, etc."
                />
              </label>
            </section>

            <section>
              <div className="sitesAvailabilityEditSectionTitle">
                Availability · {AVAILABILITY_YEAR}
              </div>
              <div className="sitesAvailabilityEditGrid" style={{ marginTop: 8 }}>
                <label className="sitesAvailabilityEditField">
                  <span>Available from</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.availableStart}
                    onChange={(e) => updateDraft({ availableStart: e.target.value })}
                    disabled={saving}
                  />
                </label>
                <label className="sitesAvailabilityEditField">
                  <span>Available to</span>
                  <input
                    className="input"
                    type="date"
                    value={draft.availableEnd}
                    onChange={(e) => updateDraft({ availableEnd: e.target.value })}
                    disabled={saving}
                  />
                </label>
              </div>
              <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                <span>Preferred team size</span>
                <input
                  className="input"
                  value={draft.preferredTeamSize}
                  onChange={(e) => updateDraft({ preferredTeamSize: e.target.value })}
                  disabled={saving}
                  placeholder="e.g. 2–4"
                />
              </label>
              <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                <span>Will take teams from other church backgrounds</span>
                <textarea
                  className="input"
                  rows={2}
                  value={draft.otherBackgrounds}
                  onChange={(e) => updateDraft({ otherBackgrounds: e.target.value })}
                  disabled={saving}
                  placeholder="Yes / No / notes…"
                />
              </label>
              <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                <span>Availability notes (one per line)</span>
                <textarea
                  className="input"
                  rows={4}
                  value={draft.teamNotesText}
                  onChange={(e) => updateDraft({ teamNotesText: e.target.value })}
                  disabled={saving}
                  placeholder="Hosting notes…"
                />
              </label>
            </section>

            <div className="row" style={{ gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="btn" disabled={saving} onClick={() => onClose?.()}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btnPrimary"
                disabled={saving}
                onClick={() => void saveAll()}
              >
                {saving ? "Saving…" : "Save site"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
import {
  WORKBOOK_REFERENCE_COLUMNS,
  workbookNameToCanonicalKey,
} from "@/lib/workbookCatalog";
import {
  mergeSiteWorkbookNotesWithDraft,
  parseAnyWorkbookInventoryString,
} from "@/lib/workbookInventory";

const AVAILABILITY_YEAR = 2027;
const WORKBOOK_COLUMNS = WORKBOOK_REFERENCE_COLUMNS;

function isBuiltInSiteLabel(label) {
  const lower = String(label || "")
    .trim()
    .toLowerCase();
  if (!lower) return false;
  return SITE_OPTIONS.some((opt) => opt.toLowerCase() === lower);
}

function qtyDraftFromWorkbookNotes(raw) {
  const next = {};
  for (const col of WORKBOOK_COLUMNS) next[col.key] = "";
  for (const { name, qty } of parseAnyWorkbookInventoryString(raw)) {
    const key = workbookNameToCanonicalKey(name);
    if (!key || !(key in next)) continue;
    const n = Number(qty);
    if (!Number.isFinite(n) || n < 0) continue;
    next[key] = String(n);
  }
  return next;
}

function blankDraft(siteLabel, note, availability, siteNotes) {
  const label = String(siteLabel || "").trim();
  const defaultHost = getDefaultSiteHostName(label) || "";
  const effectiveHost = label ? resolveEffectiveSiteHostName(label, siteNotes) || "" : "";
  return {
    siteName: label,
    hostName:
      String(note?.hostName || "").trim() ||
      (effectiveHost && effectiveHost !== defaultHost ? effectiveHost : ""),
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
 * Unified editor for one site across logistics, workbooks, and availability.
 * mode: "edit" | "create"
 */
export default function SiteEditorModal({
  open,
  mode = "edit",
  siteLabel = "",
  siteNotes = [],
  allSiteLabels = [],
  onClose,
  onSaved,
}) {
  const isCreate = mode === "create";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [noteId, setNoteId] = useState("");
  const [existingWorkbookNotes, setExistingWorkbookNotes] = useState("");
  const [workbookQtyDraft, setWorkbookQtyDraft] = useState({});
  const [effectiveDate, setEffectiveDate] = useState("");

  const builtIn = useMemo(
    () => !isCreate && isBuiltInSiteLabel(siteLabel),
    [isCreate, siteLabel]
  );
  const defaultHostHint = useMemo(
    () => getDefaultSiteHostName(String(siteLabel || draft?.siteName || "").trim()) || "",
    [siteLabel, draft?.siteName]
  );
  const builtInMapUrl = useMemo(
    () => resolveSiteLogisticsUrl(String(siteLabel || draft?.siteName || "").trim()) || "",
    [siteLabel, draft?.siteName]
  );

  useEffect(() => {
    if (!open) {
      setDraft(null);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (isCreate) {
          if (cancelled) return;
          setNoteId("");
          setExistingWorkbookNotes("");
          setEffectiveDate("");
          setWorkbookQtyDraft(qtyDraftFromWorkbookNotes(""));
          setDraft(blankDraft("", null, null, []));
          return;
        }

        const note = findSiteBudgetNoteForOption(siteLabel, siteNotes);
        const map = await listSiteAvailabilityEdits(AVAILABILITY_YEAR);
        const availability = map?.[siteLabel] || null;
        if (cancelled) return;
        setNoteId(note?.id || "");
        setExistingWorkbookNotes(note?.workbookNotes || "");
        setEffectiveDate(note?.effectiveDate || "");
        setWorkbookQtyDraft(qtyDraftFromWorkbookNotes(note?.workbookNotes || ""));
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
  }, [open, isCreate, siteLabel, siteNotes, onClose]);

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

    const original = isCreate ? "" : String(siteLabel || "").trim();
    let saveLabel = nextName;
    let renaming = !isCreate && nextName.toLowerCase() !== original.toLowerCase();

    if (renaming && builtIn) {
      showToast("Built-in site names can’t be renamed. Saving other fields…");
      saveLabel = original;
      renaming = false;
      updateDraft({ siteName: original });
    }

    const nameTaken = (allSiteLabels || []).some((label) => {
      const lower = String(label || "")
        .trim()
        .toLowerCase();
      if (!lower) return false;
      if (isCreate) return lower === nextName.toLowerCase();
      return lower === nextName.toLowerCase() && lower !== original.toLowerCase();
    });
    if (nameTaken) {
      showToast("That site name is already listed.", "error");
      return;
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
      const workbookNotesStr = mergeSiteWorkbookNotesWithDraft(
        existingWorkbookNotes,
        WORKBOOK_COLUMNS,
        workbookQtyDraft
      );

      let savedNote;
      if (noteId && !isCreate) {
        savedNote = await updateSiteBudgetNote(noteId, {
          siteName: saveLabel,
          notes,
          workbookNotes: workbookNotesStr,
          logisticsUrl: logisticsUrl || null,
          hostName: hostName || null,
          effectiveDate: effectiveDate || null,
          setWorkbookNotesUpdatedAt: true,
        });
      } else {
        savedNote = await upsertSiteBudgetNote({
          siteName: saveLabel,
          notes,
          workbookNotes: workbookNotesStr,
          logisticsUrl: logisticsUrl || null,
          hostName: hostName || null,
          effectiveDate: effectiveDate || null,
          setWorkbookNotesUpdatedAt: true,
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

      showToast(isCreate ? `Added site ${saveLabel}` : `Saved ${saveLabel}`);
      onSaved?.({
        previousLabel: original,
        siteLabel: saveLabel,
        note: savedNote,
        renamed: renaming,
        created: isCreate,
      });
      onClose?.();
    } catch (e) {
      showToast(e?.message || "Unable to save site.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const headerName = String(draft?.siteName || siteLabel || "").trim();

  return (
    <div
      className="appModalOverlay siteEditorOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-editor-title"
      onClick={() => !saving && onClose?.()}
    >
      <div className="card siteEditorModal" onClick={(e) => e.stopPropagation()}>
        <header className="siteEditorModalHeader">
          <div className="siteEditorModalHeaderText">
            <div className="cardSectionPill" style={{ marginBottom: 8 }}>
              {isCreate ? "New site" : "Site details"}
            </div>
            <h2 id="site-editor-title" className="siteEditorModalTitle">
              {isCreate ? "Add site" : headerName || "Edit site"}
            </h2>
            <p className="siteEditorModalSubtitle">
              Logistics, workbooks, and {AVAILABILITY_YEAR} availability — saved across all Sites
              tabs.
            </p>
          </div>
          <button
            type="button"
            className="btn siteEditorModalClose"
            disabled={saving}
            onClick={() => onClose?.()}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="siteEditorModalBody">
          {loading || !draft ? (
            <div className="siteEditorModalLoading">Loading…</div>
          ) : (
            <div className="siteEditorModalSections">
              <section className="siteEditorSection">
                <div className="siteEditorSectionHead">
                  <h3 className="siteEditorSectionTitle">Site</h3>
                  <p className="siteEditorSectionHint">
                    {builtIn
                      ? "Built-in partner site names can’t be renamed."
                      : "Use Country - City (spaces around the hyphen)."}
                  </p>
                </div>
                <label className="sitesAvailabilityEditField">
                  <span>Site name</span>
                  <input
                    className="input"
                    value={draft.siteName}
                    onChange={(e) => updateDraft({ siteName: e.target.value })}
                    disabled={saving || builtIn}
                    placeholder="e.g. Brazil - Joao Pessoa"
                  />
                </label>
              </section>

              <section className="siteEditorSection">
                <div className="siteEditorSectionHead">
                  <h3 className="siteEditorSectionTitle">Logistics</h3>
                  <p className="siteEditorSectionHint">Host contact, map link, and site notes.</p>
                </div>
                <div className="sitesAvailabilityEditGrid">
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
                    style={{ display: "inline-block", marginTop: 10 }}
                  >
                    Open built-in map ↗
                  </a>
                ) : null}
                <label className="sitesAvailabilityEditField" style={{ marginTop: 12 }}>
                  <span>Notes</span>
                  <textarea
                    className="input"
                    rows={3}
                    value={draft.notes}
                    onChange={(e) => updateDraft({ notes: e.target.value })}
                    disabled={saving}
                    placeholder="Costs, contacts, utilities, shuttles, etc."
                  />
                </label>
              </section>

              <section className="siteEditorSection">
                <div className="siteEditorSectionHead">
                  <h3 className="siteEditorSectionTitle">Workbooks</h3>
                  <p className="siteEditorSectionHint">Inventory counts on hand at this site.</p>
                </div>
                <div className="sitesEditorWorkbookGrid">
                  {WORKBOOK_COLUMNS.map((col) => (
                    <label key={col.key} className="sitesAvailabilityEditField siteEditorWorkbookField">
                      <span>{col.label}</span>
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
                        disabled={saving}
                        placeholder="—"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="siteEditorSection">
                <div className="siteEditorSectionHead">
                  <h3 className="siteEditorSectionTitle">Availability · {AVAILABILITY_YEAR}</h3>
                  <p className="siteEditorSectionHint">
                    Season dates and hosting preferences for this site.
                  </p>
                </div>
                <div className="sitesAvailabilityEditGrid">
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
                    rows={3}
                    value={draft.teamNotesText}
                    onChange={(e) => updateDraft({ teamNotesText: e.target.value })}
                    disabled={saving}
                    placeholder="Hosting notes…"
                  />
                </label>
              </section>
            </div>
          )}
        </div>

        <footer className="siteEditorModalFooter">
          <button type="button" className="btn" disabled={saving} onClick={() => onClose?.()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btnPrimary"
            disabled={saving || loading || !draft}
            onClick={() => void saveAll()}
          >
            {saving ? "Saving…" : isCreate ? "Add site" : "Save site"}
          </button>
        </footer>
      </div>
    </div>
  );
}

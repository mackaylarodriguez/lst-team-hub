import { Fragment } from "react";
import Link from "next/link";
import { useTripPage } from "../TripPageContext";
import ExpandableCollapsibleSection from "@/components/CollapsibleSection";
import {
  DOCUMENT_CATEGORY_OPTIONS,
  getSmartsheetBudgetTutorialCards,
} from "@/lib/tripDocumentSlots";
import {
  listEffectiveTutorials,
  preferredTripResourceOpenUrl,
  tripDocumentTileRootClassName,
  siteLinkActionButtonStyle,
  tripDocDeleteButtonStyle,
  tripDocumentWideCardStyle,
} from "../tripPageShared";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripDocumentsTab() {
    const {
    addingLinkForSlotKey,
    canManageTripDocuments,
    docDraft,
    docsError,
    editingDocId,
    effectiveSiteInfoDoc,
    handleAddLink,
    handleCancelEditDoc,
    handleCancelPendingPdf,
    handleDeleteRequiredSlotResource,
    handleEditDoc,
    handlePrepareNewPdf,
    handlePrepareRequiredLink,
    handleReplaceDocumentFile,
    handleSaveDoc,
    handleSaveHousingTripDocs,
    handleSavePendingPdf,
    hasDismissedDefaultTripDocumentSlots,
    housingTripDocsDraft,
    housingTripDocsSaveStatus,
    isAddingLink,
    optionalTripWideCardProps,
    participants,
    pdfUrl,
    pendingPdfDraft,
    renderTripDocumentsLinkDraftForm,
    resourceKey,
    restoreDismissedDefaultTripDocuments,
    runTripDocsUndoAction,
    setDocDraft,
    setHousingTripDocsDraft,
    setHousingTripDocsSaveStatus,
    setPendingPdfDraft,
    siteInfoDoc,
    staffViewAllParticipants,
    tab,
    trip,
    tripDocsUndoBanner,
    tripDocumentCategorySections,
    tripDocumentWorkerOptions,
    tripHousingDocuments,
    tripHousingLinkUrl,
    tripHousingPdfUrl,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              {tripDocsUndoBanner ? (
                <div className="tripDocumentsUndoBanner">
                  <span>{tripDocsUndoBanner.message}</span>
                  <button type="button" className="btn btnPrimary" onClick={() => void runTripDocsUndoAction()}>
                    Undo
                  </button>
                </div>
              ) : null}
              {(() => {
                const smartsheetTutorialCards = getSmartsheetBudgetTutorialCards();
                if (!smartsheetTutorialCards.length) return null;
                return (
                  <ExpandableCollapsibleSection
                    title="Smartsheet tutorials"
                    subtitle="Budget tracking and project record journal — from your trip setup."
                    defaultOpen
                    persistOpenKey="lst-hub-trip-docs-smartsheet-tutorials"
                  >
                    <div className="tripDocumentsTileGrid">
                      {smartsheetTutorialCards.map((t) => (
                        <div
                          key={t.key}
                          className="card tripDocumentSquareTile tripDocumentTutorialTile"
                        >
                          <div className="tripDocumentSquareTileScroll">
                            <div className="tripDocumentSquareTileTitle">{t.title}</div>
                            {t.description ? (
                              <div className="tripDocumentSquareTileMeta">{t.description}</div>
                            ) : null}
                          </div>
                            <div className="tripDocumentSquareTileFoot">
                              <a className="btn btnPrimary" href={t.url} target="_blank" rel="noreferrer">
                                Watch
                              </a>
                            </div>
                        </div>
                      ))}
                    </div>
                  </ExpandableCollapsibleSection>
                );
              })()}
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  className="row mobileSectionHeader"
                  style={{
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="tripDocumentsPageSectionPill" style={{ marginBottom: 0 }}>
                    Documents & links
                  </div>
                  {canManageTripDocuments ? (
                    <div
                      className="row mobileSectionHeaderActions"
                      style={{
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button className="btn" type="button" onClick={handleAddLink}>
                        Add Link
                      </button>
                      <button className="btn" type="button" onClick={handlePrepareNewPdf}>
                        Upload File
                      </button>
                      {(() => {
                        const hasSite =
                          effectiveSiteInfoDoc &&
                          (String(effectiveSiteInfoDoc.link || "").trim() ||
                            String(effectiveSiteInfoDoc.pdfUrl || "").trim());
                        return !hasSite ? (
                          <button
                            type="button"
                            className="btn"
                            onClick={() =>
                              handlePrepareRequiredLink({
                                key: "site-info-link",
                                title: "Site Logistics",
                                category: "Site",
                                kind: "link",
                                description: "Standard site logistics link for this trip.",
                                resource: effectiveSiteInfoDoc,
                              })
                            }
                          >
                            Add site logistics
                          </button>
                        ) : null;
                      })()}
                    </div>
                  ) : null}
                </div>
                {!canManageTripDocuments ? (
                  <div className="small" style={{ marginBottom: 0, opacity: 0.88 }}>
                    Documents your leader or staff share appear here.
                  </div>
                ) : null}
    
                {docsError && (
                  <div className="small" style={{ color: "var(--danger)", marginBottom: 0 }}>
                    {docsError}
                  </div>
                )}
    
                {canManageTripDocuments && isAddingLink
                  ? renderTripDocumentsLinkDraftForm({ embedded: false })
                  : null}
    
                {canManageTripDocuments && pendingPdfDraft && (
                  <div
                    className="card pad"
                    style={{
                      boxShadow: "none",
                      marginBottom: 0,
                      background: "rgba(255,255,255,.78)",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>
                      {pendingPdfDraft.resourceKey ? "Required PDF" : "New PDF"}
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      <input
                        className="input"
                        value={pendingPdfDraft.title}
                        onChange={(e) =>
                          setPendingPdfDraft((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Document title"
                      />
                      <select
                        className="input"
                        value={pendingPdfDraft.category}
                        onChange={(e) =>
                          setPendingPdfDraft((prev) => ({ ...prev, category: e.target.value }))
                        }
                      >
                        {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                          ))}
                        </select>
                      <select
                        className="input"
                        value={pendingPdfDraft.workerName || ""}
                        onChange={(e) =>
                          setPendingPdfDraft((prev) => ({ ...prev, workerName: e.target.value }))
                        }
                      >
                        <option value="">No worker label</option>
                        {tripDocumentWorkerOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        value={pendingPdfDraft.workArea}
                        onChange={(e) =>
                          setPendingPdfDraft((prev) => ({ ...prev, workArea: e.target.value }))
                        }
                        placeholder="Notes / context"
                      />
                      <input
                        type="file"
                        onChange={(e) =>
                          setPendingPdfDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))
                        }
                      />
                      <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={pendingPdfDraft.visibleToParticipants !== false}
                          onChange={(e) =>
                            setPendingPdfDraft((prev) => ({
                              ...prev,
                              visibleToParticipants: e.target.checked,
                            }))
                          }
                        />
                        Visible to participants
                      </label>
                      <div className="small">
                        File: {pendingPdfDraft.file?.name || "Choose a file to upload"}
                      </div>
                      <div className="row">
                        <button
                          className="btn btnPrimary"
                          type="button"
                          onClick={handleSavePendingPdf}
                          disabled={!pendingPdfDraft.file}
                        >
                          Upload PDF
                        </button>
                        <button className="btn" type="button" onClick={handleCancelPendingPdf}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
    
              </div>
    
              <div className="card pad">
                {tripDocumentCategorySections.length === 0 ? (
                  <div className="small tripDocumentsTileGridFullRow" style={{ marginBottom: 8 }}>
                    {canManageTripDocuments
                      ? "No documents yet. Use Add Link, Upload File, or Add site logistics above."
                      : "No documents yet."}
                  </div>
                ) : null}
    
                {tripDocumentCategorySections.map((section) => (
                  <Fragment key={`trip-doc-cat-${section.category}`}>
                    <div className="tripDocumentsCategoryPill">{section.category}</div>
                    <div className="tripDocumentsTileGrid" style={{ marginBottom: 22 }}>
                      {section.entries.map((entry) => {
                        if (entry.kind === "doc") {
                          return (
                            <OptionalTripWideDocumentCard
                              key={entry.doc.id}
                              d={entry.doc}
                              {...optionalTripWideCardProps}
                            />
                          );
                        }
    
                        if (entry.kind === "site") {
                          const siteDoc = entry.doc;
                          const siteSlotStub = {
                            key: "site-info-link",
                            title: "Site Logistics",
                            category: "Site",
                            kind: "link",
                            description: "Standard site logistics link for this trip.",
                            resource: siteDoc,
                          };
                          const siteEditing = siteInfoDoc && editingDocId === siteInfoDoc.id;
                          const siteTileWide = Boolean(
                            siteEditing ||
                              (canManageTripDocuments &&
                                isAddingLink &&
                                addingLinkForSlotKey === "site-info-link")
                          );
                          const siteHasOpen = !!(siteDoc?.link || siteDoc?.pdfUrl);
                          const siteCardMain = (
                            <>
                              <div className="row" style={{ alignItems: "flex-start" }}>
                                <div style={{ flex: 1 }}>
                                  <div
                                    className={siteTileWide ? undefined : "tripDocumentSquareTileTitle"}
                                    style={siteTileWide ? { fontWeight: 900 } : undefined}
                                  >
                                    Site Logistics
                                  </div>
                                  <div
                                    className={siteTileWide ? "small" : "small tripDocumentSquareTileMeta"}
                                    style={siteTileWide ? { marginTop: 4 } : { marginTop: 2 }}
                                  >
                                    Assigned site: {trip?.location || "No site selected yet"}
                                  </div>
                                </div>
                                {siteHasOpen ? (
                                  <span className="badge badgeSuccess">
                                    {siteDoc?.isAutoGenerated ? "Auto" : "OK"}
                                  </span>
                                ) : null}
                              </div>
                              {siteHasOpen ? (
                                <div
                                  className="row"
                                  style={{ marginTop: siteTileWide ? 10 : 6, flexWrap: "wrap", gap: 8 }}
                                >
                                  <a
                                    className="btn btnPrimary"
                                    href={preferredTripResourceOpenUrl(siteDoc)}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={siteTileWide ? siteLinkActionButtonStyle : undefined}
                                  >
                                    Open
                                  </a>
                                  {canManageTripDocuments && siteInfoDoc ? (
                                    <button
                                      className="btn"
                                      type="button"
                                      style={siteTileWide ? siteLinkActionButtonStyle : undefined}
                                      onClick={() => handleEditDoc(siteInfoDoc)}
                                    >
                                      Edit
                                    </button>
                                  ) : canManageTripDocuments ? (
                                    <button
                                      className="btn"
                                      type="button"
                                      style={siteTileWide ? siteLinkActionButtonStyle : undefined}
                                      onClick={() =>
                                        handlePrepareRequiredLink({
                                          key: "site-info-link",
                                          title: "Site Logistics",
                                          category: "Site",
                                          resource: siteDoc,
                                        })
                                      }
                                    >
                                      Edit
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          );
                          return (
                            <div
                              key="trip-site-logistics"
                              className={tripDocumentTileRootClassName(siteTileWide)}
                              style={siteTileWide ? tripDocumentWideCardStyle : undefined}
                            >
                              {siteTileWide ? (
                                siteCardMain
                              ) : (
                                <div className="tripDocumentSquareTileScroll">{siteCardMain}</div>
                              )}
                              {canManageTripDocuments && siteInfoDoc && siteEditing ? (
                                <div
                                  className={siteTileWide ? undefined : "tripDocumentSquareTileFoot"}
                                  style={
                                    siteTileWide
                                      ? {
                                          marginTop: "auto",
                                          paddingTop: 12,
                                          display: "flex",
                                          justifyContent: "flex-end",
                                        }
                                      : undefined
                                  }
                                >
                                  <button
                                    type="button"
                                    className="btn"
                                    style={tripDocDeleteButtonStyle}
                                    onClick={() => void handleDeleteRequiredSlotResource(siteSlotStub)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        }
    
                        const slot = entry.slot;
                        const doc = entry.doc;
                        const available = !!(doc?.pdfUrl || doc?.link);
                        const isEditing = doc?.id && editingDocId === doc.id;
                        const isPdf = !!doc?.pdfUrl || slot.kind === "pdf";
                        const isAutoGenerated = !!doc?.isAutoGenerated;
                        const isHousingSlot = slot.key === "housing-accommodation-link";
                        const showHousingInlineForm =
                          isHousingSlot && staffViewAllParticipants && housingTripDocsDraft;
    
                        const slotTileWide =
                          isEditing ||
                          showHousingInlineForm ||
                          (isHousingSlot && tripHousingDocuments.length > 1);
    
                        const slotCardInner = (
                          <>
                            <div className="row" style={{ alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                {showHousingInlineForm ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ fontWeight: 900 }}>Edit team housing</div>
                                    <div className="small">
                                      Saves to the same trip budget row as Budget → Housing; this page refreshes when you open Trip Documents or return to the tab.
                                    </div>
                                    <input
                                      className="input"
                                      value={housingTripDocsDraft.housingLink}
                                      onChange={(e) =>
                                        setHousingTripDocsDraft((prev) =>
                                          prev ? { ...prev, housingLink: e.target.value } : prev
                                        )
                                      }
                                      placeholder="https://..."
                                    />
                                    <input
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      onChange={(e) =>
                                        setHousingTripDocsDraft((prev) =>
                                          prev
                                            ? { ...prev, file: e.target.files?.[0] || null }
                                            : prev
                                        )
                                      }
                                    />
                                    {housingTripDocsDraft.pdfUrlKeep ? (
                                      <label
                                        className="small"
                                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={housingTripDocsDraft.clearPdf}
                                          onChange={(e) =>
                                            setHousingTripDocsDraft((prev) =>
                                              prev ? { ...prev, clearPdf: e.target.checked } : prev
                                            )
                                          }
                                        />
                                        Remove current PDF
                                      </label>
                                    ) : null}
                                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                      <button
                                        className="btn btnPrimary"
                                        type="button"
                                        onClick={() => void handleSaveHousingTripDocs()}
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="btn"
                                        type="button"
                                        onClick={() => {
                                          setHousingTripDocsDraft(null);
                                          setHousingTripDocsSaveStatus("");
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    {housingTripDocsSaveStatus ? (
                                      <div className="small">{housingTripDocsSaveStatus}</div>
                                    ) : null}
                                  </div>
                                ) : canManageTripDocuments && doc && isEditing ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <input
                                      className="input"
                                      value={docDraft?.title || ""}
                                      onChange={(e) =>
                                        setDocDraft((prev) => ({ ...prev, title: e.target.value }))
                                      }
                                      placeholder="Title"
                                    />
                                    <input
                                      className="input"
                                      value={docDraft?.link || ""}
                                      onChange={(e) =>
                                        setDocDraft((prev) => ({ ...prev, link: e.target.value }))
                                      }
                                      placeholder="https://..."
                                      disabled={!!docDraft?.pdfUrl}
                                    />
                                    <select
                                      className="input"
                                      value={docDraft?.category || "Other"}
                                      onChange={(e) =>
                                        setDocDraft((prev) => ({ ...prev, category: e.target.value }))
                                      }
                                    >
                                      {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                                        <option key={category} value={category}>
                                          {category}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      className="input"
                                      value={docDraft?.workArea || ""}
                                      onChange={(e) =>
                                        setDocDraft((prev) => ({ ...prev, workArea: e.target.value }))
                                      }
                                      placeholder="Notes / work area"
                                    />
                                    <label
                                      className="small"
                                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={docDraft?.visibleToParticipants !== false}
                                        onChange={(e) =>
                                          setDocDraft((prev) => ({
                                            ...prev,
                                            visibleToParticipants: e.target.checked,
                                          }))
                                        }
                                      />
                                      Visible to participants
                                    </label>
                                    {!!docDraft?.pdfUrl && (
                                      <input type="file" onChange={handleReplaceDocumentFile} />
                                    )}
                                    <div className="row">
                                      <button className="btn btnPrimary" type="button" onClick={handleSaveDoc}>
                                        Save
                                      </button>
                                      <button className="btn" type="button" onClick={handleCancelEditDoc}>
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="btn"
                                        style={tripDocDeleteButtonStyle}
                                        onClick={() => void handleDeleteRequiredSlotResource(slot)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div
                                      className={slotTileWide ? undefined : "tripDocumentSquareTileTitle"}
                                      style={{ fontWeight: 900 }}
                                    >
                                      {slot.key === "smartsheet-budget"
                                        ? slot.title
                                        : doc?.title || slot.title}
                                    </div>
                                    <div
                                      className={slotTileWide ? "small" : "small tripDocumentSquareTileMeta"}
                                      style={{ marginTop: 4 }}
                                    >
                                      {slot.category} • {slot.description}
                                    </div>
                                    {isAutoGenerated ? (
                                      slot.key === "housing-accommodation-link" &&
                                      tripHousingDocuments.length <= 1 ? null : (
                                        <div className="small" style={{ marginTop: 4 }}>
                                          {slot.key === "housing-accommodation-link"
                                            ? "Main housing row plus additional slots from Budget. Staff can edit link/PDF here or on the Budget page."
                                            : `Auto-added from assigned site: ${trip?.location || "Site"}`}
                                        </div>
                                      )
                                    ) : doc?.createdAt ? (
                                      <div className="small" style={{ marginTop: 4 }}>
                                        Updated {new Date(doc.createdAt).toLocaleDateString()}
                                      </div>
                                    ) : null}
                                    {canManageTripDocuments && available ? (
                                      <div className="small" style={{ marginTop: 4 }}>
                                        {doc?.visibleToParticipants === false
                                          ? "Hidden from participants"
                                          : "Visible to participants"}
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </div>
                              {available ? (
                                <span className="badge badgeSuccess">
                                  {isAutoGenerated
                                    ? slotTileWide
                                      ? "Auto Link"
                                      : "Auto"
                                    : isPdf
                                      ? slotTileWide
                                        ? "PDF Ready"
                                        : "PDF"
                                      : slotTileWide
                                        ? "Link Ready"
                                        : "Link"}
                                </span>
                              ) : null}
                            </div>
                            {showHousingInlineForm ? null : (
                              <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                                {available ? (
                                  slot.key === "housing-accommodation-link" &&
                                  isAutoGenerated &&
                                  tripHousingDocuments.length > 0 ? (
                                    <>
                                      {tripHousingDocuments.map((h, i) => {
                                        const pdf = String(h.pdfUrl || "").trim();
                                        const rawLink = String(h.link || "").trim();
                                        const linkHref = rawLink
                                          ? /^https?:\/\//i.test(rawLink)
                                            ? rawLink
                                            : `https://${rawLink}`
                                          : "";
                                        const href = pdf || linkHref;
                                        if (!href) return null;
                                        const labelPart =
                                          tripHousingDocuments.length > 1
                                            ? h.label || (i === 0 ? "" : `Extra ${i}`)
                                            : "";
                                        return (
                                          <a
                                            key={`housing-doc-open-${i}-${href}`}
                                            className={i === 0 ? "btn btnPrimary" : "btn"}
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Open{labelPart ? ` (${labelPart})` : ""}
                                          </a>
                                        );
                                      })}
                                    </>
                                  ) : (
                                    <a
                                      className="btn btnPrimary"
                                      href={doc.pdfUrl || doc.link}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open
                                    </a>
                                  )
                                ) : null}
                                {canManageTripDocuments && !isEditing && doc && !isAutoGenerated ? (
                                  <button className="btn" type="button" onClick={() => handleEditDoc(doc)}>
                                    Edit
                                  </button>
                                ) : null}
                                {canManageTripDocuments &&
                                !isEditing &&
                                doc &&
                                !isAutoGenerated &&
                                isHousingSlot &&
                                staffViewAllParticipants &&
                                !showHousingInlineForm ? (
                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      setHousingTripDocsDraft({
                                        housingLink: tripHousingLinkUrl || "",
                                        pdfUrlKeep: tripHousingPdfUrl || "",
                                        clearPdf: false,
                                        file: null,
                                      })
                                    }
                                  >
                                    Edit
                                  </button>
                                ) : null}
                                {canManageTripDocuments && (!doc || isAutoGenerated) ? (
                                  slot.key === "housing-accommodation-link" ? (
                                    staffViewAllParticipants ? (
                                      <button
                                        type="button"
                                        className="btn"
                                        onClick={() =>
                                          setHousingTripDocsDraft({
                                            housingLink: tripHousingLinkUrl || "",
                                            pdfUrlKeep: tripHousingPdfUrl || "",
                                            clearPdf: false,
                                            file: null,
                                          })
                                        }
                                      >
                                        Edit
                                      </button>
                                    ) : (
                                      <Link href="/budget" className="btn">
                                        Edit in Budget
                                      </Link>
                                    )
                                  ) : (
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() => handlePrepareRequiredLink(slot)}
                                    >
                                      {isAutoGenerated ? "Edit" : "Add Link"}
                                    </button>
                                  )
                                ) : null}
                              </div>
                            )}
                            {showHousingInlineForm
                              ? null
                              : (() => {
                                  if (slot.key === "smartsheet-budget") return null;
                                  const tutorials = listEffectiveTutorials(slot, doc);
                                  if (!tutorials.length) return null;
    
                                  return (
                                    <div
                                      style={{
                                        marginTop: 12,
                                        paddingTop: 12,
                                        borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                                        display: "grid",
                                        gap: 12,
                                      }}
                                    >
                                      {tutorials.map((tutorial, ti) => (
                                        <div
                                          key={`${slot.key}-tutorial-${ti}`}
                                          style={{ display: "grid", gap: 8 }}
                                        >
                                          <div className="small" style={{ fontWeight: 900 }}>
                                            Tutorial{ti > 0 ? ` ${ti + 1}` : ""}
                                          </div>
                                          <div className="small">
                                            {tutorial.tutorialDescription ||
                                              "Helpful walkthrough for this resource."}
                                          </div>
                                          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                            <a
                                              className="btn"
                                              href={tutorial.tutorialUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              Watch
                                            </a>
                                            {canManageTripDocuments && slot.kind === "link" && ti === 0 ? (
                                              <button
                                                className="btn"
                                                type="button"
                                                onClick={() =>
                                                  doc && !isAutoGenerated
                                                    ? handleEditDoc(doc)
                                                    : handlePrepareRequiredLink(slot)
                                                }
                                              >
                                                Edit Tutorial
                                              </button>
                                            ) : null}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                          </>
                        );
    
                        return (
                          <div
                            key={slot.key}
                            className={tripDocumentTileRootClassName(slotTileWide)}
                            style={slotTileWide ? tripDocumentWideCardStyle : undefined}
                          >
                            {slotTileWide ? (
                              slotCardInner
                            ) : (
                              <div className="tripDocumentSquareTileScroll">{slotCardInner}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Fragment>
                ))}
    
                {canManageTripDocuments && hasDismissedDefaultTripDocumentSlots ? (
                  <div className="small tripDocumentsTileGridFullRow" style={{ marginTop: 12, color: "var(--muted)" }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: "6px 14px", fontSize: 12 }}
                      onClick={() => void restoreDismissedDefaultTripDocuments()}
                    >
                      Restore dismissed document slots (budget, site, housing)
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
  );
}

import { useTripPage } from "../TripPageContext";
import {
  parseMaterialsPackingChecklist,
  preferredTripResourceOpenUrl,
} from "../tripPageShared";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
  MATERIALS_PACKING_CHECKLIST_ITEMS,
} from "../tripPageShared";

export default function TripMaterialsTab() {
    const {
    effectiveSiteInfoDoc,
    handleExportMaterialsExcel,
    handleMaterialsGlanceSave,
    handleSaveStaffTeamVisibleMaterials,
    handleSaveTeamLogisticsForTeamMember,
    handleToggleMaterialsPackingItem,
    isEditingMaterialsGlance,
    materialsBudgetWorkerCount,
    materialsDraft,
    materialsGlanceLabel,
    materialsGlanceMuted,
    materialsGlanceRow,
    materialsGlanceRowSending,
    materialsGlanceValue,
    materialsMetricCard,
    materialsMetricLabel,
    materialsMetricValue,
    materialsPanelBase,
    materialsRosterHeadcount,
    materialsRosterTshirtLines,
    materialsSaveStatus,
    materialsShippingState,
    materialsTeamWorkbookGlance,
    materialsWorkbookRemainingCopies,
    materialsWorkbookSentCopies,
    materialsWorkbookTargetCopies,
    materialsWorkerCountDelta,
    materialsWorkersDisplayCount,
    pdfUrl,
    revertMaterialsDraftFromBudgetRow,
    setBudgetCheckAmount,
    setBudgetCheckEditingId,
    setBudgetCheckModalOpen,
    setBudgetCheckNote,
    setIsEditingMaterialsGlance,
    setTeamLogisticsDraft,
    setTripBudgetCheckDeleteId,
    staffSiteWorkbookPlan,
    staffViewAllParticipants,
    tab,
    teamLogisticsDraft,
    teamLogisticsLoadError,
    teamLogisticsLoading,
    teamLogisticsSaveStatus,
    trip,
    tripBudgetCheckRequests,
    tripBudgetLoadError,
    tripSiteCanonicalLabel,
    workerDocumentParticipants,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              {!staffViewAllParticipants && teamLogisticsLoadError ? (
                <div className="card pad small" style={{ color: "var(--danger)" }}>
                  {teamLogisticsLoadError}
                </div>
              ) : null}
              {staffViewAllParticipants && tripBudgetLoadError ? (
                <div className="card pad small" style={{ color: "var(--danger)" }}>
                  {tripBudgetLoadError}
                </div>
              ) : null}
              {!staffViewAllParticipants && teamLogisticsLoading ? (
                <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Spinner size={32} />
                  <span className="small">Loading team logistics…</span>
                </div>
              ) : null}
              {staffViewAllParticipants && !materialsDraft ? (
                <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Spinner size={32} />
                  <span className="small">Loading housing budget…</span>
                </div>
              ) : null}
    
              {((staffViewAllParticipants && materialsDraft) || (!staffViewAllParticipants && teamLogisticsDraft))
                ? (() => {
                    const matTeamDraft = staffViewAllParticipants ? materialsDraft : teamLogisticsDraft;
                    const setMatTeamDraft = staffViewAllParticipants ? setMaterialsDraft : setTeamLogisticsDraft;
                    const teamMemberOnly = !staffViewAllParticipants;
                    const logisticsNameOpts = workerDocumentParticipants
                      .map((p) => String(p?.name || p?.email || "").trim())
                      .filter(Boolean);
                    const acctVal = String(matTeamDraft.teamAccountant || "").trim();
                    const recVal = String(matTeamDraft.teamRecorder || "").trim();
                    const acctInList = !acctVal || logisticsNameOpts.includes(acctVal);
                    const recInList = !recVal || logisticsNameOpts.includes(recVal);
                    const staffCardsReadOnly = teamMemberOnly;
                    return (
                      <div className="card pad tripTeamLogisticsPanel">
                        <div className="cardSectionPill" style={{ marginBottom: 2 }}>
                          Team logistics
                        </div>
    
                        <h3 className="tripTeamLogisticsSectionHeading">To be completed by team</h3>
                        <div className="tripTeamLogisticsGrid">
                          <div className="tripTeamLogisticsCard tripTeamLogisticsCardTeam">
                            <div>
                              <div className="tripTeamLogisticsFieldLabel">Team accountant</div>
                              <select
                                className="input tripTeamLogisticsFieldControl"
                                value={acctInList ? acctVal : "__other__"}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setMatTeamDraft((prev) => ({
                                    ...prev,
                                    teamAccountant: v === "__other__" ? acctVal : v,
                                  }));
                                }}
                              >
                                <option value="">— Select a worker —</option>
                                {!acctInList && acctVal ? (
                                  <option value="__other__">{`${acctVal} (not on roster)`}</option>
                                ) : null}
                                {logisticsNameOpts.map((name) => (
                                  <option key={`acct-${name}`} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div className="tripTeamLogisticsFieldLabel">Team recorder</div>
                              <select
                                className="input tripTeamLogisticsFieldControl"
                                value={recInList ? recVal : "__other_rec__"}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setMatTeamDraft((prev) => ({
                                    ...prev,
                                    teamRecorder: v === "__other_rec__" ? recVal : v,
                                  }));
                                }}
                              >
                                <option value="">— Select a worker —</option>
                                {!recInList && recVal ? (
                                  <option value="__other_rec__">{`${recVal} (not on roster)`}</option>
                                ) : null}
                                {logisticsNameOpts.map((name) => (
                                  <option key={`rec-${name}`} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
    
                          <div className="tripTeamLogisticsCard tripTeamLogisticsCardTeam">
                            <div>
                              <div className="tripTeamLogisticsFieldLabel">Shipping address</div>
                              <textarea
                                className="input tripTeamLogisticsFieldControl"
                                rows={3}
                                value={matTeamDraft.materialsShipAddress || ""}
                                onChange={(e) =>
                                  setMatTeamDraft((prev) => ({ ...prev, materialsShipAddress: e.target.value }))
                                }
                                placeholder="Street, city, state, ZIP"
                              />
                            </div>
                            <div>
                              <div className="tripTeamLogisticsFieldLabel">
                                Note (if different from application)
                              </div>
                              <p className="tripTeamLogisticsFieldHint">
                                Use this if the ship-to address or other details differ from your LST application.
                              </p>
                              <textarea
                                className="input tripTeamLogisticsFieldControl"
                                rows={2}
                                value={matTeamDraft.materialsShipAddressNote || ""}
                                onChange={(e) =>
                                  setMatTeamDraft((prev) => ({
                                    ...prev,
                                    materialsShipAddressNote: e.target.value,
                                  }))
                                }
                                placeholder="e.g. Ship to parents’ home; application lists school address."
                              />
                            </div>
                          </div>
                        </div>
    
                        <div className="tripTeamLogisticsDivider" aria-hidden="true" />
    
                        <h3 className="tripTeamLogisticsSectionHeading">To be completed by staff</h3>
                        <div className="tripTeamLogisticsGrid">
                          <div
                            className={
                              "tripTeamLogisticsCard tripTeamLogisticsCardStaff" +
                              (staffCardsReadOnly ? " isReadonly" : "")
                            }
                          >
                            <div className="tripTeamLogisticsFieldLabel">Shipping</div>
                            <p className="tripTeamLogisticsStatusLine">
                              Status:{" "}
                              <strong style={{ color: "var(--text)", fontWeight: 700 }}>
                                {materialsShippingState}
                              </strong>
                            </p>
                            <div>
                              <div className="tripTeamLogisticsFieldLabel">Shipping / tracking #</div>
                              {staffCardsReadOnly ? (
                                <div
                                  className={
                                    "tripTeamLogisticsReadonly tripTeamLogisticsReadonlyMono" +
                                    (String(matTeamDraft.materialsTrackingNumber || "").trim()
                                      ? ""
                                      : " isEmpty")
                                  }
                                >
                                  {String(matTeamDraft.materialsTrackingNumber || "").trim() ||
                                    "Staff will add tracking when the package ships."}
                                </div>
                              ) : (
                                <input
                                  className="input tripTeamLogisticsFieldControl"
                                  style={{ fontFamily: "ui-monospace, monospace" }}
                                  value={matTeamDraft.materialsTrackingNumber || ""}
                                  onChange={(e) =>
                                    setMatTeamDraft((prev) => ({
                                      ...prev,
                                      materialsTrackingNumber: e.target.value,
                                    }))
                                  }
                                  placeholder="Carrier tracking #"
                                />
                              )}
                            </div>
                          </div>
    
                          <div
                            className={
                              "tripTeamLogisticsCard tripTeamLogisticsCardStaff" +
                              (staffCardsReadOnly ? " isReadonly" : "")
                            }
                          >
                            <div className="tripTeamLogisticsFieldLabel">Notes from staff</div>
                            <p className="tripTeamLogisticsFieldHint">
                              Coordinators post updates here; everyone on this tab can read them.
                            </p>
                            {staffCardsReadOnly ? (
                              <div
                                className={
                                  "tripTeamLogisticsReadonly" +
                                  (String(matTeamDraft.materialsNotesForTeam || "").trim() ? "" : " isEmpty")
                                }
                                style={{ minHeight: 80 }}
                              >
                                {String(matTeamDraft.materialsNotesForTeam || "").trim() || "No notes yet."}
                              </div>
                            ) : (
                              <textarea
                                className="input tripTeamLogisticsFieldControl"
                                rows={5}
                                style={{ minHeight: 100 }}
                                value={matTeamDraft.materialsNotesForTeam || ""}
                                onChange={(e) =>
                                  setMatTeamDraft((prev) => ({
                                    ...prev,
                                    materialsNotesForTeam: e.target.value,
                                  }))
                                }
                                placeholder="Visible to workers and leaders on this tab…"
                              />
                            )}
                          </div>
                        </div>
    
                        {teamMemberOnly ? (
                          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => void handleSaveTeamLogisticsForTeamMember()}
                            >
                              Save team logistics
                            </button>
                            <AppStatusMessage
                              message={teamLogisticsSaveStatus}
                              tone={
                                teamLogisticsSaveStatus === "Saved."
                                  ? "success"
                                  : teamLogisticsSaveStatus === "Saving..."
                                    ? "info"
                                    : teamLogisticsSaveStatus
                                      ? "danger"
                                      : "neutral"
                              }
                              compact
                            />
                          </div>
                        ) : (
                          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => void handleSaveStaffTeamVisibleMaterials()}
                            >
                              Save team logistics & shipping
                            </button>
                            <AppStatusMessage
                              message={teamLogisticsSaveStatus}
                              tone={
                                teamLogisticsSaveStatus === "Saved."
                                  ? "success"
                                  : teamLogisticsSaveStatus === "Saving..."
                                    ? "info"
                                    : teamLogisticsSaveStatus
                                      ? "danger"
                                      : "neutral"
                              }
                              compact
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()
                : null}
    
              {staffViewAllParticipants && materialsDraft ? (
                <>
                  <CollapsibleSection defaultOpen>
                    <div
                      className="card pad"
                      style={{
                        display: "grid",
                        gap: 0,
                        borderRadius: 14,
                        border: "1px solid rgba(15, 23, 42, 0.1)",
                        background:
                          "linear-gradient(165deg, rgba(248, 250, 252, 0.96) 0%, #ffffff 44%, rgba(241, 245, 249, 0.5) 100%)",
                        boxShadow:
                          "0 12px 40px rgba(15, 23, 42, 0.08), 0 2px 12px rgba(15, 23, 42, 0.04)",
                      }}
                    >
                      <div className="cardSectionPill" style={{ marginBottom: 8 }}>
                        Materials at a glance
                      </div>
                      <div className="small" style={{ marginBottom: 14, opacity: 0.88 }}>
                        Team name and site workbook plan are read-only. Team logistics, shipping, and staff notes for
                        the team are in the card above. Edit T-shirt sizing and workbook sending notes here.
                      </div>
                      <div
                        className="row"
                        style={{
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                          marginBottom: 14,
                          padding: "12px 14px",
                          marginLeft: -4,
                          marginRight: -4,
                          marginTop: -4,
                          borderRadius: 12,
                          background: "rgba(255, 255, 255, 0.65)",
                          border: "1px solid rgba(15, 23, 42, 0.06)",
                          boxShadow: "0 1px 0 rgba(255, 255, 255, 0.9) inset",
                        }}
                      >
                        {!isEditingMaterialsGlance ? (
                          <>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => setIsEditingMaterialsGlance(true)}
                            >
                              Edit
                            </button>
                            <button type="button" className="btn" onClick={() => handleExportMaterialsExcel()}>
                              Export Excel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btnPrimary"
                              onClick={() => void handleMaterialsGlanceSave()}
                            >
                              Save
                            </button>
                            <button type="button" className="btn" onClick={() => revertMaterialsDraftFromBudgetRow()}>
                              Cancel
                            </button>
                            <button type="button" className="btn" onClick={() => handleExportMaterialsExcel()}>
                              Export Excel
                            </button>
                          </>
                        )}
                        <AppStatusMessage
                          message={materialsSaveStatus}
                          tone={
                            materialsSaveStatus === "Saved."
                              ? "success"
                              : materialsSaveStatus === "Saving..."
                                ? "info"
                                : "danger"
                          }
                          compact
                        />
                      </div>
    
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 12,
                          margin: "0 0 18px",
                        }}
                      >
                        <div
                          style={{
                            ...materialsMetricCard,
                            background:
                              "linear-gradient(180deg, rgba(219, 234, 254, 0.9), rgba(255, 255, 255, 0.88))",
                          }}
                        >
                          <div style={materialsMetricLabel}>Team Plan</div>
                          <div style={materialsMetricValue}>{materialsWorkersDisplayCount}</div>
                          <div style={materialsGlanceMuted}>
                            {materialsBudgetWorkerCount !== null
                              ? `Budget count saved · roster has ${materialsRosterHeadcount}`
                              : `Using roster headcount · ${materialsRosterHeadcount} on file`}
                          </div>
                          <div className="small" style={{ color: "var(--muted)" }}>
                            {materialsWorkerCountDelta === null
                              ? "No manual worker count entered yet."
                              : materialsWorkerCountDelta === 0
                                ? "Budget and roster headcount match."
                                : materialsWorkerCountDelta > 0
                                  ? `${materialsWorkerCountDelta} more on budget than roster.`
                                  : `${Math.abs(materialsWorkerCountDelta)} more on roster than budget.`}
                          </div>
                        </div>
                        <div
                          style={{
                            ...materialsMetricCard,
                            background:
                              "linear-gradient(180deg, rgba(220, 252, 231, 0.9), rgba(255, 255, 255, 0.88))",
                          }}
                        >
                          <div style={materialsMetricLabel}>Workbook Totals</div>
                          <div style={materialsMetricValue}>
                            {materialsWorkbookSentCopies !== null
                              ? `${materialsWorkbookSentCopies}/${materialsWorkbookTargetCopies}`
                              : materialsWorkbookTargetCopies}
                          </div>
                          <div style={materialsGlanceMuted}>
                            {staffSiteWorkbookPlan?.noLocation
                              ? "Set a trip location to load site workbook guidance"
                              : staffSiteWorkbookPlan?.empty
                                ? "No workbook quantities found on the matched site"
                                : `${staffSiteWorkbookPlan?.distinctTitles || 0} titles planned from Sites`}
                          </div>
                          <div className="small" style={{ color: "var(--muted)" }}>
                            {materialsWorkbookSentCopies !== null
                              ? `${materialsWorkbookRemainingCopies || 0} copies still unaccounted for.`
                              : "Add workbook sending notes to compare planned vs sent."}
                          </div>
                        </div>
                        <div
                          style={{
                            ...materialsMetricCard,
                            background:
                              "linear-gradient(180deg, rgba(254, 249, 195, 0.9), rgba(255, 255, 255, 0.88))",
                          }}
                        >
                          <div style={materialsMetricLabel}>T-shirt roster</div>
                          <div style={{ ...materialsMetricValue, fontSize: 18, lineHeight: 1.15 }}>
                            {materialsRosterTshirtLines.length}
                          </div>
                          <div style={materialsGlanceMuted}>
                            Roster lines with a saved shirt size (see T-shirts & sizing panel).
                          </div>
                          <div className="small" style={{ color: "var(--muted)" }}>
                            Shipping status and tracking are on the cards above.
                          </div>
                        </div>
                      </div>
    
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                          gap: 14,
                          alignItems: "start",
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            ...materialsPanelBase,
                            background:
                              "linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(248, 250, 252, 0.4))",
                            border: "1px solid rgba(37, 99, 235, 0.14)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: "rgba(30, 64, 175, 0.9)",
                              padding: "8px 0 10px",
                              borderBottom: "1px solid rgba(37, 99, 235, 0.15)",
                              marginBottom: 2,
                            }}
                          >
                            Team plan
                          </div>
    
                          <div style={materialsGlanceRow}>
                            <div style={materialsGlanceLabel}>Team name</div>
                            <div style={materialsGlanceValue}>{trip.name || "—"}</div>
                          </div>
    
                          <div style={materialsGlanceRow}>
                            <div style={materialsGlanceLabel}># of workers</div>
                            <div>
                              <span
                                style={{
                                  ...materialsGlanceValue,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {materialsWorkersDisplayCount}
                              </span>
                              {materialsBudgetWorkerCount !== null ? (
                                <div style={{ ...materialsGlanceMuted, marginTop: 4 }}>
                                  {`Saved on budget row · Roster on file: ${materialsRosterHeadcount}`}
                                </div>
                              ) : null}
                            </div>
                          </div>
    
                          <div style={materialsGlanceRow}>
                            <div style={materialsGlanceLabel}>Workbook target</div>
                            <div>
                              <div style={{ ...materialsGlanceMuted, marginBottom: 6 }}>
                                Site:{" "}
                                <span style={{ color: "var(--text)", fontWeight: 500 }}>
                                  {tripSiteCanonicalLabel || trip.location || "—"}
                                </span>
                              </div>
                              {staffSiteWorkbookPlan?.noLocation ? (
                                <div style={materialsGlanceMuted}>
                                  Set the trip location in setup to match a site on{" "}
                                  <Link href="/sites">Sites</Link>.
                                </div>
                              ) : staffSiteWorkbookPlan?.empty ? (
                                <div style={materialsGlanceMuted}>No workbooks found.</div>
                              ) : (
                                <>
                                  <div style={{ ...materialsGlanceMuted, marginBottom: 6 }}>
                                    {staffSiteWorkbookPlan.distinctTitles} titles ·{" "}
                                    {staffSiteWorkbookPlan.totalCopies} copies
                                  </div>
                                  <ul
                                    style={{
                                      margin: 0,
                                      paddingLeft: 18,
                                      ...materialsGlanceValue,
                                      lineHeight: 1.55,
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {staffSiteWorkbookPlan.positiveLines.map((line, idx) => (
                                      <li key={`site-${line.name}-${idx}`}>
                                        <span style={{ color: "var(--text)", fontWeight: 500 }}>{line.qty}</span>
                                        {" · "}
                                        {line.name}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
    
                        <div
                          style={{
                            ...materialsPanelBase,
                            background:
                              "linear-gradient(180deg, rgba(22, 163, 74, 0.09), rgba(240, 253, 244, 0.45))",
                            border: "1px solid rgba(22, 163, 74, 0.18)",
                            boxShadow:
                              "0 1px 0 rgba(255, 255, 255, 0.85) inset, 0 6px 20px rgba(22, 101, 52, 0.06)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: "0.12em",
                              textTransform: "uppercase",
                              color: "rgba(21, 128, 61, 0.92)",
                              padding: "8px 0 10px",
                              borderBottom: "1px solid rgba(22, 163, 74, 0.2)",
                              marginBottom: 2,
                            }}
                          >
                            T-shirts & sizing
                          </div>
    
                          <div style={materialsGlanceRow}>
                            <div style={materialsGlanceLabel}>T-shirt sizes</div>
                            <div>
                              {materialsRosterTshirtLines.length > 0 ? (
                                <div style={{ display: "grid", gap: 4 }}>
                                  {materialsRosterTshirtLines.map((line, idx) => (
                                    <div key={`${line}-${idx}`} style={materialsGlanceValue}>
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span style={materialsGlanceMuted}>No roster members yet.</span>
                              )}
                              {isEditingMaterialsGlance ? (
                                <>
                                  <div className="small" style={{ marginTop: 10, color: "var(--muted)" }}>
                                    Optional notes (same field as Budget → Housing)
                                  </div>
                                  <textarea
                                    className="input"
                                    rows={2}
                                    value={materialsDraft.tshirts}
                                    onChange={(e) =>
                                      setMaterialsDraft((d) => ({ ...d, tshirts: e.target.value }))
                                    }
                                    placeholder="Extra sizing or shipping notes…"
                                  />
                                </>
                              ) : String(materialsDraft.tshirts || "").trim() ? (
                                <div style={{ marginTop: 8 }}>
                                  <div style={materialsGlanceMuted}>Notes</div>
                                  <div style={{ ...materialsGlanceValue, whiteSpace: "pre-wrap" }}>
                                    {materialsDraft.tshirts}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
    
                      <div style={materialsGlanceRowSending}>
                        <div style={materialsGlanceLabel}>Workbook sending</div>
                        <div>
                          <div style={{ ...materialsGlanceMuted, marginBottom: 8 }}>
                            Notes about what workbooks were sent for this team.
                          </div>
                          {materialsTeamWorkbookGlance?.kind === "parsed" &&
                          materialsTeamWorkbookGlance.positiveLines?.length > 0 ? (
                            <>
                              <div style={{ ...materialsGlanceMuted, marginBottom: 6 }}>
                                Sent list: {materialsTeamWorkbookGlance.distinctTitles} titles ·{" "}
                                {materialsTeamWorkbookGlance.totalCopies} copies
                              </div>
                              {materialsWorkbookTargetCopies > 0 ? (
                                <div style={{ ...materialsGlanceMuted, marginBottom: 8 }}>
                                  Planned from site: {materialsWorkbookTargetCopies} copies · Remaining:{" "}
                                  {materialsWorkbookRemainingCopies || 0}
                                </div>
                              ) : null}
                            </>
                          ) : null}
                          {isEditingMaterialsGlance ? (
                            <textarea
                              className="input"
                              rows={4}
                              value={materialsDraft.materialsNotes}
                              onChange={(e) =>
                                setMaterialsDraft((d) => ({ ...d, materialsNotes: e.target.value }))
                              }
                              placeholder="e.g. Shipped LUKE 1 & ACTS 1 on 3/15; tracking on the Shipping card above."
                            />
                          ) : (
                            <div style={{ ...materialsGlanceValue, whiteSpace: "pre-wrap" }}>
                              {String(materialsDraft.materialsNotes || "").trim() || (
                                <span style={materialsGlanceMuted}>—</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
    
                      <div
                        style={{
                          ...materialsGlanceRowSending,
                          marginTop: 14,
                          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                          paddingTop: 16,
                        }}
                      >
                        <div style={materialsGlanceLabel}>Printed check (accounting)</div>
                        <div>
                          <div style={{ ...materialsGlanceMuted, marginBottom: 10, lineHeight: 1.45 }}>
                            Request a printed check for this team. Accounting gets a task and an optional email.
                            Full list and <strong>Mark processed</strong> live on{" "}
                            <Link href="/budget?tab=checks">Budget → Checks</Link>.
                          </div>
                          {tripBudgetCheckRequests.length === 0 ? (
                            <div
                              className="small"
                              style={{ marginBottom: 12, color: "var(--muted)", fontStyle: "italic" }}
                            >
                              No check requests for this trip yet.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                                marginBottom: 12,
                                padding: "10px 12px",
                                borderRadius: 10,
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                background: "rgba(248, 250, 252, 0.9)",
                              }}
                            >
                              <div className="small" style={{ fontWeight: 800, color: "var(--muted)" }}>
                                This trip
                              </div>
                              {tripBudgetCheckRequests.map((req) => {
                                const isDone = req.status === "processed";
                                const dateLabel = (() => {
                                  try {
                                    const d = new Date(req.createdAt);
                                    return Number.isFinite(d.getTime())
                                      ? d.toLocaleDateString(undefined, {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "";
                                  } catch {
                                    return "";
                                  }
                                })();
                                return (
                                  <div
                                    key={req.id}
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      paddingBottom: 8,
                                      borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                                    }}
                                  >
                                    <div
                                      className="row"
                                      style={{
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                        gap: 8,
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                                        {String(req.amountRequested || "").trim() || "—"}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 800,
                                          letterSpacing: "0.06em",
                                          textTransform: "uppercase",
                                          padding: "3px 8px",
                                          borderRadius: 999,
                                          border: "1px solid",
                                          ...(isDone
                                            ? {
                                                color: "#15803d",
                                                background: "rgba(220, 252, 231, 0.85)",
                                                borderColor: "rgba(22, 163, 74, 0.35)",
                                              }
                                            : {
                                                color: "#b45309",
                                                background: "rgba(254, 243, 199, 0.9)",
                                                borderColor: "rgba(217, 119, 6, 0.35)",
                                              }),
                                        }}
                                      >
                                        {isDone ? "Processed" : "Pending"}
                                      </span>
                                      {dateLabel ? (
                                        <span className="small" style={{ color: "var(--muted)", marginLeft: "auto" }}>
                                          Requested {dateLabel}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                                      {!isDone ? (
                                        <button
                                          type="button"
                                          className="btn"
                                          style={{ padding: "4px 10px", fontSize: 12 }}
                                          onClick={() => {
                                            setBudgetCheckEditingId(req.id);
                                            setBudgetCheckAmount(String(req.amountRequested || "").trim());
                                            setBudgetCheckNote(String(req.note || "").trim());
                                            setBudgetCheckModalOpen(true);
                                          }}
                                        >
                                          Edit
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        className="btn"
                                        style={{ padding: "4px 10px", fontSize: 12, color: "var(--danger)" }}
                                        onClick={() => setTripBudgetCheckDeleteId(req.id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn btnPrimary"
                            onClick={() => {
                              setBudgetCheckEditingId("");
                              setBudgetCheckAmount("");
                              setBudgetCheckNote("");
                              setBudgetCheckModalOpen(true);
                            }}
                          >
                            Request budget check
                          </button>
                        </div>
                      </div>
    
                      <div
                        style={{
                          ...materialsGlanceRowSending,
                          marginTop: 14,
                          borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                          paddingTop: 16,
                        }}
                      >
                        <div style={materialsGlanceLabel}>Shipping box checklist</div>
                        <div>
                          <div style={{ ...materialsGlanceMuted, marginBottom: 10, lineHeight: 1.45 }}>
                            Staff only — standard items for every team box. Check them off as you pack (saved
                            automatically).
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gap: 8,
                              padding: "12px 14px",
                              borderRadius: 12,
                              border: "1px solid rgba(15, 23, 42, 0.08)",
                              background: "rgba(248, 250, 252, 0.75)",
                            }}
                          >
                            {MATERIALS_PACKING_CHECKLIST_ITEMS.map(({ key, label, title }) => {
                              const checklist = parseMaterialsPackingChecklist(
                                materialsDraft?.materialsPackingChecklist
                              );
                              return (
                                <label
                                  key={key}
                                  className="row"
                                  title={title || undefined}
                                  style={{
                                    gap: 10,
                                    alignItems: "center",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontWeight: 500,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!checklist[key]}
                                    onChange={() => void handleToggleMaterialsPackingItem(key)}
                                  />
                                  <span>{label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
    
                    </div>
                  </CollapsibleSection>
                  {(effectiveSiteInfoDoc?.link || effectiveSiteInfoDoc?.pdfUrl) && (
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <a
                        className="btn btnPrimary"
                        href={preferredTripResourceOpenUrl(effectiveSiteInfoDoc)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Open site logistics
                      </a>
                    </div>
                  )}
                </>
              ) : null}
            </div>
  );
}

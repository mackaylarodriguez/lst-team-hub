import { useTripPage } from "../TripPageContext";
import { showToast } from "@/components/Toast";
import {
  fillTravelFormExportTemplate,
  TRAVEL_FORM_TEMPLATE_PATH,
} from "@/lib/travelFormExport";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
} from "../tripPageShared";

export default function TripTravelFormTab() {
    const {
    canManageTrips,
    canViewTeamDashboard,
    currentParticipant,
    formatSingleDate,
    getTravelFormByRefKey,
    groupLeaderContactSaveStatus,
    groupLeaderTravelDraft,
    handleSaveGroupLeaderTravelContactOnly,
    openTravelFormModal,
    setGroupLeaderContactSaveStatus,
    setGroupLeaderTravelDraft,
    travelFormResponses,
    travelFormsSummary,
    trip,
    tripIsMassachusettsDomestic,
    visibleTravelFormParticipants,
  } = useTripPage();

  const {
    totalParticipants: travelFormsExpected,
    missingCount: travelFormsMissing,
    passportGaps: travelFormsPassportGaps,
  } = travelFormsSummary;
  const travelFormsSubmitted = travelFormsSummary["completed" + "Count"];

  return (
    <div style={{ display: "grid", gap: 16 }}>
              <CollapsibleSection defaultOpen>
              <div className="card pad">
                <div
                  className="row mobileSectionHeader"
                  style={{
                    marginBottom: canViewTeamDashboard ? 8 : 0,
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  <div className="cardSectionPill" style={{ marginBottom: 0 }}>
                    Travel form responses
                  </div>
                  {canViewTeamDashboard ? (
                  <div className="row mobileSectionHeaderActions" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                      if (!trip) return;
                      const ma = tripIsMassachusettsDomestic;
                      const header = ma
                        ? [
                            "Team Name",
                            "First Name (as on government-issued ID)",
                            "Middle Name (as on government-issued ID)",
                            "Last Name (as on government-issued ID)",
                            "Suffix",
                            "Your Email Address",
                            "Birthdate-Month",
                            "Birthdate-Day",
                            "Birthdate-Year",
                            "Gender",
                            "Special travel preferences",
                            "Frequent Flyer numbers or Known Pre-check number",
                            "Site of LST Project (city AND country)",
                            "Gateway City (departure point)",
                            "Official Departure Date",
                            "Official Return Date",
                            "Are you a minor (under 18 yrs old)?",
                            "Do you have a REAL ID (Yes/No)?",
                            "Base Ticket acknowledgment",
                            "Team Travel acknowledgment",
                            "EndMeeting acknowledgment",
                            "Travel Insurance acknowledgment",
                          ]
                        : [
                            "Team Name",
                            "First Name (as it appears on your passport)",
                            "Middle Name (as it appears on your passport)",
                            "Last Name (as it appears on your passport)",
                            "Suffix",
                            "Your Email Address",
                            "Birthdate-Month",
                            "Birthdate-Day",
                            "Birthdate-Year",
                            "Gender",
                            "Citizenship",
                            "Passport Number",
                            "Passport Expiration Date (month/day/year)",
                            "Issuing Country",
                            "Special travel preferences\nPreferences may include leaving for your project early to do personal travel, staying after your project to do personal travel, flying a specific airline, needing extra time during layovers, using miles to purchase a ticket, asking LST to purchase tickets which you will then upgrade, flying home to a different city than you left from, etc..  If your preference increases the cost of the Base Ticket LST will ask you to pay the difference at the time of ticketing.\n\nRESPOND with details or \"\"NONE\"\"",
                            "Frequent Flyer numbers or Known Pre-check number",
                            "Site of LST Project (city AND country)",
                            "GATEWAY CITY-Subject to LST approval, I want to leave from the following Gateway City as our project departure point (typically this is the city nearest to you with an international airport):",
                            "Official Project Dates: DEPARTURE DATE-Please enter the date your team will depart for your project (as approved by LST).  If you plan on traveling to your site early, you may indicate that in the \"Special Travel Preferences\" field. The date you enter here, however, should be the official departure date for the project were you not doing any extra travel.",
                            "Official Project Dates: RETURN DATE-Please enter the date you must arrive back home (as approved by LST).  If you plan on doing personal travel after your project, you may indicate that in the \"Special Travel Preferences\" field.  The date you enter here, however, should be the official return date for the project were you not doing any extra travel.",
                            "Are you a minor (under 18 yrs old)?\n\nRESPOND \"\"YES\"\" or \"\"NO\"\"",
                            "Passport good for at least six months AFTER your LST trip ends?\n\nRESPOND \"\"YES\"\" or \"\"NO\"\"",
                            "Base Ticket -I understand that LST will book my travel from a Gateway City to my site, and back to that same Gateway City.  I understand I will need to get to the Gateway City at my own expense.\n\n(RESPOND \"\"YES\"\")",
                            "Team Travel-I understand that my entire team must arrive at our site on the same day, at the same airport, and at approximately the same time.\n\n(RESPOND \"\"YES\"\")",
                            "EndMeeting-I understand that all LST teams participate in a period of debriefing as their project ends and that this EndMeeting for church teams normally takes place within a week of my arrival back home.\n\n(RESPOND \"\"YES\"\")",
                            "Travel Insurance-I understand LST will purchase a basic international travel insurance plan and that you can upgrade by calling the company directly after receiving your card from LST. (www.faithventures.com/compare-plans)\n\n(RESPOND \"\"YES\"\")",
                          ];
    
                      const exportRows = visibleTravelFormParticipants;
    
                      const rows = exportRows.map((p) => {
                        const form = getTravelFormByRefKey(p.refKey) || null;
    
                        if (ma) {
                          return [
                            form?.teamName || trip?.name || "",
                            form?.firstNamePassport || "",
                            form?.middleNamePassport || "",
                            form?.lastNamePassport || "",
                            form?.suffix || "",
                            form?.email || p?.email || "",
                            form?.birthdateMonth || "",
                            form?.birthdateDay || "",
                            form?.birthdateYear || "",
                            form?.gender || "",
                            form?.specialTravelPreferences || "",
                            form?.frequentFlyerPrecheck || "",
                            form?.siteProject || "",
                            form?.gatewayCity || "",
                            form?.departureDate || "",
                            form?.returnDate || "",
                            form?.isMinor || "",
                            form?.hasRealId || "",
                            form?.baseTicketAck || "",
                            form?.teamTravelAck || "",
                            form?.endMeetingAck || "",
                            form?.travelInsuranceAck || "",
                          ];
                        }
    
                        return [
                          form?.teamName || trip?.name || "",
                          form?.firstNamePassport || "",
                          form?.middleNamePassport || "",
                          form?.lastNamePassport || "",
                          form?.suffix || "",
                          form?.email || p?.email || "",
                          form?.birthdateMonth || "",
                          form?.birthdateDay || "",
                          form?.birthdateYear || "",
                          form?.gender || "",
                          form?.citizenship || "",
                          form?.passportNumber || "",
                          form?.passportExpirationDate || "",
                          form?.passportIssuingCountry || "",
                          form?.specialTravelPreferences || "",
                          form?.frequentFlyerPrecheck || "",
                          form?.siteProject || "",
                          form?.gatewayCity || "",
                          form?.departureDate || "",
                          form?.returnDate || "",
                          form?.isMinor || "",
                          form?.passportValidSixMonths || "",
                          form?.baseTicketAck || "",
                          form?.teamTravelAck || "",
                          form?.endMeetingAck || "",
                          form?.travelInsuranceAck || "",
                        ];
                      });
    
                      const csvContent = [header, ...rows]
                        .map((cols) =>
                          cols
                            .map((val) => {
                              const s = String(val ?? "");
                              if (/[",\n]/.test(s)) {
                                return `"${s.replace(/"/g, '""')}"`;
                              }
                              return s;
                            })
                            .join(",")
                        )
                        .join("\n");
    
                      const blob = new Blob([csvContent], {
                        type: "text/csv;charset=utf-8;",
                      });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      const safeTripName = String(trip.name || "trip")
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "");
                      link.download = `${safeTripName || "trip"}-travel-form-responses.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      showToast(`Exported ${safeTripName || "trip"}-travel-form-responses.csv`);
                    }}
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={async () => {
                      if (!trip) return;
                      try {
                        const res = await fetch(TRAVEL_FORM_TEMPLATE_PATH);
                        if (!res.ok) {
                          const msg = "Travel agency template not found. Add travel-form-export.xlsx to public/templates/.";
                          showToast(msg, "error");
                          return;
                        }
                        const ab = await res.arrayBuffer();
                        const exportParticipants = visibleTravelFormParticipants;
                        const { blob, error } = fillTravelFormExportTemplate(ab, {
                          participants: exportParticipants,
                          travelFormResponses,
                          trip,
                        });
                        if (error) {
                          const msg = String(error);
                          showToast(msg, "error");
                          return;
                        }
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        const safeTripName = String(trip.name || "trip")
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-+|-+$/g, "");
                        const dateStr = new Date().toISOString().slice(0, 10);
                        link.download = `${safeTripName}-travel-agency-${dateStr}.xlsx`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        showToast(`Exported ${safeTripName}-travel-agency-${dateStr}.xlsx`);
                      } catch (e) {
                        const msg = e?.message || "Export failed.";
                        showToast(msg, "error");
                      }
                    }}
                    >
                      Export for travel agency (Excel)
                    </button>
                  </div>
                  ) : null}
                </div>
                {canViewTeamDashboard ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <AppMetricCard
                      label="Expected Responses"
                      value={travelFormsExpected}
                      tone="info"
                    />
                    <AppMetricCard
                      label="Submitted"
                      value={travelFormsSubmitted}
                      tone={travelFormsSubmitted > 0 ? "success" : "neutral"}
                    />
                    <AppMetricCard
                      label="Still Missing"
                      value={travelFormsMissing}
                      tone={travelFormsMissing > 0 ? "warning" : "success"}
                    />
                    <AppMetricCard
                      label={tripIsMassachusettsDomestic ? "ID / REAL ID gaps" : "Passport Gaps"}
                      value={travelFormsPassportGaps}
                      tone={travelFormsPassportGaps > 0 ? "warning" : "success"}
                    />
                  </div>
                ) : null}

                {canManageTrips ? (
                  <div
                    style={{
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--surfaceMuted, rgba(15, 23, 42, 0.04))",
                    }}
                  >
                    <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>
                      Group leader contact
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>
                          Group leader name
                        </div>
                        <input
                          className="input"
                          value={groupLeaderTravelDraft.name}
                          onChange={(e) => {
                            setGroupLeaderContactSaveStatus("");
                            setGroupLeaderTravelDraft((d) => ({ ...d, name: e.target.value }));
                          }}
                          placeholder="Leader full name"
                          autoComplete="name"
                        />
                      </div>
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>
                          Group leader cell phone
                        </div>
                        <input
                          className="input"
                          type="tel"
                          value={groupLeaderTravelDraft.cellPhone}
                          onChange={(e) => {
                            setGroupLeaderContactSaveStatus("");
                            setGroupLeaderTravelDraft((d) => ({ ...d, cellPhone: e.target.value }));
                          }}
                          placeholder="Cell phone"
                          autoComplete="tel"
                        />
                      </div>
                      <div>
                        <div className="small" style={{ marginBottom: 4 }}>
                          Group leader email
                        </div>
                        <input
                          className="input"
                          type="email"
                          value={groupLeaderTravelDraft.email}
                          onChange={(e) => {
                            setGroupLeaderContactSaveStatus("");
                            setGroupLeaderTravelDraft((d) => ({ ...d, email: e.target.value }));
                          }}
                          placeholder="leader@email.com"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    {groupLeaderContactSaveStatus ? (
                      <div style={{ marginTop: 10 }}>
                        <AppStatusMessage
                          message={groupLeaderContactSaveStatus}
                          tone={
                            groupLeaderContactSaveStatus === "Saved."
                              ? "success"
                              : groupLeaderContactSaveStatus === "Saving..."
                                ? "info"
                                : "danger"
                          }
                        />
                      </div>
                    ) : null}
                    <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
                      <button
                        className="btn btnPrimary"
                        type="button"
                        onClick={() => void handleSaveGroupLeaderTravelContactOnly()}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}
    
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: canViewTeamDashboard
                      ? "repeat(auto-fit, minmax(320px, 1fr))"
                      : "1fr",
                    gap: 16,
                  }}
                >
                  {visibleTravelFormParticipants.map((p) => {
                    const form = getTravelFormByRefKey(p.refKey) || null;
                    const ma = tripIsMassachusettsDomestic;
                    const hasSubmission = !!(
                      form &&
                      (ma
                        ? [
                            form.firstNamePassport,
                            form.lastNamePassport,
                            form.email,
                            form.departureDate,
                            form.returnDate,
                            form.hasRealId,
                          ]
                        : [
                            form.firstNamePassport,
                            form.lastNamePassport,
                            form.passportNumber,
                            form.email,
                            form.departureDate,
                            form.returnDate,
                          ]
                      ).some((value) => String(value || "").trim())
                    );
                    const hasPassportGap = ma
                      ? hasSubmission &&
                        (!String(form?.firstNamePassport || "").trim() ||
                          !String(form?.lastNamePassport || "").trim() ||
                          !String(form?.hasRealId || "").trim())
                      : hasSubmission &&
                        (!String(form?.passportNumber || "").trim() ||
                          !String(form?.passportExpirationDate || "").trim());
                    const infoSections = ma
                      ? [
                          {
                            title: "Identity",
                            fields: [
                              ["Team", form?.teamName || trip?.name || "—"],
                              ["Email", form?.email || p?.email || "—"],
                              [
                                "ID name (must match ID)",
                                [form?.firstNamePassport, form?.middleNamePassport, form?.lastNamePassport]
                                  .filter(Boolean)
                                  .join(" ") || "—",
                              ],
                              [
                                "Birthdate",
                                [form?.birthdateMonth, form?.birthdateDay, form?.birthdateYear]
                                  .filter(Boolean)
                                  .join("/") || "—",
                              ],
                              ["Gender", form?.gender || "—"],
                            ],
                          },
                          {
                            title: "Project & travel",
                            fields: [
                              ["Project site", form?.siteProject || "—"],
                              ["Gateway city", form?.gatewayCity || "—"],
                              ["Departure", form?.departureDate ? formatSingleDate(form.departureDate) : "—"],
                              ["Return", form?.returnDate ? formatSingleDate(form.returnDate) : "—"],
                              ["Frequent flyer / Pre-check", form?.frequentFlyerPrecheck || "—"],
                              ["Minor", form?.isMinor || "—"],
                              ["REAL ID (yes/no)", form?.hasRealId || "—"],
                            ],
                          },
                        ]
                      : [
                          {
                            title: "Identity",
                            fields: [
                              ["Team", form?.teamName || trip?.name || "—"],
                              ["Email", form?.email || p?.email || "—"],
                              [
                                "Passport name",
                                [form?.firstNamePassport, form?.middleNamePassport, form?.lastNamePassport]
                                  .filter(Boolean)
                                  .join(" ") || "—",
                              ],
                              [
                                "Birthdate",
                                [form?.birthdateMonth, form?.birthdateDay, form?.birthdateYear]
                                  .filter(Boolean)
                                  .join("/") || "—",
                              ],
                              ["Gender", form?.gender || "—"],
                              ["Citizenship", form?.citizenship || "—"],
                            ],
                          },
                          {
                            title: "Passport & travel",
                            fields: [
                              ["Passport #", form?.passportNumber || "—"],
                              ["Expiration", form?.passportExpirationDate || "—"],
                              ["Issuing country", form?.passportIssuingCountry || "—"],
                              ["Gateway city", form?.gatewayCity || "—"],
                              ["Departure", form?.departureDate ? formatSingleDate(form.departureDate) : "—"],
                              ["Return", form?.returnDate ? formatSingleDate(form.returnDate) : "—"],
                            ],
                          },
                          {
                            title: "Project & travel",
                            fields: [
                              ["Project site", form?.siteProject || "—"],
                              ["Frequent flyer / Pre-check", form?.frequentFlyerPrecheck || "—"],
                              ["Minor", form?.isMinor || "—"],
                              ["Passport valid 6+ months", form?.passportValidSixMonths || "—"],
                            ],
                          },
                        ];
    
                    const submissionStatusText = !hasSubmission
                      ? "No travel form response submitted yet."
                      : hasPassportGap && ma
                        ? "Response submitted, but ID name or REAL ID answer is incomplete."
                        : hasPassportGap
                          ? ""
                          : "Response submitted and ready for review.";
    
                    return (
                      <div
                        key={p.refKey || p.id}
                        className="card pad"
                        style={{
                          borderRadius: 18,
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.97), rgba(248,250,252,0.92))",
                        }}
                      >
                        <div className="row mobileCardTopRow" style={{ alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 900, color: "var(--text)" }}>
                              {canViewTeamDashboard ? p.name || p.email || "Participant" : "My response"}
                            </div>
                            {submissionStatusText ? (
                              <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                                {submissionStatusText}
                              </div>
                            ) : null}
                          </div>
                          <span className={`badge ${hasSubmission ? (hasPassportGap ? "badgeWarn" : "badgeSuccess") : "badgeWarn"}`}>
                            {hasSubmission
                              ? hasPassportGap
                                ? ma
                                  ? "Needs ID info"
                                  : "Needs passport info"
                                : "Submitted"
                              : "Missing"}
                          </span>
                          <button
                            type="button"
                            className={canViewTeamDashboard ? "btn" : "btn btnPrimary"}
                            onClick={() => openTravelFormModal({ refKey: p.refKey, email: p.email || "" })}
                          >
                            {canViewTeamDashboard ? "View / Edit" : "Edit"}
                          </button>
                        </div>
    
                        <div style={{ display: "grid", gap: 12 }}>
                          {infoSections.map((section) => (
                            <div
                              key={`${p.refKey}-${section.title}`}
                              style={{
                                borderRadius: 14,
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                background: "rgba(255,255,255,0.78)",
                                padding: "12px 14px",
                                display: "grid",
                                gap: 10,
                              }}
                            >
                              <div className="small" style={{ fontWeight: 900, color: "var(--foreground)" }}>
                                {section.title}
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                  gap: 10,
                                }}
                              >
                                {section.fields.map(([label, value]) => (
                                  <div key={`${p.refKey}-${section.title}-${label}`} style={{ minWidth: 0 }}>
                                    <div className="small" style={{ color: "var(--muted)", marginBottom: 2 }}>
                                      {label}
                                    </div>
                                    <div style={{ fontSize: 13, lineHeight: 1.5, wordBreak: "break-word" }}>
                                      {value || "—"}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {section.wideLabel ? (
                                <div>
                                  <div className="small" style={{ color: "var(--muted)", marginBottom: 2 }}>
                                    {section.wideLabel}
                                  </div>
                                  <div style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                                    {section.wideValue}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {canViewTeamDashboard && visibleTravelFormParticipants.length === 0 && (
                  <AppEmptyState
                    title="No participants yet"
                    description="Add team members in the Team roster to see and export their travel form responses here."
                  />
                )}
                {!canViewTeamDashboard && !currentParticipant && (
                  <AppEmptyState
                    title="You are not assigned to this trip"
                    description="Once you are assigned, your travel form response will appear here."
                  />
                )}
              </div>
              </CollapsibleSection>
            </div>
  );
}

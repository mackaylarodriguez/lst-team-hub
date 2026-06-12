import ExpandableCollapsibleSection from "@/components/CollapsibleSection";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Staff-only accordion for one worker's task/training checklist (reduces long scroll).
 */
export default function TripParticipantCollapsible({
  enabled,
  participant,
  tripId,
  kind,
  defaultOpen = false,
  children,
}) {
  if (!enabled) {
    return children;
  }

  const emailKey = normalizeEmail(participant?.email);
  const persistOpenKey =
    tripId && emailKey ? `lst-trip-${tripId}-${kind}-${emailKey}` : undefined;
  const completed = participant?.completed ?? 0;
  const total = participant?.total ?? 0;
  const percent = participant?.percent ?? 0;
  const badgeClass =
    percent >= 80 ? "badgeSuccess" : percent > 0 ? "badgeWarn" : "";

  return (
    <ExpandableCollapsibleSection
      className="tripParticipantCollapsible"
      title={participant?.name || participant?.email || "Participant"}
      subtitle={`${completed} of ${total} complete`}
      badge={
        <span className={`badge ${badgeClass}`.trim()}>{percent}%</span>
      }
      defaultOpen={defaultOpen}
      persistOpenKey={persistOpenKey}
    >
      {children}
    </ExpandableCollapsibleSection>
  );
}

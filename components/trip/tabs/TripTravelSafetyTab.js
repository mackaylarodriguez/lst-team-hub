import { useTripPage } from "../TripPageContext";
import TripTravelSafetySection from "@/components/TripTravelSafetySection";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function TripTravelSafetyTab() {
    const {
    isPreviewingParticipant,
    participants,
    session,
    staffViewAllParticipants,
    teamMembers,
    trip,
  } = useTripPage();

  return (
    <div style={{ display: "grid", gap: 16 }}>
              {trip?.id ? (
                <TripTravelSafetySection
                  tripId={trip.id}
                  session={session}
                  participants={participants?.length ? participants : trip.participants || []}
                  teamMembers={teamMembers?.length ? teamMembers : trip.teamMembers || []}
                  canEdit={staffViewAllParticipants && !isPreviewingParticipant}
                  isPreviewingParticipant={isPreviewingParticipant}
                />
              ) : null}
            </div>
  );
}

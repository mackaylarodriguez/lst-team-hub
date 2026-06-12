import TripOverviewTab from "./tabs/TripOverviewTab";
import TripTeamTab from "./tabs/TripTeamTab";
import TripTravelSafetyTab from "./tabs/TripTravelSafetyTab";
import TripFundraisingTab from "./tabs/TripFundraisingTab";
import TripTrainingTab from "./tabs/TripTrainingTab";
import TripTasksTab from "./tabs/TripTasksTab";
import TripMaterialsTab from "./tabs/TripMaterialsTab";
import TripDocumentsTab from "./tabs/TripDocumentsTab";
import TripParticipantDocumentsTab from "./tabs/TripParticipantDocumentsTab";
import TripTravelFormTab from "./tabs/TripTravelFormTab";
import TripStaffTasksTab from "./tabs/TripStaffTasksTab";
import { useTripPage } from "./TripPageContext";

export default function TripTabPanels() {
  const {
    tab,
    tripTabTravelSafety,
    canViewMaterialsTab,
    tripDocumentsTabLabel,
    participantDocumentsTabLabel,
    canManageTrips,
    isLeader,
  } = useTripPage();

  return (
    <>
      {tab === "Overview" ? <TripOverviewTab /> : null}
      {tab === "Team" ? <TripTeamTab /> : null}
      {tab === tripTabTravelSafety ? <TripTravelSafetyTab /> : null}
      {tab === "Fundraising" ? <TripFundraisingTab /> : null}
      {tab === "Training" ? <TripTrainingTab /> : null}
      {tab === "Tasks" ? <TripTasksTab /> : null}
      {tab === "Materials" && canViewMaterialsTab ? <TripMaterialsTab /> : null}
      {tab === tripDocumentsTabLabel ? <TripDocumentsTab /> : null}
      {tab === participantDocumentsTabLabel ? <TripParticipantDocumentsTab /> : null}
      {tab === "Travel Form" ? <TripTravelFormTab /> : null}
      {tab === "Staff Tasks" && canManageTrips && !isLeader ? <TripStaffTasksTab /> : null}
    </>
  );
}

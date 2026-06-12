/**
 * Pure helpers and constants for the trip page. Merged into TripPageContext so tabs
 * do not need separate imports (and cannot drift out of sync with the hook).
 */
export {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
  toDatetimeLocalValue,
  normalizeEmail,
  normalizeLegacyTeamRole,
  getWorkerConnectionStatus,
  preferredTripResourceOpenUrl,
  buildStaffTaskRowDomId,
  buildWorkerTaskRowDomId,
  buildTrainingModuleRowDomId,
  listEffectiveTutorials,
  tripDocumentTileRootClassName,
  parseMaterialsPackingChecklist,
  TEAM_MEMBER_ROLE_OPTIONS,
} from "./tripPageShared";

export {
  DOCUMENT_CATEGORY_OPTIONS,
  getSmartsheetBudgetTutorialCards,
} from "@/lib/tripDocumentSlots";

export {
  findWorkerTaskTemplate,
  getWorkerTaskDisplayTitle,
  isWorkerPassportOrVisaUploadTask,
} from "@/lib/workerTaskTemplate";

export { isWorkerTaskCompletedInState } from "@/lib/tasks";

export {
  getTrainingSessionOptionsForModuleTitle,
  resolveTrainingSessionSelectValue,
} from "@/lib/trainingSessionOptions";

export { findStaffTaskTemplate } from "@/lib/staffTaskTemplate";
export { computeStaffTaskDueDate } from "@/lib/staffTasks";

export { deleteTripMeeting } from "@/lib/tripMeetings";

export {
  fillTravelFormExportTemplate,
  TRAVEL_FORM_TEMPLATE_PATH,
} from "@/lib/travelFormExport";

export { formatPhoneNumber, toPhoneHref } from "@/lib/phone";

export { showToast } from "@/components/Toast";

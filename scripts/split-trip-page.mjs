#!/usr/bin/env node
/**
 * LEGACY: Re-splits a monolithic pages/trips/[tripId].js into tab files + hook.
 * After running, you MUST run:
 *   npm run sync:trip-page-return
 *   npm run sync:trip-tabs
 *   npm run validate:trip-page
 *
 * Does NOT overwrite TripPageContext.js, TripPageProvider.js, or tripPageStaticApi.js.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractHookBindings } from "./lib/trip-page-tools.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tripPagePath = path.join(root, "pages/trips/[tripId].js");

if (!fs.existsSync(tripPagePath)) {
  console.error("Missing pages/trips/[tripId].js — cannot split.");
  process.exit(1);
}

const lines = fs.readFileSync(tripPagePath, "utf8").split("\n");

const SHARED_START = 159;
const SHARED_END = 1180;
const HOOK_START = 1183;
const HOOK_END = 7819;
const JSX_START = 7823;
const JSX_END = 13650;

const tabs = [
  { name: "TripOverviewTab", start: 8072, end: 8695, condition: 'tab === "Overview"' },
  { name: "TripTeamTab", start: 8696, end: 9241, condition: 'tab === "Team"' },
  { name: "TripTravelSafetyTab", start: 9243, end: 9256, condition: "tab === tripTabTravelSafety" },
  { name: "TripFundraisingTab", start: 9258, end: 9820, condition: 'tab === "Fundraising"' },
  { name: "TripTrainingTab", start: 9821, end: 10068, condition: 'tab === "Training"' },
  { name: "TripTasksTab", start: 10069, end: 10443, condition: 'tab === "Tasks"' },
  { name: "TripMaterialsTab", start: 10444, end: 11308, condition: 'tab === "Materials" && canViewMaterialsTab' },
  { name: "TripDocumentsTab", start: 11309, end: 12086, condition: "tab === tripDocumentsTabLabel" },
  { name: "TripParticipantDocumentsTab", start: 12087, end: 12318, condition: "tab === participantDocumentsTabLabel" },
  { name: "TripTravelFormTab", start: 12319, end: 12922, condition: 'tab === "Travel Form"' },
  { name: "TripStaffTasksTab", start: 12924, end: 13357, condition: 'tab === "Staff Tasks" && canManageTrips && !isLeader' },
];

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function stripTabWrapper(block) {
  let b = block.trim();
  b = b.replace(/^\{[\s\S]*?&&\s*\(/, "").trim();
  if (b.endsWith(")}")) b = b.slice(0, -2).trim();
  return b;
}

const hookBody = slice(HOOK_START, HOOK_END);
const bindingNames = extractHookBindings(`export function useTripPageModel() {\n${hookBody}\n}`);
const returnKeys = [...bindingNames].sort();
console.log(`Found ${returnKeys.length} hook bindings (incl. setters + async handlers)`);

const sharedImports = `import Link from "next/link";
import AppIcon from "@/components/AppIcon";
import AppDueDateTripleSelect from "@/components/AppDueDateTripleSelect";
import { Fragment } from "react";
import { REQUIRED_TRIP_DOCUMENT_SLOTS } from "@/lib/tripDocumentSlots";
`;

const sharedBody = slice(SHARED_START, SHARED_END);
fs.writeFileSync(
  path.join(root, "components/trip/tripPageShared.jsx"),
  `${sharedImports}\n${sharedBody}\n`
);

const tabsDir = path.join(root, "components/trip/tabs");
fs.mkdirSync(tabsDir, { recursive: true });

for (const tab of tabs) {
  const jsx = stripTabWrapper(slice(tab.start, tab.end));
  fs.writeFileSync(
    path.join(tabsDir, `${tab.name}.js`),
    `import { useTripPage } from "../TripPageContext";

export default function ${tab.name}() {
  const p = useTripPage();

  return (
${jsx
  .split("\n")
  .map((l) => "    " + l)
  .join("\n")}
  );
}
`
  );
}

const panelImports = tabs.map((t) => `import ${t.name} from "./tabs/${t.name}";`).join("\n");
const panelConditions = tabs
  .map((t) => `      {${t.condition} ? <${t.name} /> : null}`)
  .join("\n");

fs.writeFileSync(
  path.join(root, "components/trip/TripTabPanels.js"),
  `${panelImports}
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
${panelConditions}
    </>
  );
}
`
);

const pageImports = slice(1, 157);
const hookFile = `${pageImports}
import * as TripPageShared from "@/components/trip/tripPageShared";

const {
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
  shouldIncludeInTripWorkerPipeline,
  numWorkersDraftFromBudgetValue,
  getWorkerConnectionStatus,
  preferredTripResourceOpenUrl,
  formatDraftAmount,
  draftFeeAmountUnlessDefault,
  buildDateOffsetFromToday,
  buildTripSetupDraft,
  createEmptyRosterMember,
  createEmptyWorkerDraft,
  buildStaffTaskRowDomId,
  buildWorkerTaskRowDomId,
  buildTrainingModuleRowDomId,
  buildTrainingSessionMeetingsFromState,
  getDocumentCategoryBadgeClass,
  buildDocumentDraft,
  getEffectiveTutorialContent,
  listEffectiveTutorials,
  tripDocumentTileRootClassName,
  isTripDocumentFlightsCategory,
  categoryForTripResourceDoc,
  parseTripDocumentWorkAreaMeta,
  buildTripDocumentWorkAreaMeta,
  getTripDocumentWorkerLabel,
  snapshotTripResourceForInsert,
  isPersistedTripResourceDismissedEmpty,
  findDismissedPersistedTripResource,
  docHasAnyContent,
  docUpdatedMs,
  pickPreferredDocByRequiredKey,
  dedupeRequiredSlotResources,
  pickMainHousingDocFromViewerList,
  defaultMaterialsPackingChecklist,
  parseMaterialsPackingChecklist,
} = TripPageShared;

export function useTripPageModel() {
${hookBody}

  return {
${returnKeys.map((k) => `    ${k},`).join("\n")}
  };
}
`;

fs.writeFileSync(path.join(root, "hooks/useTripPageModel.js"), hookFile);

let pageJsx = slice(JSX_START, JSX_END);
const tabBlockStart = pageJsx.indexOf('{tab === "Overview"');
const tabBlockEnd = pageJsx.indexOf("{travelFormModalOpen &&");
if (tabBlockStart === -1 || tabBlockEnd === -1) {
  console.error("Could not find tab block boundaries in JSX");
  process.exit(1);
}

const beforeTabs = pageJsx.slice(0, tabBlockStart);
const afterTabs = pageJsx.slice(tabBlockEnd);

const slimPage = `${pageImports}
import { TripPageProvider } from "@/components/trip/TripPageProvider";
import TripTabPanels from "@/components/trip/TripTabPanels";
import { useTripPageModel } from "@/hooks/useTripPageModel";
import * as TripPageShared from "@/components/trip/tripPageShared";

const {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
} = TripPageShared;

export default function TripPage() {
  const tripPage = useTripPageModel();
  const { pagePhase } = tripPage;

  if (pagePhase === "router-loading" || pagePhase === "trip-loading" || pagePhase === "trip-not-found") {
    // loading states handled in shell — see current [tripId].js
  }

  const p = tripPage;

  return (
    <TripPageProvider value={tripPage}>
${beforeTabs.trimEnd()}
        <TripTabPanels />
${afterTabs.trimStart()}
    </TripPageProvider>
  );
}
`;

fs.writeFileSync(path.join(root, "pages/trips/[tripId].new.js"), slimPage);
console.log("Wrote pages/trips/[tripId].new.js — review then swap");
console.log("Then run: npm run sync:trip-page-return && npm run sync:trip-tabs && npm run validate:trip-page");

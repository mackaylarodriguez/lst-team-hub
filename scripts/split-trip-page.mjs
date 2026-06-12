#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tripPagePath = path.join(root, "pages/trips/[tripId].js");
const lines = fs.readFileSync(tripPagePath, "utf8").split("\n");

const SHARED_START = 159; // function CollapsibleSection
const SHARED_END = 1180; // line before export default function TripPage
const HOOK_START = 1183; // const router
const HOOK_END = 7819; // before return (
const JSX_START = 7823; // <Shell>
const JSX_END = 13650; // </Shell>

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

const bindingNames = new Set();
for (const line of hookBody.split("\n")) {
  if (!line.startsWith("  ") || line.startsWith("    ")) continue;
  let m = line.match(/^  const \[(\w+)/);
  if (m) {
    bindingNames.add(m[1]);
    continue;
  }
  m = line.match(/^  const (\w+)\s*=/);
  if (m) {
    bindingNames.add(m[1]);
    continue;
  }
  m = line.match(/^  let (\w+)\s*=/);
  if (m) {
    bindingNames.add(m[1]);
    continue;
  }
  m = line.match(/^  function (\w+)/);
  if (m) {
    bindingNames.add(m[1]);
  }
}

const returnKeys = [...bindingNames].sort();
console.log(`Found ${returnKeys.length} hook bindings`);

// Shared UI/helpers — only the block from original file + minimal imports
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

// Context
fs.writeFileSync(
  path.join(root, "components/trip/TripPageContext.js"),
  `import { createContext, useContext } from "react";

export const TripPageContext = createContext(null);

export function useTripPage() {
  const ctx = useContext(TripPageContext);
  if (!ctx) {
    throw new Error("useTripPage must be used within TripPageContext.Provider");
  }
  return ctx;
}
`
);

// Tab components — destructure all bindings so JSX stays unchanged
const destructureBlock = returnKeys.map((k) => `    ${k},`).join("\n");
const tabsDir = path.join(root, "components/trip/tabs");
fs.mkdirSync(tabsDir, { recursive: true });

for (const tab of tabs) {
  const jsx = stripTabWrapper(slice(tab.start, tab.end));
  fs.writeFileSync(
    path.join(tabsDir, `${tab.name}.js`),
    `import { useTripPage } from "../TripPageContext";
import {
  CollapsibleSection,
  AppStatusMessage,
  AppEmptyState,
  AppMetricCard,
  AppDetailAction,
  TrainingResourceLink,
  OptionalTripWideDocumentCard,
} from "../tripPageShared";

export default function ${tab.name}() {
  const {
${destructureBlock}
  } = useTripPage();

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

// TripTabPanels
const panelImports = tabs.map((t) => `import ${t.name} from "./tabs/${t.name}";`).join("\n");
const panelConditions = tabs
  .map((t) => `      {${t.condition} ? <${t.name} /> : null}`)
  .join("\n");

fs.writeFileSync(
  path.join(root, "components/trip/TripTabPanels.js"),
  `${panelImports}

export default function TripTabPanels() {
  return (
    <>
${panelConditions}
    </>
  );
}
`
);

// useTripPage hook — copy original imports (lines 1-157) + hook body
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

// Slim page shell
let pageJsx = slice(JSX_START, JSX_END);
const tabBlockStart = pageJsx.indexOf('{tab === "Overview"');
const tabBlockEnd = pageJsx.indexOf("{travelFormModalOpen &&");
if (tabBlockStart === -1 || tabBlockEnd === -1) {
  console.error("Could not find tab block boundaries in JSX");
  process.exit(1);
}

const beforeTabs = pageJsx.slice(0, tabBlockStart);
const afterTabs = pageJsx.slice(tabBlockEnd);
const destructureAll = returnKeys.map((k) => `    ${k},`).join("\n");

const slimPage = `${pageImports}
import { TripPageContext } from "@/components/trip/TripPageContext";
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
  const {
${destructureAll}
  } = tripPage;

  return (
    <TripPageContext.Provider value={tripPage}>
${beforeTabs.trimEnd()}
        <TripTabPanels />
${afterTabs.trimStart()}
    </TripPageContext.Provider>
  );
}
`;

fs.writeFileSync(path.join(root, "pages/trips/[tripId].new.js"), slimPage);
console.log("Wrote pages/trips/[tripId].new.js — review then swap");

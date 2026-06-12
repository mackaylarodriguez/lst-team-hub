#!/usr/bin/env node
/**
 * Ensures trip page hook exports and tab destructuring stay in sync.
 * Run: npm run validate:trip-page
 */
import {
  PATHS,
  read,
  consumerFiles,
  listTabFiles,
  extractImports,
  parseAllDestructureKeys,
  findUsedContextKeys,
  getAllAvailableKeys,
  isPrivateBinding,
  extractHookBindings,
  extractReturnKeys,
} from "./lib/trip-page-tools.mjs";

const hookSource = read(PATHS.hook);
const staticSource = read(PATHS.staticApi);
const { hookReturn, staticKeys, hookBindings, available } = getAllAvailableKeys(hookSource, staticSource);

const errors = [];
const warnings = [];

const usedInConsumers = new Set();
for (const file of consumerFiles()) {
  const src = read(file);
  const imports = extractImports(src);
  const used = findUsedContextKeys(src, available, imports, file);
  for (const key of used) usedInConsumers.add(key);
}
for (const binding of hookBindings) {
  if (isPrivateBinding(binding)) continue;
  if (staticKeys.has(binding)) continue;
  if (hookReturn.has(binding)) continue;
  if (!usedInConsumers.has(binding)) continue;
  errors.push(`useTripPageModel return is missing "${binding}" (used in trip UI)`);
}

// Hook bindings used by consumers should be exported (return object), unless static-only.
for (const file of consumerFiles()) {
  const src = read(file);
  const imports = extractImports(src);
  const used = findUsedContextKeys(src, available, imports, file);

  for (const key of used) {
    if (staticKeys.has(key)) continue;
    if (!hookReturn.has(key)) {
      if (hookBindings.has(key)) {
        errors.push(`${rel(file)}: uses "${key}" but useTripPageModel return is missing it`);
      } else {
        errors.push(`${rel(file)}: uses unknown context key "${key}"`);
      }
    }
  }

  const destructured =
    file === PATHS.tripPage
      ? parseAllDestructureKeys(src, "tripPage")
      : parseAllDestructureKeys(src, "useTripPage");

  if (!destructured.size && file !== PATHS.tabPanels) {
    warnings.push(`${rel(file)}: no useTripPage/tripPage destructure found`);
    continue;
  }

  for (const key of used) {
    if (!destructured.has(key)) {
      errors.push(`${rel(file)}: uses "${key}" but does not destructure it (run npm run sync:trip-tabs)`);
    }
  }
}

// TripTabPanels must call useTripPage()
const tabPanels = read(PATHS.tabPanels);
if (!tabPanels.includes("useTripPage()")) {
  errors.push("TripTabPanels.js: must call useTripPage() for tab routing state");
}

// Trip page must use TripPageProvider
const tripPage = read(PATHS.tripPage);
if (!tripPage.includes("TripPageProvider")) {
  errors.push("pages/trips/[tripId].js: must wrap content in TripPageProvider");
}

for (const file of listTabFiles()) {
  const src = read(file);
  const imports = extractImports(src);
  const body = src.split("export default function")[1] || src;
  for (const m of body.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)) {
    const comp = m[1];
    if (comp === "Fragment") continue;
    if (imports.has(comp)) continue;
    errors.push(`${rel(file)}: uses <${comp}> without importing it`);
  }
}

// Warn about hook bindings that look public but are not returned (optional hygiene)
for (const binding of hookBindings) {
  if (isPrivateBinding(binding)) continue;
  if (binding.startsWith("set") && hookBindings.has(binding.slice(3).replace(/^./, (c) => c.toLowerCase()))) {
    // setTab + tab pattern — setter without state is odd; skip
  }
  if (staticKeys.has(binding)) continue;
  if (hookReturn.has(binding)) continue;
  if (/^(handle|set|can|get|is|format|render|open|toggle|update|persist|retry|clear|schedule|revert|prepend|push)/.test(binding)) {
    warnings.push(`useTripPageModel: "${binding}" is defined but not in return (ok if unused)`);
  }
}

function rel(filePath) {
  return filePath.replace(PATHS.root + "/", "");
}

if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings.slice(0, 15)) console.log("  -", w);
  if (warnings.length > 15) console.log(`  ... and ${warnings.length - 15} more`);
}

if (errors.length) {
  console.error("\nTrip page validation failed:\n");
  for (const e of errors) console.error("  ✗", e);
  console.error(`\n${errors.length} error(s). Run: npm run sync:trip-tabs`);
  process.exit(1);
}

console.log(`Trip page OK (${hookReturn.size} hook exports, ${staticKeys.size} static helpers, ${available.size} total API keys)`);

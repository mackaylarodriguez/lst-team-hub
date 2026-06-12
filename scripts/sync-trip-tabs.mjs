#!/usr/bin/env node
/**
 * Regenerates useTripPage() / tripPage destructuring in tab files from actual usage.
 * Run: npm run sync:trip-tabs
 */
import fs from "fs";
import {
  PATHS,
  read,
  consumerFiles,
  extractImports,
  findUsedContextKeys,
  getAllAvailableKeys,
  formatDestructure,
} from "./lib/trip-page-tools.mjs";

const { available } = getAllAvailableKeys(read(PATHS.hook), read(PATHS.staticApi));

let updated = 0;

const SYNC_SKIP = new Set([PATHS.tripPage]);

for (const file of consumerFiles()) {
  if (SYNC_SKIP.has(file)) {
    console.log("Skip (manual shell):", file.replace(PATHS.root + "/", ""));
    continue;
  }
  let src = read(file);
  const imports = extractImports(src);
  const used = findUsedContextKeys(src, available, imports, file);

  if (file === PATHS.tabPanels) {
    const required = [
      "tab",
      "tripTabTravelSafety",
      "canViewMaterialsTab",
      "tripDocumentsTabLabel",
      "participantDocumentsTabLabel",
      "canManageTrips",
      "isLeader",
    ];
    for (const k of required) used.add(k);
  }

  if (used.size === 0) continue;

  const isTripPage = file === PATHS.tripPage;
  const pattern = isTripPage
    ? /const\s*\{[\s\S]*?\}\s*=\s*tripPage;/
    : /const\s*\{[\s\S]*?\}\s*=\s*useTripPage\(\);/;

  if (!pattern.test(src)) {
    console.warn("Skip (no destructure):", file);
    continue;
  }

  const replacement = `${formatDestructure(used)} = ${isTripPage ? "tripPage" : "useTripPage()"};`;
  const next = src.replace(pattern, replacement);
  if (next !== src) {
    fs.writeFileSync(file, next);
    updated += 1;
    console.log("Updated", file.replace(PATHS.root + "/", ""), `(${used.size} keys)`);
  }
}

console.log(updated ? `Synced ${updated} file(s).` : "All tab destructures already in sync.");

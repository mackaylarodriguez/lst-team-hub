#!/usr/bin/env node
/**
 * Appends missing hook bindings to useTripPageModel return (handlers, setters, computed).
 * Static helpers belong in tripPageStaticApi.js — not duplicated here.
 * Run: npm run sync:trip-page-return
 */
import fs from "fs";
import {
  PATHS,
  read,
  consumerFiles,
  extractImports,
  findUsedContextKeys,
  getAllAvailableKeys,
  isPrivateBinding,
} from "./lib/trip-page-tools.mjs";

const hookPath = PATHS.hook;
let source = read(hookPath);
const staticSource = read(PATHS.staticApi);
const { hookReturn, staticKeys, hookBindings, available } = getAllAvailableKeys(source, staticSource);

const needed = new Set();
for (const file of consumerFiles()) {
  const src = read(file);
  const imports = extractImports(src);
  const used = findUsedContextKeys(src, available, imports, file);
  for (const key of used) {
    if (staticKeys.has(key)) continue;
    if (hookBindings.has(key) && !hookReturn.has(key)) needed.add(key);
  }
}

// Also export common handler/setter bindings that exist in hook but aren't private
for (const binding of hookBindings) {
  if (isPrivateBinding(binding)) continue;
  if (staticKeys.has(binding)) continue;
  if (hookReturn.has(binding)) continue;
  if (/^(handle|set)/.test(binding)) needed.add(binding);
}

if (needed.size === 0) {
  console.log("Hook return already includes all required bindings.");
  process.exit(0);
}

const sorted = [...needed].sort();
const insertLines = sorted.map((k) => `    ${k},`).join("\n");

const marker = "    // Handlers, setters, and helpers used by tab panels / page shell (not in auto-generated export list)";
if (source.includes(marker)) {
  source = source.replace(marker, `${marker}\n${insertLines}`);
} else {
  source = source.replace(
    /(\n  \};\n\}\s*)$/,
    `\n${insertLines}\n  };\n}\n`
  );
}

fs.writeFileSync(hookPath, source);
console.log(`Added ${sorted.length} binding(s) to useTripPageModel return:`);
for (const k of sorted) console.log("  +", k);

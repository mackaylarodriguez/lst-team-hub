/**
 * Apply site_availability schema (requires DATABASE_URL or SUPABASE_DB_URL)
 * then migrate legacy rows and seed visibility.
 *
 * Prefer running supabase/site_availability.sql in the Supabase SQL editor, then:
 *   node scripts/migrate-site-availability.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

readFileSync(join(root, ".env.local"), "utf8")
  .split("\n")
  .forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) return;
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const YEAR = 2027;

async function tableReady() {
  const { error } = await admin.from("site_availability").select("id").limit(1);
  if (!error) return true;
  console.error("site_availability not ready:", error.message);
  console.error("Run supabase/site_availability.sql in the Supabase SQL editor first.");
  return false;
}

async function migrateLegacy() {
  const { data, error } = await admin
    .from("site_budget_notes")
    .select("id,site_name,notes")
    .like("site_name", `__lst_availability__:${YEAR}:%`);
  if (error) throw error;

  let migrated = 0;
  for (const row of data || []) {
    const rest = String(row.site_name).slice(`__lst_availability__:${YEAR}:`.length);
    let payload;
    try {
      payload = JSON.parse(row.notes || "null");
    } catch {
      continue;
    }
    if (!payload || typeof payload !== "object") continue;

    const { error: upErr } = await admin.from("site_availability").upsert(
      {
        site_name: rest,
        year: YEAR,
        available_start: payload.availableStart || null,
        available_end: payload.availableEnd || null,
        site_type: payload.siteType || "Partner site",
        team_notes: Array.isArray(payload.teamNotes) ? payload.teamNotes : [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "site_name,year" }
    );
    if (upErr) throw upErr;
    await admin.from("site_budget_notes").delete().eq("id", row.id);
    migrated += 1;
    console.log("migrated", rest);
  }
  console.log("migrated count", migrated);
}

async function main() {
  if (!(await tableReady())) process.exit(1);
  await migrateLegacy();
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

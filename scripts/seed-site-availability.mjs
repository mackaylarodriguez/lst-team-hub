/**
 * One-off seed: site availability from staff spreadsheet (2027 only).
 * Run: node scripts/seed-site-availability.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
readFileSync(envPath, "utf8")
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

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function hold(id, start, end, note) {
  return { id, start, end, note };
}

function storageName(siteLabel, year) {
  return `__lst_availability__:${year}:${siteLabel}`;
}

function buildRows(year) {
  const is2027 = year === 2027;
  const rows = [];

  rows.push({
    siteLabel: "Argentina - Buenos Aires",
    availableStart: ymd(year, 3, 1),
    availableEnd: ymd(year, 11, 30),
    exclusions: [
      hold(
        `ar-jul-aug-${year}`,
        ymd(year, 7, 1),
        ymd(year, 8, 31),
        "School break — can interfere with LST activity"
      ),
    ],
    teamNotes: [
      "Preferred team size: 2–4 (larger at the beginning of the year; smaller after)",
      "Other church backgrounds: No",
      "Really wants/needs longer-term apprentices. Open to hosting six week teams.",
      "If families come prefers three adults with the kids so that there are always two LST Workers available for Reading.",
      "Really wants Craig to come visit.",
      "Season: March (school starts) through November; July/August school break can interfere.",
    ],
  });

  rows.push({
    siteLabel: "Brazil - Ponta Grossa",
    availableStart: ymd(year, 5, 1),
    availableEnd: ymd(year, 6, 30),
    exclusions: [],
    teamNotes: [
      "Preferred team size: 3",
      "Other church backgrounds: Yes",
      "Open to the idea of a larger one-week team",
      "Season: May and June",
    ],
  });

  const rioExclusions = [
    hold(
      `rio-corpus-${year}`,
      ymd(year, 5, 27),
      ymd(year, 5, 28),
      is2027
        ? "Corpus Christi"
        : "Corpus Christi (confirm dates for this year; 2027 was May 27–28)"
    ),
  ];

  rows.push({
    siteLabel: "Brazil - Rio de Janeiro",
    availableStart: ymd(year, 5, 1),
    availableEnd: ymd(year, 9, 30),
    exclusions: rioExclusions,
    teamNotes: [
      "Preferred team size: 2–4",
      "Other church backgrounds: Yes",
      "Open to having a larger group coming for a week and doing activities with the youth",
      "Season: May through September",
      "Holidays to watch: Corpus Christi (May 27–28 in 2027)",
    ],
  });

  const zagrebExclusions = [
    hold(`zg-summer-${year}`, ymd(year, 7, 1), ymd(year, 8, 31), "Not available July–August"),
  ];
  if (is2027) {
    zagrebExclusions.push(
      hold("zg-easter-2027", ymd(2027, 3, 28), ymd(2027, 3, 29), "Easter"),
      hold("zg-labor-2027", ymd(2027, 5, 1), ymd(2027, 5, 1), "Labor Day"),
      hold("zg-corpus-2027", ymd(2027, 5, 27), ymd(2027, 5, 27), "Corpus Christi"),
      hold("zg-antifascism-2027", ymd(2027, 6, 22), ymd(2027, 6, 22), "Anti-fascism Day"),
      hold("zg-allsaints-2027", ymd(2027, 11, 1), ymd(2027, 11, 1), "All Saints' Day"),
      hold("zg-memorial-2027", ymd(2027, 11, 18), ymd(2027, 11, 18), "Memorial Day")
    );
  }

  rows.push({
    siteLabel: "Croatia - Zagreb",
    availableStart: ymd(year, 2, 1),
    availableEnd: ymd(year, 11, 30),
    exclusions: zagrebExclusions,
    teamNotes: [
      "Host: Mislaav Ilic (special — see note)",
      "Preferred team size: 2",
      "Other church backgrounds: Yes; PRIORITY to Memorial Road C/C members (OKC) in 2027. Jimmy and Holly Arter are his MRCC coordinators.",
      "Would be open to some kind of retreat for LST Readers and church members.",
      "Finances: Will need rent housing; work site is only available on certain days — may need to rent an additional work site.",
      "Season: February–June and September–November",
      "Holidays: Easter Mar 28–29; Labor Day May 1; Corpus Christi May 27; Anti-fascism June 22; All Saints Nov 1; Memorial Day Nov 18 (2027 dates)",
    ],
  });

  const lecceExclusions = [
    hold(
      `lecce-easter-${year}`,
      ymd(year, 3, 21),
      ymd(year, 3, 31),
      is2027
        ? "Easter window — not the week before 3/28, nor three days after"
        : "Easter window — confirm dates; avoid week before and three days after"
    ),
    hold(
      `lecce-summer-${year}`,
      ymd(year, 6, 16),
      ymd(year, 9, 12),
      "NOT available: late June, July, August, first two weeks of September"
    ),
  ];

  rows.push({
    siteLabel: "Italy - Lecce",
    availableStart: ymd(year, 1, 7),
    availableEnd: ymd(year, 10, 15),
    exclusions: lecceExclusions,
    teamNotes: [
      "Preferred team size: 2 is ideal, 3 is ok. Not more than 2 or 3.",
      "Other church backgrounds: Yes but not Pentecostals; Workers must believe in baptism by immersion",
      "Winter teams will be cold; buildings not heated well",
      "Season: Jan (after Jan 7), Feb, March (watch Easter), April, May, June 1–15, Sept 13–Oct 15",
      "NOT: late June, July, August, first two weeks of September",
    ],
  });

  rows.push({
    siteLabel: "Japan - Kasama",
    availableStart: "",
    availableEnd: "",
    exclusions: [],
    teamNotes: [
      "Preferred team size: 2",
      "Might prefer one month instead of six weeks. Not sure about dates yet.",
      "Other church backgrounds: ??",
    ],
    notesOnly: true,
  });

  rows.push({
    siteLabel: "Philippines",
    availableStart: ymd(year, 1, 1),
    availableEnd: ymd(year, 12, 31),
    exclusions: [],
    teamNotes: [
      "Host: Wayne Pabillion — See Note",
      "Preferred team size: 3–4 people",
      "Other church backgrounds: Yes",
      "Prefer April and May, but anytime of the year would be fine. Summer in Talisay / no school until June or July.",
      "Past work: 3–6 week LST teams. Prefers 6 weeks; 3–4 weeks ok if that is the only available time.",
      "Ask team to pay for electricity for the whole project (A/C needed for readings in summer heat).",
      "Can pick up / drop off at airport. Can help find a rented house — just let him know.",
    ],
  });

  rows.push({
    siteLabel: "South Korea - Seoul",
    availableStart: ymd(year, 4, 1),
    availableEnd: ymd(year, 11, 30),
    exclusions: [],
    teamNotes: [
      "— Gangseo University —",
      "Preferred team size: She said 4–5 is ideal; staff note 2–4.",
      "Other church backgrounds: Yes",
      "Season: April, May, June, October, November",
      "Holidays: April and June each have one day off; May and October each have two days off (national holidays).",
      "— Hangil CofC (SunWoo and Serena Shim) —",
      "Preferred team size: 2",
      "Other church backgrounds: Prefer CofC (may be flexible)",
      "Season: March, June, November",
      "March 1 may be a holiday — confirm",
    ],
  });

  rows.push({
    siteLabel: "USA - Massachusetts - West Springfield",
    availableStart: ymd(year, 4, 1),
    availableEnd: ymd(year, 10, 31),
    exclusions: [],
    teamNotes: [
      "Preferred team size: 3 to 4",
      "Other church backgrounds: Yes",
      "Season: April through October",
      "Holidays: Memorial Day, Independence Day, Labor Day",
      "June = end of school; July–Aug = vacations; Sept = start of school",
      "Open to week-long team Retreat / Camp LST Connect during off months",
      "Housing: potential hotel discount; housing at the building available — 3 rooms, double occupancy; full kitchen available",
    ],
  });

  return rows;
}

async function ensureSiteRow(siteName, hostName) {
  const { data: existing, error: readErr } = await admin
    .from("site_budget_notes")
    .select("id,site_name")
    .eq("site_name", siteName)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing?.id) return existing;

  const body = {
    site_name: siteName,
    notes: null,
    workbook_notes: null,
    updated_at: new Date().toISOString(),
  };
  if (hostName) body.host_name = hostName;

  const { data, error } = await admin
    .from("site_budget_notes")
    .upsert(body, { onConflict: "site_name" })
    .select("id,site_name")
    .single();
  if (error) throw error;
  return data;
}

async function saveAvailability(siteLabel, year, values) {
  const payload = {
    site_name: siteLabel,
    year,
    available_start: values.availableStart || null,
    available_end: values.availableEnd || null,
    site_type: values.siteType || "Partner site",
    team_notes: values.teamNotes || [],
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("site_availability")
    .upsert(payload, { onConflict: "site_name,year" });
  if (error) throw error;

  // Remove any leftover availability rows that were incorrectly stored as budget notes.
  await admin
    .from("site_budget_notes")
    .delete()
    .eq("site_name", storageName(siteLabel, year));
}

const ensureSites = [
  ["Brazil - Florianopolis", null],
  ["Brazil - Ponta Grossa", null],
  ["Croatia - Zagreb", "Mislaav Ilic"],
  ["Ecuador - Tabacundo", null],
];

for (const [name, host] of ensureSites) {
  const row = await ensureSiteRow(name, host);
  console.log("site ok", row.site_name);
}

for (const year of [2027]) {
  for (const row of buildRows(year)) {
    await saveAvailability(row.siteLabel, year, row);
    if (row.notesOnly) {
      console.log("notes-only", year, row.siteLabel);
    } else {
      console.log("saved", year, row.siteLabel, row.availableStart, "→", row.availableEnd);
    }
  }
}

console.log("DONE");

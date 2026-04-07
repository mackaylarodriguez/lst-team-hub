/**
 * Scheduled in-person/video sessions for supplemental training modules.
 * `value` is ISO 8601 local offset (US Central) for unique storage in completed_at.
 * Labels use "CST" per product copy (winter = UTC-6, summer = CDT shown as offset in value).
 */

export const BASIC_TRAINING_SESSION_OPTIONS = [
  { value: "2026-01-08T12:00:00-06:00", label: "Thursday, January 8, 2026 12:00-2:30 pm CST" },
  { value: "2026-01-18T19:00:00-06:00", label: "Sunday, January 18, 2026 7:00-9:30 pm CST" },
  { value: "2026-02-05T19:00:00-06:00", label: "Thursday, February 5, 2026 7:00-9:30 pm CST" },
  { value: "2026-02-15T19:00:00-06:00", label: "Sunday, February 15, 2026 7:00-9:30 pm CST" },
  { value: "2026-03-12T12:00:00-05:00", label: "Thursday, March 12, 2026 12:00-2:30 pm CST" },
  { value: "2026-03-22T19:00:00-05:00", label: "Sunday, March 22, 2026 7:00-9:30 pm CST" },
  { value: "2026-04-09T19:00:00-05:00", label: "Thursday, April 9, 2026 7:00-9:30 pm CST" },
  { value: "2026-04-19T19:00:00-05:00", label: "Sunday, April 19, 2026 7:00-9:30 pm CST" },
  { value: "2026-05-14T12:00:00-05:00", label: "Thursday, May 14, 2026 12:00-2:30 pm CST" },
  { value: "2026-05-17T19:00:00-05:00", label: "Sunday, May 17, 2026 7:00-9:30 pm CST" },
  { value: "2026-06-04T19:00:00-05:00", label: "Thursday, June 4, 2026 7:00-9:30 pm CST" },
  { value: "2026-06-28T19:00:00-05:00", label: "Sunday, June 28, 2026 7:00-9:30 pm CST" },
  { value: "2026-07-09T12:00:00-05:00", label: "Thursday, July 9, 2026 12:00-2:30 pm CST" },
  { value: "2026-07-26T19:00:00-05:00", label: "Sunday, July 26, 2026 7:00-9:30 pm CST" },
  { value: "2026-08-06T19:00:00-05:00", label: "Thursday, August 6, 2026 7:00-9:30 pm CST" },
  { value: "2026-08-23T19:00:00-05:00", label: "Sunday, August 23, 2026 7:00-9:30 pm CST" },
  { value: "2026-09-03T12:00:00-05:00", label: "Thursday, September 3, 2026 12:00-2:30 pm CST" },
  { value: "2026-09-20T19:00:00-05:00", label: "Sunday, September 20, 2026 7:00-9:30 pm CST" },
  { value: "2026-10-01T19:00:00-05:00", label: "Thursday, October 1, 2026 7:00-9:30 pm CST" },
  { value: "2026-10-18T19:00:00-05:00", label: "Sunday, October 18, 2026 7:00-9:30 pm CST" },
  { value: "2026-11-05T12:00:00-06:00", label: "Thursday, November 5, 2026 12:00-2:30 pm CST" },
  { value: "2026-11-15T19:00:00-06:00", label: "Sunday, November 15, 2026 7:00-9:30 pm CST" },
  { value: "2026-12-03T19:00:00-06:00", label: "Thursday, December 3, 2026 7:00-9:30 pm CST" },
  { value: "2026-12-13T19:00:00-06:00", label: "Sunday, December 13, 2026 7:00-9:30 pm CST" },
];

export const GATEWAY_TRAINING_SESSION_OPTIONS = [
  { value: "2026-01-25T18:00:00-06:00", label: "Sunday, January 25, 2026 6:00-8:00 pm CST" },
  { value: "2026-02-22T18:00:00-06:00", label: "Sunday, February 22, 2026 6:00-8:00 pm CST" },
  { value: "2026-03-15T18:00:00-05:00", label: "Sunday, March 15, 2026 6:00-8:00 pm CST" },
  { value: "2026-04-19T17:00:00-05:00", label: "Sunday, April 19, 2026 5:00-7:00 pm CST" },
  { value: "2026-05-31T18:00:00-05:00", label: "Sunday, May 31, 2026 6:00-8:00 pm CST" },
  { value: "2026-06-14T18:00:00-05:00", label: "Sunday, June 14, 2026 6:00-8:00 pm CST" },
  { value: "2026-07-19T18:00:00-05:00", label: "Sunday, July 19, 2026 6:00-8:00 pm CST" },
  { value: "2026-08-30T18:00:00-05:00", label: "Sunday, August 30, 2026 6:00-8:00 pm CST" },
  { value: "2026-09-13T18:00:00-05:00", label: "Sunday, September 13, 2026 6:00-8:00 pm CST" },
  { value: "2026-10-25T18:00:00-05:00", label: "Sunday, October 25, 2026 6:00-8:00 pm CST" },
  { value: "2026-11-08T18:00:00-06:00", label: "Sunday, November 8, 2026 6:00-8:00 pm CST" },
  { value: "2026-12-06T18:00:00-06:00", label: "Sunday, December 6, 2026 6:00-8:00 pm CST" },
];

export const END_MEETING_SESSION_OPTIONS = [
  { value: "2026-01-22T19:00:00-06:00", label: "Thursday, January 22, 2026 7:00-8:00 pm CST" },
  { value: "2026-02-26T19:00:00-06:00", label: "Thursday, February 26, 2026 7:00-8:00 pm CST" },
  { value: "2026-03-26T19:00:00-05:00", label: "Thursday, March 26, 2026 7:00-8:00 pm CST" },
  { value: "2026-04-30T19:00:00-05:00", label: "Thursday, April 30, 2026 7:00-8:00 pm CST" },
  { value: "2026-05-28T19:00:00-05:00", label: "Thursday, May 28, 2026 7:00-8:00 pm CST" },
  { value: "2026-06-25T12:00:00-05:00", label: "Thursday, June 25, 2026 12:00-1:00 pm CST" },
  { value: "2026-06-25T19:00:00-05:00", label: "Thursday, June 25, 2026 7:00-8:00 pm CST" },
  { value: "2026-07-30T12:00:00-05:00", label: "Thursday, July 30, 2026 12:00-1:00 pm CST" },
  { value: "2026-07-30T19:00:00-05:00", label: "Thursday, July 30, 2026 7:00-8:00 pm CST" },
  { value: "2026-08-27T12:00:00-05:00", label: "Thursday, August 27, 2026 12:00-1:00 pm CST" },
  { value: "2026-08-27T19:00:00-05:00", label: "Thursday, August 27, 2026 7:00-8:00 pm CST" },
  { value: "2026-09-24T19:00:00-05:00", label: "Thursday, September 24, 2026 7:00-8:00 pm CST" },
  { value: "2026-09-24T12:00:00-05:00", label: "Thursday, September 24, 2026 12:00-1:00 pm CST" },
  { value: "2026-10-29T12:00:00-05:00", label: "Thursday, October 29, 2026 12:00-1:00 pm CST" },
  { value: "2026-10-29T19:00:00-05:00", label: "Thursday, October 29, 2026 7:00-8:00 pm CST" },
  { value: "2026-11-12T19:00:00-06:00", label: "Thursday, November 12, 2026 7:00-9:30 pm CST" },
  { value: "2026-12-17T19:00:00-06:00", label: "Thursday, December 17, 2026 7:00-9:30 pm CST" },
];

const OPTIONS_BY_TITLE = {
  "Basic Training": BASIC_TRAINING_SESSION_OPTIONS,
  "Gateway Training": GATEWAY_TRAINING_SESSION_OPTIONS,
  EndMeeting: END_MEETING_SESSION_OPTIONS,
};

/** DB / human renames → canonical DEFAULT_MODULES title */
const SESSION_OPTIONS_TITLE_ALIASES = {
  endmeeting: "EndMeeting",
  "end meeting": "EndMeeting",
  "end-meeting": "EndMeeting",
  "basic training": "Basic Training",
  "gateway training": "Gateway Training",
};

export function getTrainingSessionOptionsForModuleTitle(title) {
  const key = String(title || "").trim();
  if (OPTIONS_BY_TITLE[key]) return OPTIONS_BY_TITLE[key];
  const alias = SESSION_OPTIONS_TITLE_ALIASES[key.toLowerCase()];
  if (alias && OPTIONS_BY_TITLE[alias]) return OPTIONS_BY_TITLE[alias];
  return null;
}

/** PostgREST sometimes returns `YYYY-MM-DD HH:mm:ss+00` without `T` — Safari/older parsers need help. */
function normalizeTimestampForParse(s) {
  const t = String(s || "").trim();
  if (!t) return t;
  if (/^\d{4}-\d{2}-\d{2} \d/.test(t)) {
    return t.replace(" ", "T");
  }
  return t;
}

function parseMsLoose(s) {
  const ms = Date.parse(normalizeTimestampForParse(s));
  return Number.isNaN(ms) ? null : ms;
}

/** Map stored completed_at / local state to a select value; supports legacy YYYY-MM-DD when unambiguous. */
export function resolveTrainingSessionSelectValue(stored, options) {
  if (!stored || !options?.length) return "";
  const s = String(stored).trim();
  if (options.some((o) => o.value === s)) return s;
  const storedMs = parseMsLoose(s);
  if (storedMs != null) {
    const byInstant = options.find((o) => {
      const ms = parseMsLoose(o.value);
      return ms != null && ms === storedMs;
    });
    if (byInstant) return byInstant.value;
    const storedSec = Math.round(storedMs / 1000);
    const bySecond = options.find((o) => {
      const ms = parseMsLoose(o.value);
      if (ms == null) return false;
      return Math.round(ms / 1000) === storedSec;
    });
    if (bySecond) return bySecond.value;
  }
  const dateOnly = s.length >= 10 ? s.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return "";
  const sameDay = options.filter((o) => o.value.startsWith(dateOnly));
  if (sameDay.length === 1) return sameDay[0].value;
  return "";
}

/**
 * After loading `completed_at` from DB, coerce to the exact `<option value>` when possible
 * so controlled `<select>` stays in sync (UTC vs offset string, ms noise, etc.).
 */
export function hydrateTrainingSessionDateFromDb(rawStored, moduleTitle) {
  const raw = String(rawStored || "").trim();
  if (!raw) return "";
  const opts = getTrainingSessionOptionsForModuleTitle(moduleTitle);
  if (!opts?.length) return raw;
  return resolveTrainingSessionSelectValue(raw, opts) || raw;
}

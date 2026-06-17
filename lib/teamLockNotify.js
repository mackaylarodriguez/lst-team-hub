import { supabase } from "@/lib/supabase";

function formatWeeksLabel(weeks) {
  const raw = String(weeks ?? "").trim();
  if (!raw) return "";
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return `${parsed} week${parsed === 1 ? "" : "s"}`;
  }
  if (/week/i.test(raw)) return raw;
  return `${raw} weeks`;
}

export function resolveProjectLengthForLock({ projectLengthSummary, weeks, projectDates } = {}) {
  const summary = String(projectLengthSummary ?? "").trim();
  if (summary) return summary;

  const weeksLabel = formatWeeksLabel(weeks);
  const dates = String(projectDates ?? "").trim();
  if (weeksLabel && dates) return `${weeksLabel} - ${dates}`;
  return weeksLabel || dates || "";
}

export function buildTeamLockNotifyPayload({
  tripId,
  teamName,
  site,
  host,
  teamDeveloper,
  projectLengthSummary,
  weeks,
  projectDates,
  startDate,
  endDate,
  teamMembers,
  extraTravelStatus,
  fundraisingGoalAmount,
  tripFeeAmount,
  materialsFeeAmount,
  hannoverHousingFeeAmount,
  mackaylaNotes,
  lesleeNotes,
}) {
  return {
    tripId,
    teamName,
    site,
    host,
    teamDeveloper,
    projectLengthSummary: resolveProjectLengthForLock({
      projectLengthSummary,
      weeks,
      projectDates,
    }),
    startDate,
    endDate,
    teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
    extraTravelStatus,
    fundraisingGoalAmount,
    tripFeeAmount,
    materialsFeeAmount,
    hannoverHousingFeeAmount,
    mackaylaNotes,
    lesleeNotes,
  };
}

async function getAccessTokenForApi() {
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error("Not signed in.");
  }
  return token;
}

export async function sendTeamLockStaffNotify(payload) {
  const token = await getAccessTokenForApi();
  const res = await fetch("/api/team-lock-notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Could not send team lock notification.");
  }
  return json;
}

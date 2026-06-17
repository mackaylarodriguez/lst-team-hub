import { supabase } from "@/lib/supabase";
import { resolveProjectLengthForLock } from "@/lib/teamLockProjectLength";

export { formatWeeksLabel, resolveProjectLengthForLock } from "@/lib/teamLockProjectLength";

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
    weeks: String(weeks ?? "").trim(),
    projectDates: String(projectDates ?? "").trim(),
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

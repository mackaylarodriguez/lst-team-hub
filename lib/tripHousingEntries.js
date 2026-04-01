import { supabase } from "@/lib/supabase";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function isDraftEntryId(id) {
  return id == null || String(id).startsWith("draft-");
}

function isMissingTripHousingEntriesTableError(error) {
  const msg = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  if (error?.code === "42P01" && msg.includes("trip_housing_entries")) return true;
  if (error?.code === "PGRST205" && msg.includes("trip_housing_entries")) return true;
  return (
    msg.includes("trip_housing_entries") &&
    (msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("not find the table"))
  );
}

function mapRow(row) {
  return {
    id: row.id,
    tripId: row.trip_id,
    sortOrder: row.sort_order ?? 0,
    label: n(row.label),
    housingLink: n(row.housing_link),
    housingPdfUrl: n(row.housing_pdf_url),
  };
}

/** All extra housing rows (not trip_budgets primary). Group by tripId on the client. */
export async function listAllTripHousingEntries() {
  const { data, error } = await supabase
    .from("trip_housing_entries")
    .select("*")
    .order("trip_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingTripHousingEntriesTableError(error)) {
      return [];
    }
    console.error("listAllTripHousingEntries", error);
    throw error;
  }

  return (data || []).map(mapRow);
}

/**
 * Replace all extra housing rows for one trip with the given list (preserves order).
 * If `trip_housing_entries` is not installed, returns `{ skippedDueToMissingTable: true }` and does not throw
 * so main `trip_budgets` housing fields can still be saved.
 */
export async function syncTripHousingExtras(tripId, entries) {
  if (!tripId) return { skippedDueToMissingTable: false };

  const { data: existing, error: loadError } = await supabase
    .from("trip_housing_entries")
    .select("id")
    .eq("trip_id", tripId);

  if (loadError) {
    if (isMissingTripHousingEntriesTableError(loadError)) {
      if ((entries || []).length > 0) {
        console.warn(
          "[trip_housing_entries] Table missing or unavailable; extra housing slots were not saved. Run supabase/trip_housing_entries.sql and trip_housing_entries_rls.sql in Supabase.",
          loadError
        );
      }
      return { skippedDueToMissingTable: true };
    }
    throw loadError;
  }

  const keepIds = new Set(
    (entries || []).filter((e) => e?.id && !isDraftEntryId(e.id)).map((e) => e.id)
  );

  for (const row of existing || []) {
    if (!keepIds.has(row.id)) {
      const { error } = await supabase.from("trip_housing_entries").delete().eq("id", row.id);
      if (error) throw error;
    }
  }

  for (let i = 0; i < (entries || []).length; i++) {
    const e = entries[i];
    const payload = {
      trip_id: tripId,
      sort_order: i,
      label: n(e.label) || null,
      housing_link: n(e.housingLink) || null,
      housing_pdf_url: n(e.housingPdfUrl) || null,
      updated_at: new Date().toISOString(),
    };

    if (e.id && !isDraftEntryId(e.id)) {
      const { error } = await supabase.from("trip_housing_entries").update(payload).eq("id", e.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("trip_housing_entries").insert(payload);
      if (error) throw error;
    }
  }

  return { skippedDueToMissingTable: false };
}

export async function uploadTripHousingExtraPdf(tripId, file) {
  if (!tripId) throw new Error("Trip required");
  if (!file) throw new Error("File required");
  const safeFileName = `housing-extra-${Date.now()}-${String(file?.name || "housing.pdf").replace(
    /[^a-zA-Z0-9._-]/g,
    "-"
  )}`;
  const storagePath = `${tripId}/housing-extra/${safeFileName}`;
  const { error: uploadError } = await supabase.storage.from("pdfs").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    console.error("uploadTripHousingExtraPdf", uploadError);
    throw uploadError;
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from("pdfs").getPublicUrl(storagePath);
  return publicUrl;
}

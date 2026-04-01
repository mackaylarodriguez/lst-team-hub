import { supabase } from "@/lib/supabase";

function n(val) {
  return val === null || val === undefined ? "" : String(val).trim();
}

function isDraftEntryId(id) {
  return id == null || String(id).startsWith("draft-");
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
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("does not exist") || error.code === "42P01") {
      return [];
    }
    console.error("listAllTripHousingEntries", error);
    throw error;
  }

  return (data || []).map(mapRow);
}

/** Replace all extra housing rows for one trip with the given list (preserves order). */
export async function syncTripHousingExtras(tripId, entries) {
  if (!tripId) return;

  const { data: existing, error: loadError } = await supabase
    .from("trip_housing_entries")
    .select("id")
    .eq("trip_id", tripId);

  if (loadError) {
    const msg = String(loadError.message || "").toLowerCase();
    if (msg.includes("does not exist") || loadError.code === "42P01") {
      throw new Error(
        "Run the Supabase migration `supabase/trip_housing_entries.sql` (and RLS) to enable multiple housing slots."
      );
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

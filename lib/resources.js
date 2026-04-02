import { supabase } from "@/lib/supabase";

export function isMissingResourceVisibilityColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "PGRST204" || error?.code === "42703") &&
    message.includes("visible_to_participants") &&
    message.includes("trip_resources")
  );
}

export function isMissingResourceTutorialColumnError(error) {
  const message = String(error?.message || error?.details || error?.hint || "").toLowerCase();
  return (
    (error?.code === "PGRST204" || error?.code === "42703") &&
    message.includes("trip_resources") &&
    (message.includes("tutorial_title") ||
      message.includes("tutorial_url") ||
      message.includes("tutorial_description"))
  );
}

function omitVisibilityField(payload) {
  const { visible_to_participants, ...rest } = payload || {};
  return rest;
}

function omitTutorialFields(payload) {
  const { tutorial_title, tutorial_url, tutorial_description, ...rest } = payload || {};
  return rest;
}

function omitVisibilityAndTutorialFields(payload) {
  return omitTutorialFields(omitVisibilityField(payload));
}

function normalizeResource(row, index = 0) {
  return {
    id: row?.id || `resource-${index}`,
    title: row?.title || "Untitled",
    link: row?.link || "",
    pdfUrl: row?.pdf_url || "",
    category: row?.category || "",
    resourceKey: row?.resource_key || "",
    workArea: row?.work_area || "",
    createdAt: row?.created_at || "",
    visibleToParticipants: row?.visible_to_participants !== false,
    tutorialTitle: row?.tutorial_title || "",
    tutorialUrl: row?.tutorial_url || "",
    tutorialDescription: row?.tutorial_description || "",
  };
}

export async function listResources(tripId) {
  try {
    const query = supabase
      .from("trip_resources")
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = tripId
      ? await query.eq("trip_id", tripId)
      : await query;

    if (error) {
      console.error("Error loading resources", error);
      throw error;
    }

    return (data || []).map((row, index) => normalizeResource(row, index));
  } catch (error) {
    console.error("Error loading resources", error);
    throw error;
  }
}

export async function addLinkResource({
  title,
  link,
  workArea,
  tripId,
  category,
  resourceKey,
  tutorialTitle,
  tutorialUrl,
  tutorialDescription,
  visibleToParticipants = true,
  allowVisibilityFallback = true,
  allowTutorialFallback = true,
}) {
  try {
    const payload = {
      title: String(title || "").trim(),
      link: String(link || "").trim(),
      pdf_url: null,
      category: String(category || "").trim() || null,
      resource_key: String(resourceKey || "").trim() || null,
      work_area: String(workArea || "").trim() || null,
      tutorial_title: String(tutorialTitle || "").trim() || null,
      tutorial_url: String(tutorialUrl || "").trim() || null,
      tutorial_description: String(tutorialDescription || "").trim() || null,
      visible_to_participants: visibleToParticipants !== false,
      trip_id: tripId,
    };

    let { data, error } = await supabase
      .from("trip_resources")
      .insert(payload)
      .select("*")
      .single();

    if (allowVisibilityFallback && isMissingResourceVisibilityColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitVisibilityField(payload))
        .select("*")
        .single());
    }

    if (allowTutorialFallback && isMissingResourceTutorialColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitTutorialFields(payload))
        .select("*")
        .single());
    }

    if (
      allowVisibilityFallback &&
      allowTutorialFallback &&
      (isMissingResourceVisibilityColumnError(error) ||
        isMissingResourceTutorialColumnError(error))
    ) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitVisibilityAndTutorialFields(payload))
        .select("*")
        .single());
    }

    if (error) {
      console.error("Error creating link resource", error);
      throw error;
    }

    return normalizeResource(data);
  } catch (error) {
    console.error("Error creating link resource", error);
    throw error;
  }
}

/** Re-insert a trip_resources row (e.g. undo after delete) using an existing public PDF URL or link — no file upload. */
export async function insertResourceFromSnapshot({
  tripId,
  title,
  link,
  pdfUrl,
  category,
  resourceKey,
  workArea,
  tutorialTitle,
  tutorialUrl,
  tutorialDescription,
  visibleToParticipants,
  allowVisibilityFallback = true,
  allowTutorialFallback = true,
}) {
  try {
    const payload = {
      title: String(title || "").trim() || "Untitled",
      link: link ? String(link).trim() : null,
      pdf_url: pdfUrl ? String(pdfUrl).trim() : null,
      category: String(category || "").trim() || null,
      resource_key: String(resourceKey || "").trim() || null,
      work_area: String(workArea || "").trim() || null,
      tutorial_title: String(tutorialTitle || "").trim() || null,
      tutorial_url: String(tutorialUrl || "").trim() || null,
      tutorial_description: String(tutorialDescription || "").trim() || null,
      visible_to_participants: visibleToParticipants !== false,
      trip_id: tripId,
    };

    let { data, error } = await supabase
      .from("trip_resources")
      .insert(payload)
      .select("*")
      .single();

    if (allowVisibilityFallback && isMissingResourceVisibilityColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitVisibilityField(payload))
        .select("*")
        .single());
    }

    if (allowTutorialFallback && isMissingResourceTutorialColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitTutorialFields(payload))
        .select("*")
        .single());
    }

    if (
      allowVisibilityFallback &&
      allowTutorialFallback &&
      (isMissingResourceVisibilityColumnError(error) ||
        isMissingResourceTutorialColumnError(error))
    ) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitVisibilityAndTutorialFields(payload))
        .select("*")
        .single());
    }

    if (error) {
      console.error("Error restoring resource row", error);
      throw error;
    }

    return normalizeResource(data);
  } catch (error) {
    console.error("Error restoring resource row", error);
    throw error;
  }
}

export async function addPdfResource({
  title,
  file,
  workArea,
  tripId,
  category,
  resourceKey,
  tutorialTitle,
  tutorialUrl,
  tutorialDescription,
  visibleToParticipants = true,
  allowVisibilityFallback = true,
  allowTutorialFallback = true,
}) {
  const safeFileName = `${Date.now()}-${String(file?.name || "resource.pdf").replace(
    /[^a-zA-Z0-9._-]/g,
    "-"
  )}`;
  const storagePath = `${tripId || "unassigned"}/${safeFileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading PDF", uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("pdfs").getPublicUrl(storagePath);

    const payload = {
      title: String(title || file?.name || "Untitled PDF").trim(),
      link: null,
      pdf_url: publicUrl,
      category: String(category || "").trim() || null,
      resource_key: String(resourceKey || "").trim() || null,
      work_area: String(workArea || "").trim() || null,
      tutorial_title: String(tutorialTitle || "").trim() || null,
      tutorial_url: String(tutorialUrl || "").trim() || null,
      tutorial_description: String(tutorialDescription || "").trim() || null,
      visible_to_participants: visibleToParticipants !== false,
      trip_id: tripId,
    };

    let { data, error } = await supabase
      .from("trip_resources")
      .insert(payload)
      .select("*")
      .single();

    if (allowVisibilityFallback && isMissingResourceVisibilityColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitVisibilityField(payload))
        .select("*")
        .single());
    }

    if (allowTutorialFallback && isMissingResourceTutorialColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitTutorialFields(payload))
        .select("*")
        .single());
    }

    if (
      allowVisibilityFallback &&
      allowTutorialFallback &&
      (isMissingResourceVisibilityColumnError(error) ||
        isMissingResourceTutorialColumnError(error))
    ) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .insert(omitVisibilityAndTutorialFields(payload))
        .select("*")
        .single());
    }

    if (error) {
      console.error("Error creating PDF resource row", error);
      throw error;
    }

    return normalizeResource(data);
  } catch (error) {
    console.error("Error creating PDF resource", error);
    throw error;
  }
}

export async function updateResource({
  id,
  title,
  link,
  pdfUrl,
  workArea,
  category,
  resourceKey,
  tutorialTitle,
  tutorialUrl,
  tutorialDescription,
  visibleToParticipants,
  allowVisibilityFallback = true,
  allowTutorialFallback = true,
}) {
  try {
    const payload = {
      title: String(title || "").trim(),
      link: link ? String(link).trim() : null,
      pdf_url: pdfUrl ? String(pdfUrl).trim() : null,
      category: String(category || "").trim() || null,
      resource_key: String(resourceKey || "").trim() || null,
      work_area: String(workArea || "").trim() || null,
      tutorial_title: String(tutorialTitle || "").trim() || null,
      tutorial_url: String(tutorialUrl || "").trim() || null,
      tutorial_description: String(tutorialDescription || "").trim() || null,
      visible_to_participants: visibleToParticipants !== false,
    };

    let { data, error } = await supabase
      .from("trip_resources")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (allowVisibilityFallback && isMissingResourceVisibilityColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .update(omitVisibilityField(payload))
        .eq("id", id)
        .select("*")
        .single());
    }

    if (allowTutorialFallback && isMissingResourceTutorialColumnError(error)) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .update(omitTutorialFields(payload))
        .eq("id", id)
        .select("*")
        .single());
    }

    if (
      allowVisibilityFallback &&
      allowTutorialFallback &&
      (isMissingResourceVisibilityColumnError(error) ||
        isMissingResourceTutorialColumnError(error))
    ) {
      ({ data, error } = await supabase
        .from("trip_resources")
        .update(omitVisibilityAndTutorialFields(payload))
        .eq("id", id)
        .select("*")
        .single());
    }

    if (error) {
      console.error("Error updating resource", error);
      throw error;
    }

    return normalizeResource(data);
  } catch (error) {
    console.error("Error updating resource", error);
    throw error;
  }
}

export async function deleteResource(id) {
  try {
    const { error } = await supabase.from("trip_resources").delete().eq("id", id);

    if (error) {
      console.error("Error deleting resource", error);
      throw error;
    }
  } catch (error) {
    console.error("Error deleting resource", error);
    throw error;
  }
}

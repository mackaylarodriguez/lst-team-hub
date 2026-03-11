import { supabase } from "@/lib/supabase";

function normalizeResource(row, index = 0) {
  return {
    id: row?.id || `resource-${index}`,
    title: row?.title || "Untitled",
    link: row?.link || "",
    pdfUrl: row?.pdf_url || "",
    workArea: row?.work_area || "",
    createdAt: row?.created_at || "",
  };
}

export async function listResources(tripId) {
  try {
    const query = supabase
      .from("resources")
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

export async function addLinkResource({ title, link, workArea, tripId }) {
  try {
    const payload = {
      title: String(title || "").trim(),
      link: String(link || "").trim(),
      pdf_url: null,
      work_area: String(workArea || "").trim() || null,
      trip_id: tripId,
    };

    const { data, error } = await supabase
      .from("resources")
      .insert(payload)
      .select("*")
      .single();

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

export async function addPdfResource({ title, file, workArea, tripId }) {
  const safeFileName = `${Date.now()}-${String(file?.name || "resource.pdf").replace(
    /[^a-zA-Z0-9._-]/g,
    "-"
  )}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(safeFileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading PDF", uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("pdfs").getPublicUrl(safeFileName);

    const { data, error } = await supabase
      .from("resources")
      .insert({
        title: String(title || file?.name || "Untitled PDF").trim(),
        link: null,
        pdf_url: publicUrl,
        work_area: String(workArea || "").trim() || null,
        trip_id: tripId,
      })
      .select("*")
      .single();

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

export async function updateResource({ id, title, link, pdfUrl, workArea }) {
  try {
    const { data, error } = await supabase
      .from("resources")
      .update({
        title: String(title || "").trim(),
        link: link ? String(link).trim() : null,
        pdf_url: pdfUrl ? String(pdfUrl).trim() : null,
        work_area: String(workArea || "").trim() || null,
      })
      .eq("id", id)
      .select("*")
      .single();

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
    const { error } = await supabase.from("resources").delete().eq("id", id);

    if (error) {
      console.error("Error deleting resource", error);
      throw error;
    }
  } catch (error) {
    console.error("Error deleting resource", error);
    throw error;
  }
}

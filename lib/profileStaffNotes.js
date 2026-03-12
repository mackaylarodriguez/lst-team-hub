import { supabase } from "@/lib/supabase";

function normalizeProfileStaffNoteRow(row) {
  return {
    id: row?.id || "",
    profileId: row?.profile_id || "",
    note: row?.note || "",
    authorName: row?.author_name || "",
    authorEmail: row?.author_email || "",
    updatedAt: row?.updated_at || "",
    createdAt: row?.created_at || "",
  };
}

export async function listProfileStaffNotes(profileId) {
  const { data, error } = await supabase
    .from("profile_staff_notes")
    .select("id, profile_id, note, author_name, author_email, updated_at, created_at")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error loading profile staff notes", error);
    throw error;
  }

  return (data || []).map(normalizeProfileStaffNoteRow);
}

export async function saveProfileStaffNote({
  id,
  profileId,
  note,
  authorName,
  authorEmail,
}) {
  const payload = {
    profile_id: profileId,
    note: String(note || "").trim() || null,
    author_name: String(authorName || "").trim() || null,
    author_email: String(authorEmail || "").trim().toLowerCase() || null,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? supabase.from("profile_staff_notes").update(payload).eq("id", id)
    : supabase.from("profile_staff_notes").insert(payload);

  const { data, error } = await query
    .select("id, profile_id, note, author_name, author_email, updated_at, created_at")
    .single();

  if (error) {
    console.error("Error saving profile staff note", error);
    throw error;
  }

  return normalizeProfileStaffNoteRow(data);
}

export async function deleteProfileStaffNote(id) {
  const { error } = await supabase.from("profile_staff_notes").delete().eq("id", id);

  if (error) {
    console.error("Error deleting profile staff note", error);
    throw error;
  }
}

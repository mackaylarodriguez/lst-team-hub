import { supabase } from "@/lib/supabase";

export const USER_DOCUMENT_BUCKET = "worker-documents";

function normalizeUserDocumentRow(row) {
  return {
    id: row?.id || "",
    userId: row?.user_id || "",
    tripId: row?.trip_id || "",
    documentType: row?.document_type || "",
    title: row?.title || "Document",
    storageBucket: row?.storage_bucket || USER_DOCUMENT_BUCKET,
    storagePath: row?.storage_path || "",
    fileUrl: row?.file_url || "",
    uploadedByUserId: row?.uploaded_by_user_id || "",
    createdAt: row?.created_at || "",
    updatedAt: row?.updated_at || "",
  };
}

function buildSafeFileName(fileName) {
  return `${Date.now()}-${String(fileName || "document").replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

async function enrichUserDocuments(documents) {
  const userIds = [...new Set((documents || []).map((item) => item.userId).filter(Boolean))];
  const tripIds = [...new Set((documents || []).map((item) => item.tripId).filter(Boolean))];

  const [profilesResult, tripsResult] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    tripIds.length > 0
      ? supabase
          .from("trips")
          .select("id, trip_name, location")
          .in("id", tripIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    console.error("Error loading profiles for user documents", profilesResult.error);
    throw profilesResult.error;
  }

  if (tripsResult.error) {
    console.error("Error loading trips for user documents", tripsResult.error);
    throw tripsResult.error;
  }

  const profilesById = new Map(
    (profilesResult.data || []).map((profile) => [
      profile.id,
      {
        id: profile.id,
        email: profile.email || "",
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
          profile.email ||
          "Unknown user",
      },
    ])
  );

  const tripsById = new Map(
    (tripsResult.data || []).map((trip) => [
      trip.id,
      {
        id: trip.id,
        name: trip.trip_name || "Untitled trip",
        location: trip.location || "",
      },
    ])
  );

  return (documents || []).map((document) => ({
    ...document,
    user: profilesById.get(document.userId) || null,
    trip: tripsById.get(document.tripId) || null,
  }));
}

export async function listUserDocuments({ userId, tripId } = {}) {
  let query = supabase
    .from("user_documents")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (tripId) {
    query = query.eq("trip_id", tripId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading user documents", error);
    throw error;
  }

  return (data || []).map(normalizeUserDocumentRow);
}

export async function listProfileDocuments(userId) {
  const documents = await listUserDocuments({ userId });
  return await enrichUserDocuments(documents);
}

export async function listTripUserDocuments(tripId) {
  const documents = await listUserDocuments({ tripId });
  return await enrichUserDocuments(documents);
}

export async function saveUserDocumentUpload({
  userId,
  tripId,
  documentType,
  title,
  file,
  uploadedByUserId,
}) {
  const normalizedType = String(documentType || "").trim().toLowerCase();

  if (!userId) {
    throw new Error("Missing user for document upload.");
  }

  if (!tripId) {
    throw new Error("Missing trip for document upload.");
  }

  if (!normalizedType) {
    throw new Error("Choose a document type.");
  }

  if (!file) {
    throw new Error("Choose a file to upload.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("user_documents")
    .select("id, storage_bucket, storage_path")
    .eq("user_id", userId)
    .eq("trip_id", tripId)
    .eq("document_type", normalizedType)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing user document", existingError);
    throw existingError;
  }

  const storagePath = `${userId}/${tripId}/${normalizedType}/${buildSafeFileName(file?.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(USER_DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading user document", uploadError);
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(USER_DOCUMENT_BUCKET).getPublicUrl(storagePath);

  if (existing?.storage_path) {
    const bucketName = existing.storage_bucket || USER_DOCUMENT_BUCKET;
    const { error: removeExistingError } = await supabase.storage
      .from(bucketName)
      .remove([existing.storage_path]);

    if (removeExistingError) {
      console.error("Error removing existing user document file", removeExistingError);
    }
  }

  const payload = {
    user_id: userId,
    trip_id: tripId,
    document_type: normalizedType,
    title: String(title || file?.name || normalizedType).trim(),
    storage_bucket: USER_DOCUMENT_BUCKET,
    storage_path: storagePath,
    file_url: publicUrl,
    uploaded_by_user_id: uploadedByUserId || userId,
    updated_at: new Date().toISOString(),
  };

  const query = existing
    ? supabase.from("user_documents").update(payload).eq("id", existing.id)
    : supabase.from("user_documents").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    console.error("Error saving user document row", error);
    throw error;
  }

  return normalizeUserDocumentRow(data);
}

export async function deleteUserDocument(id) {
  const { data: existing, error: existingError } = await supabase
    .from("user_documents")
    .select("id, storage_bucket, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    console.error("Error loading existing user document for delete", existingError);
    throw existingError;
  }

  const { error } = await supabase.from("user_documents").delete().eq("id", id);

  if (error) {
    console.error("Error deleting user document", error);
    throw error;
  }

  if (existing?.storage_path) {
    const { error: removeError } = await supabase.storage
      .from(existing.storage_bucket || USER_DOCUMENT_BUCKET)
      .remove([existing.storage_path]);

    if (removeError) {
      console.error("Error removing user document file", removeError);
    }
  }
}

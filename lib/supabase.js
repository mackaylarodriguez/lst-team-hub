import { getSupabaseClient } from "@/lib/supabaseClient";

export const supabase = {
  from(...args) {
    return getSupabaseClient().from(...args);
  },
  get storage() {
    return getSupabaseClient().storage;
  },
  get auth() {
    return getSupabaseClient().auth;
  },
};

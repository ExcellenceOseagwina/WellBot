const { createClient } = require("@supabase/supabase-js");

function isRealConfigValue(value) {
  if (!value || typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  return !(
    normalized.includes("your-project") ||
    normalized.includes("your_supabase") ||
    normalized.startsWith("change_this")
  );
}

let supabase = null;

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!isRealConfigValue(url) || !isRealConfigValue(serviceRoleKey)) {
    return null;
  }

  return createClient(url.trim(), serviceRoleKey.trim());
}

supabase = createSupabaseClient();

async function ensureSupabaseReady() {
  if (!supabase) return null;

  try {
    const { error } = await supabase.from("students").select("id").limit(1);
    if (error) throw error;
    return supabase;
  } catch (error) {
    console.warn(
      `Supabase is configured but unreachable (${error.message}). Using in-memory storage instead.`
    );
    supabase = null;
    return null;
  }
}

module.exports = {
  get supabase() {
    return supabase;
  },
  ensureSupabaseReady
};

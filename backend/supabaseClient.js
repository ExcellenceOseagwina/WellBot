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

function isRetriableDbError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket")
  );
}

let supabase = null;

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (process.env.USE_MEMORY_DB === "true") {
    return null;
  }

  if (!isRealConfigValue(url) || !isRealConfigValue(serviceRoleKey)) {
    return null;
  }

  return createClient(url.trim(), serviceRoleKey.trim());
}

supabase = createSupabaseClient();

function disableSupabase(reason) {
  if (!supabase) return;
  console.warn(`Supabase disabled (${reason}). Using in-memory storage.`);
  supabase = null;
}

async function ensureSupabaseReady() {
  if (!supabase) return null;

  try {
    const { error } = await supabase.from("students").select("id").limit(1);
    if (error) throw error;
    return supabase;
  } catch (error) {
    disableSupabase(error.message);
    return null;
  }
}

module.exports = {
  get supabase() {
    return supabase;
  },
  disableSupabase,
  isRetriableDbError,
  ensureSupabaseReady
};

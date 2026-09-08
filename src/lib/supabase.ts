import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL:", supabaseUrl);
console.log(
  "SUPABASE KEY LOADED:",
  Boolean(supabaseKey),
);
console.log(
  "SUPABASE KEY LENGTH:",
  supabaseKey ? supabaseKey.length : 0,
);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
);
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded coordinator accounts for validation in the edge function, matching the frontend.
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "nextron@2026",
};

const COORDINATOR_ACCOUNTS = [
  { username: "paper", password: "paper@2026" },
  { username: "project", password: "project@2026" },
  { username: "codedebug", password: "code@2026" },
  { username: "techquiz", password: "techquiz@2026" },
  { username: "logodesign", password: "logo@2026" },
  { username: "ideathon", password: "ideathon@2026" },
  { username: "webdesign", password: "web@2026" },
  { username: "electrocharades", password: "electro@2026" },
  { username: "aivideo", password: "aivideo@2026" },
  { username: "freefire", password: "freefire@2026" },
  { username: "bgmi", password: "bgmi@2026" },
  { username: "photo", password: "photo@2026" },
  { username: "treasure", password: "treasure@2026" },
  { username: "reels", password: "reels@2026" },
  { username: "meme", password: "meme@2026" },
  { username: "cinequiz", password: "cine@2026" },
  { username: "actguess", password: "act@2026" },
];

function isValidLogin(username: string, password: string): boolean {
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    return true;
  }
  return COORDINATOR_ACCOUNTS.some(
    (acc) => acc.username === username && acc.password === password
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { path, username, password } = await req.json();

    if (!path || !username || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidLogin(username.trim(), password)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // MUST use service role key to bypass RLS since the bucket is private
    // and the requesting user is anonymous in the context of Supabase Auth.
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Create a 60-second signed URL
    const { data, error } = await supabase.storage
      .from("id-cards")
      .createSignedUrl(path, 60);

    if (error || !data) {
      console.error("Signed URL generation failed:", error);
      return new Response(JSON.stringify({ error: "Failed to generate signed URL." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-id-card-url error:", err);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

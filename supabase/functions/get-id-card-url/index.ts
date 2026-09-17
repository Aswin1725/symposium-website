// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { path, bucket, token, username, password } = await req.json();

    if (!path || (!token && (!username || !password))) {
      return new Response(JSON.stringify({ error: "Missing required authentication fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let userRecord: { id: string; role: string; assigned_events: string[]; is_active?: boolean } | null = null;

    // 1. Authenticate via token (Primary)
    if (token) {
      const { data: valRes, error: valErr } = await supabase.rpc("app_validate_session", {
        p_token: token,
      });

      if (valErr || !valRes || !valRes.valid || !valRes.user) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired session." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userRecord = valRes.user;
    } else if (username && password) {
      // 2. Fallback direct credentials check
      const { data: loginRes, error: loginErr } = await supabase.rpc("app_login", {
        p_login: username.trim(),
        p_password: password,
      });

      if (loginErr || !loginRes || !loginRes.success || !loginRes.user) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid credentials." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userRecord = loginRes.user;
    }

    if (!userRecord) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Authorization Check
    // Admin has access to all files.
    // Coordinator has access ONLY to files belonging to registrations for their assigned events.
    if (userRecord.role !== "admin") {
      const regId = path.split("/")[0];
      const { data: reg, error: regErr } = await supabase
        .from("registrations")
        .select("events(name)")
        .eq("id", regId)
        .single();

      const eventName = reg?.events?.name;
      const assigned = userRecord.assigned_events || [];

      if (regErr || !eventName || !assigned.includes(eventName)) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: You are not assigned to this event's documents." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 4. Generate signed URL for requested bucket
    const targetBucket = bucket || (path.includes("payment-proof") ? "payment-proofs" : "id-cards");
    const { data: signedData, error: signErr } = await supabase.storage
      .from(targetBucket)
      .createSignedUrl(path, 3600); // 1 hour valid

    if (signErr || !signedData?.signedUrl) {
      console.error("Signed URL generation failed:", signErr);
      return new Response(JSON.stringify({ error: "Failed to generate signed URL." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signedData.signedUrl }), {
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

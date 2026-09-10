// @ts-nocheck
// Supabase Edge Function — create-razorpay-order
// Runs on Deno / Supabase Edge Runtime (never in the browser).
// The Razorpay Key SECRET is read from environment, never sent to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event_name, member_count } = body;

    if (!event_name || typeof member_count !== "number") {
      return new Response(
        JSON.stringify({ error: "event_name and member_count are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const apikey = req.headers.get("apikey") || "";
    const authHeader = req.headers.get("Authorization") || `Bearer ${apikey}`;
    const supabase = createClient(supabaseUrl, apikey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, fee_per_head, fee_type, min_members, max_members, is_active")
      .eq("name", event_name)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (eventErr) {
      console.error("Database query failed:", eventErr);
      return new Response(
        JSON.stringify({ error: `Internal database error during event lookup: ${eventErr.message || JSON.stringify(eventErr)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!eventRow) {
      return new Response(
        JSON.stringify({ error: `Event "${event_name}" not found or inactive.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const minMembers = Number(eventRow.min_members);
    const maxMembers = Number(eventRow.max_members);

    if (member_count < minMembers || member_count > maxMembers) {
      return new Response(
        JSON.stringify({
          error: `${event_name} requires ${minMembers}-${maxMembers} member(s). Got ${member_count}.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fee = Number(eventRow.fee_per_head);
    const feeType = String(eventRow.fee_type ?? "per_head").trim().toLowerCase();
    const amountINR = feeType === "per_team" ? fee : fee * member_count;
    const amountPaise = Math.round(amountINR * 100);

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `nextron-${Date.now()}`,
        notes: {
          event_name,
          member_count: String(member_count),
        },
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      console.error("Razorpay order creation failed:", errBody);
      return new Response(
        JSON.stringify({ error: "Failed to create payment order. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const order = await razorpayRes.json();

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: amountINR,
        amount_paise: amountPaise,
        currency: "INR",
        key_id: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-razorpay-order error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

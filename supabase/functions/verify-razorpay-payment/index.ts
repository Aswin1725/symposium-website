// @ts-nocheck
// Supabase Edge Function — verify-razorpay-payment
// 1. Verifies Razorpay HMAC-SHA256 signature (server-side only)
// 2. Inserts registration, members, and payment into Supabase
// 3. Returns the registration number

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function makeRegistrationNumber(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `NEX-${n}`;
}

async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const payload = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, msgData);
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      registration_data,
    } = body;

    // -------------------------------------------------------------------------
    // Validate required fields
    // -------------------------------------------------------------------------
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Razorpay payment fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment gateway not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // Verify HMAC signature
    // -------------------------------------------------------------------------
    const isValid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret,
    );

    if (!isValid) {
      console.error("Invalid Razorpay signature for order:", razorpay_order_id);
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification failed. Signature mismatch." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // Signature verified — now look up event and recalculate amount
    // -------------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const apikey = req.headers.get("apikey") || "";
    const authHeader = req.headers.get("Authorization") || `Bearer ${apikey}`;
    const supabase = createClient(supabaseUrl, apikey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { event_name, team_name, college_name, members } = registration_data;
    const memberCount = Array.isArray(members) ? members.length : 0;

    const { data: eventRow, error: eventErr } = await supabase
      .from("events")
      .select("id, fee_per_head, fee_type, min_members, max_members")
      .eq("name", event_name)
      .limit(1)
      .single();

    if (eventErr) {
      console.error("Database query failed:", eventErr);
      return new Response(
        JSON.stringify({ success: false, error: "Internal database error during event lookup." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!eventRow) {
      return new Response(
        JSON.stringify({ success: false, error: `Event "${event_name}" not found.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fee = Number(eventRow.fee_per_head);
    const feeType = String(eventRow.fee_type ?? "per_head").trim().toLowerCase();
    const amount = feeType === "per_team" ? fee : fee * memberCount;
    const eventId = Number(eventRow.id);

    // -------------------------------------------------------------------------
    // Insert registration
    // -------------------------------------------------------------------------
    const registration_number = makeRegistrationNumber();

    const { data: regRow, error: regErr } = await supabase
      .from("registrations")
      .insert({
        registration_number,
        event_id: eventId,
        team_name,
        college_name,
        amount,
        registration_status: "ACCEPTED",
      })
      .select("id")
      .single();

    if (regErr || !regRow) {
      console.error("Registration insert failed:", regErr);
      return new Response(
        JSON.stringify({ success: false, error: `Registration insert failed: ${regErr?.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const regId = regRow.id;

    // -------------------------------------------------------------------------
    // Insert members (id_card_path = uploaded before edge function is called)
    // -------------------------------------------------------------------------
    const memberInserts = members.map((m: { name: string; phone: string; email: string; id_card_path?: string | null }, idx: number) => ({
      registration_id: regId,
      member_number: idx + 1,
      full_name: m.name,
      phone: m.phone,
      email: m.email,
      id_card_path: m.id_card_path || null,
    }));

    const { error: memberErr } = await supabase.from("members").insert(memberInserts);

    if (memberErr) {
      console.error("Members insert failed:", memberErr);
      return new Response(
        JSON.stringify({ success: false, error: `Members insert failed: ${memberErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // -------------------------------------------------------------------------
    // Insert payment record
    // -------------------------------------------------------------------------
    const { error: payErr } = await supabase.from("payments").insert({
      registration_id: regId,
      amount,
      utr_number: razorpay_payment_id,      // store payment ID here for backwards compat
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_status: "VERIFIED",
    });

    if (payErr) {
      console.error("Payment insert failed:", payErr);
      // Non-fatal: registration is created, payment just didn't record
      // Log but still return success so user gets their reg number
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration_number,
        registration_id: regId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-razorpay-payment error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

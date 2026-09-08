// ---------------------------------------------------------------------------
// payment.ts
// Client-side helpers for the Razorpay payment flow.
// ---------------------------------------------------------------------------
// SECURITY:
//   - VITE_RAZORPAY_KEY_ID  → safe to expose (public key)
//   - RAZORPAY_KEY_SECRET   → NEVER here; lives only in Edge Function secrets
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase";
import { uploadIdCard } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RegistrationMember = {
  name: string;
  phone: string;
  email: string;
  idCardFile: File | null;
  idCardName: string;
};

export type PayRegistrationInput = {
  event: string;
  teamName: string;
  college: string;
  members: RegistrationMember[];
};

// ---------------------------------------------------------------------------
// Dynamically load the Razorpay checkout script
// ---------------------------------------------------------------------------

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Step 1: Call Edge Function to create a Razorpay order (server-side)
// ---------------------------------------------------------------------------

async function createRazorpayOrder(
  eventName: string,
  memberCount: number,
): Promise<{
  order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id: string;
}> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? "";

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken || anonKey}`,
    },
    body: JSON.stringify({ event_name: eventName, member_count: memberCount }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Failed to create payment order.");
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Step 2: Open Razorpay Checkout
// ---------------------------------------------------------------------------

function openRazorpayCheckout(params: {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (response: RazorpayHandlerResponse) => void;
  onDismiss: () => void;
}): void {
  // @ts-expect-error — Razorpay is loaded via script tag
  const rzp = new window.Razorpay({
    key: params.key,
    amount: params.amount,
    currency: params.currency,
    name: "NEXTRON 2026",
    description: params.description,
    order_id: params.orderId,
    prefill: params.prefill ?? {},
    theme: { color: "#1257B8" },
    modal: {
      ondismiss: params.onDismiss,
    },
    handler: params.onSuccess,
  });
  rzp.open();
}

// ---------------------------------------------------------------------------
// Step 3: Verify payment + save registration via Edge Function
// ---------------------------------------------------------------------------

async function verifyAndSaveRegistration(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  registration_data: {
    event_name: string;
    team_name: string;
    college_name: string;
    members: { name: string; phone: string; email: string }[];
  };
}): Promise<{ success: boolean; registration_number: string; registration_id: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? "";

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const res = await fetch(`${supabaseUrl}/functions/v1/verify-razorpay-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken || anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "Payment verification failed.");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Step 4: Upload ID cards to Supabase Storage and patch members table
// ---------------------------------------------------------------------------

async function uploadIdCardsAndPatch(
  regId: string,
  members: RegistrationMember[],
): Promise<void> {
  await Promise.all(
    members.map(async (m, idx) => {
      if (!m.idCardFile) return;

      try {
        const path = await uploadIdCard(regId, idx, m.idCardFile);

        // Patch the id_card_path for this member (member_number is 1-based)
        await supabase
          .from("members")
          .update({ id_card_path: path })
          .eq("registration_id", regId)
          .eq("member_number", idx + 1);
      } catch (err) {
        // Non-fatal: log but don't block the success screen
        console.error(`ID card upload failed for member ${idx + 1}:`, err);
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Main exported function: full pay + register flow
// ---------------------------------------------------------------------------

export async function payAndRegister(
  data: PayRegistrationInput,
  callbacks: {
    onPaymentStarted: () => void;
    onPaymentCancelled: () => void;
    onSuccess: (regNumber: string) => void;
    onError: (message: string) => void;
  },
): Promise<void> {
  // 1. Load Razorpay checkout.js
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    callbacks.onError("Could not load the payment gateway. Please check your internet connection.");
    return;
  }

  // 2. Create server-side order
  let order: Awaited<ReturnType<typeof createRazorpayOrder>>;
  try {
    order = await createRazorpayOrder(data.event, data.members.length);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : "Failed to create payment order.");
    return;
  }

  callbacks.onPaymentStarted();

  // 3. Open Razorpay Checkout
  const firstMember = data.members[0];
  openRazorpayCheckout({
    key: order.key_id,
    amount: order.amount_paise,
    currency: order.currency,
    orderId: order.order_id,
    name: "NEXTRON 2026",
    description: `${data.event} Registration`,
    prefill: {
      name: firstMember?.name,
      email: firstMember?.email,
      contact: firstMember?.phone,
    },
    onDismiss: () => {
      callbacks.onPaymentCancelled();
    },
    onSuccess: async (response) => {
      // 4. Verify payment server-side + save registration
      try {
        const result = await verifyAndSaveRegistration({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          registration_data: {
            event_name: data.event,
            team_name: data.teamName,
            college_name: data.college,
            members: data.members.map((m) => ({
              name: m.name,
              phone: m.phone,
              email: m.email,
            })),
          },
        });

        // 5. Upload ID cards in background (non-blocking for success screen)
        uploadIdCardsAndPatch(result.registration_id, data.members).catch(
          (err) => console.error("ID card upload error:", err),
        );

        callbacks.onSuccess(result.registration_number);
      } catch (err) {
        callbacks.onError(
          err instanceof Error ? err.message : "Payment succeeded but registration failed. Please contact coordinators.",
        );
      }
    },
  });
}

import { supabase } from "@/lib/supabase";

const ID_CARDS_BUCKET = "id-cards";
const PAYMENT_PROOFS_BUCKET = "payment-proofs";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Upload a college ID card image to the private `id-cards` bucket.
 */
export async function uploadIdCard(
  regId: string,
  memberIndex: number,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${regId}/member-${memberIndex}.${ext}`;

  const { error } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    throw new Error(`ID card upload failed: ${error.message}`);
  }

  return path;
}

/**
 * Upload a payment proof screenshot to the private `payment-proofs` bucket
 * under `${regId}/payment-proof.${ext}`.
 */
export async function uploadPaymentProof(
  regId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${regId}/payment-proof.${ext}`;

  const { error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    console.error("Payment proof upload failed:", error.message);
    throw new Error(`Payment proof upload failed: ${error.message}`);
  }

  return path;
}

/**
 * Generate a signed URL for a private ID card using the Edge Function or Storage API.
 */
export async function getIdCardSignedUrl(
  path: string | null,
  token?: string | null,
): Promise<string> {
  if (!path) return "";

  const effectiveToken =
    token ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("nextron_session_token")
      : null);

  if (effectiveToken) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-id-card-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          path,
          bucket: ID_CARDS_BUCKET,
          token: effectiveToken,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return json.url;
      }
    } catch (err) {
      console.warn("Edge function signed URL error, falling back:", err);
    }
  }

  const { data } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .createSignedUrl(path, 3600);

  return data?.signedUrl || "";
}

/**
 * Generate a signed URL for a private payment proof screenshot using the Edge Function.
 * Validates coordinator event scoping or admin access.
 */
export async function getPaymentProofSignedUrl(
  path: string | null,
  token?: string | null,
): Promise<string> {
  if (!path) return "";

  const effectiveToken =
    token ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("nextron_session_token")
      : null);

  if (effectiveToken) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-id-card-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          path,
          bucket: PAYMENT_PROOFS_BUCKET,
          token: effectiveToken,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return json.url;
      }
    } catch (err) {
      console.warn("Edge function signed URL error, falling back:", err);
    }
  }

  const { data } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .createSignedUrl(path, 3600);

  return data?.signedUrl || "";
}
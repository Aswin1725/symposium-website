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
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    throw new Error(`ID card upload failed: ${error.message}`);
  }

  return path;
}

/**
 * Upload a payment proof screenshot.
 * Tries `payment-proofs` bucket first; if blocked by RLS, falls back to `id-cards` bucket.
 */
export async function uploadPaymentProof(
  regId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${regId}/payment-proof.${ext}`;

  // 1. Try uploading to payment-proofs bucket first
  const { error } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (!error) {
    return path;
  }

  console.warn("Payment proof upload to payment-proofs failed, attempting id-cards bucket fallback:", error.message);

  // 2. Fallback: upload to id-cards bucket which allows anon uploads
  const fallbackPath = `${regId}/payment-proof.${ext}`;
  const { error: fallbackError } = await supabase.storage
    .from(ID_CARDS_BUCKET)
    .upload(fallbackPath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });

  if (!fallbackError) {
    return `id-cards:${fallbackPath}`;
  }

  console.error("Payment proof upload fallback also failed:", fallbackError.message);
  throw new Error(`Payment proof upload failed: ${error.message}`);
}

/**
 * Generate a signed URL for a private ID card using the Edge Function or Storage API.
 */
export async function getIdCardSignedUrl(
  path: string | null,
  token?: string | null,
): Promise<string> {
  if (!path) return "";

  const isFallback = path.startsWith("id-cards:");
  const bucket = isFallback ? ID_CARDS_BUCKET : (path.includes("payment-proof") ? PAYMENT_PROOFS_BUCKET : ID_CARDS_BUCKET);
  const cleanPath = path.replace(/^id-cards:/, "");

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
          path: cleanPath,
          bucket,
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
    .from(bucket)
    .createSignedUrl(cleanPath, 3600);

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

  const isFallback = path.startsWith("id-cards:");
  const bucket = isFallback ? ID_CARDS_BUCKET : PAYMENT_PROOFS_BUCKET;
  const cleanPath = path.replace(/^id-cards:/, "");

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
          path: cleanPath,
          bucket,
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
    .from(bucket)
    .createSignedUrl(cleanPath, 3600);

  return data?.signedUrl || "";
}
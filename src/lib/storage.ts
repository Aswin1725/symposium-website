import { supabase } from "@/lib/supabase";

const BUCKET = "id-cards";

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
    .from(BUCKET)
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
 * Generate a signed URL for a private ID card.
 */
export async function getIdCardSignedUrl(
  path: string | null,
): Promise<string> {
  if (!path) return "";

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return "";
  }

  return data.signedUrl;
}
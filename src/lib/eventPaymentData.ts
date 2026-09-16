// ---------------------------------------------------------------------------
// eventPaymentData.ts
//
// Maps every event name → UPI ID and QR image path.
//
// QR images must be placed in public/qr/<slug>.png by the organiser.
// When qrImage is null the UI shows "QR code not configured yet" instead
// of a broken or fake image.
//
// When both upiId and qrImage are null (Reels Making) the UI shows
// "Payment configuration not yet available — contact coordinators."
// ---------------------------------------------------------------------------

export type EventPaymentConfig = {
  /** UPI VPA to display and copy. null = not configured yet. */
  upiId: string | null;
  /**
   * Path relative to the public/ root, e.g. "/qr/project.png".
   * null = QR image not yet provided by organiser.
   */
  qrImage: string | null;
};

/**
 * Event name keys MUST match exactly the `name` field in the events[] array
 * in Events.tsx (and the `name` column in the Supabase events table).
 */
export const EVENT_PAYMENT_DATA: Record<string, EventPaymentConfig> = {
  "Project Expo": {
    upiId: "aswinappu2005@ybl",
    qrImage: null, // drop real QR into public/qr/project.png and set to "/qr/project.png"
  },
  "Paper Presentation": {
    upiId: "raghavij2006@okaxis",
    qrImage: null,
  },
  "Code Debugging": {
    upiId: "9985708284-2@ybl",
    qrImage: null,
  },
  "Ideathon": {
    upiId: "udaykiran9392@ybl",
    qrImage: null,
  },
  "Web Design": {
    upiId: "7670973554-2@axl",
    qrImage: null,
  },
  "AI Video Animation & Generation": {
    upiId: "6281325750@superyes",
    qrImage: null,
  },
  "Tech Quiz": {
    upiId: "9100309531-2@ybl",
    qrImage: null,
  },
  "Electro Charades": {
    upiId: "sowjanya0583@axl",
    qrImage: null,
  },
  "Logo Design": {
    upiId: "7842406485@ybl",
    qrImage: null,
  },
  "Photography": {
    upiId: "7995985503@ybl",
    qrImage: null,
  },
  "Treasure Hunt": {
    upiId: "6301861219-2@ybl",
    qrImage: null,
  },
  "Meme Making": {
    upiId: "raavishyamsriram@ybl",
    qrImage: null,
  },
  "Cine Quiz": {
    upiId: "9908382478-2@ybl",
    qrImage: null,
  },
  "Free Fire": {
    upiId: "9959163510@ybl",
    qrImage: null,
  },
  "BGMI": {
    upiId: "9347630150-3@ybl",
    qrImage: null,
  },
  "Act & Guess": {
    upiId: "9390596679@ptsbi",
    qrImage: null,
  },
  // Reels Making: no UPI ID or QR provided yet — marked fully null.
  "Reels Making": {
    upiId: null,
    qrImage: null,
  },
};

/**
 * Convenience helper — returns the payment config for an event, or a
 * fully-null sentinel when the event name is not found in the map.
 */
export function getEventPayment(eventName: string): EventPaymentConfig {
  return EVENT_PAYMENT_DATA[eventName] ?? { upiId: null, qrImage: null };
}

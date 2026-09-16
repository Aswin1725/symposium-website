// ---------------------------------------------------------------------------
// eventPaymentData.ts
//
// Maps every event name → UPI ID and QR image path.
//
// QR images live in public/qr/ and are served as static assets.
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
    qrImage: "/qr/project.png",
  },
  "Paper Presentation": {
    upiId: "raghavij2006@okaxis",
    qrImage: "/qr/paper.png",
  },
  "Code Debugging": {
    upiId: "9985708284-2@ybl",
    qrImage: "/qr/codedebug.png",
  },
  "Ideathon": {
    upiId: "udaykiran9392@ybl",
    qrImage: "/qr/ideathon.png",
  },
  "Web Design": {
    upiId: "7670973554-2@axl",
    qrImage: "/qr/webdesign.png",
  },
  "AI Video Animation & Generation": {
    upiId: "6281325750@superyes",
    qrImage: "/qr/aivideo.png",
  },
  "Tech Quiz": {
    upiId: "9100309531-2@ybl",
    qrImage: "/qr/techquiz.png",
  },
  "Electro Charades": {
    upiId: "sowjanya0583@axl",
    qrImage: "/qr/electrocharades.png",
  },
  "Logo Design": {
    upiId: "7842406485@ybl",
    qrImage: "/qr/logodesign.png",
  },
  "Photography": {
    upiId: "7995985503@ybl",
    qrImage: "/qr/photography.png",
  },
  "Treasure Hunt": {
    upiId: "6301861219-2@ybl",
    qrImage: "/qr/treasure.png",
  },
  "Meme Making": {
    upiId: "raavishyamsriram@ybl",
    qrImage: "/qr/meme.png",
  },
  "Cine Quiz": {
    upiId: "9908382478-2@ybl",
    qrImage: "/qr/cinequiz.png",
  },
  "Free Fire": {
    upiId: "9959163510@ybl",
    qrImage: "/qr/freefire.png",
  },
  "BGMI": {
    upiId: "9347630150-3@ybl",
    qrImage: "/qr/bgmi.png",
  },
  "Act & Guess": {
    upiId: "9390596679@ptsbi",
    qrImage: "/qr/actguess.png",
  },
  // Reels Making:
  "Reels Making": {
    upiId: "6304958303@ybl",
    qrImage: "/qr/reels.png",
  },
};

/**
 * Convenience helper — returns the payment config for an event, or a
 * fully-null sentinel when the event name is not found in the map.
 */
export function getEventPayment(eventName: string): EventPaymentConfig {
  return EVENT_PAYMENT_DATA[eventName] ?? { upiId: null, qrImage: null };
}

// ── Database row shapes ── exactly matching Supabase schema columns ──────────

export type RegStatus = "pending" | "accepted" | "rejected";

/** events table */
export type EventRow = {
  id: number;              // bigint PK
  name: string;
  fee_per_head: number;
  min_members: number;
  max_members: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

/** registrations table */
export type RegistrationRow = {
  id: string;                    // uuid PK
  registration_number: string;   // NEX-XXXXXX user-facing number
  event_id: number;              // bigint FK → events.id
  team_name: string;
  college_name: string;
  amount: number;
  registration_status: string;   // "pending" | "accepted" | "rejected"
  created_at: string;
  updated_at: string;
};

/**
 * Shape returned by Supabase when registrations is queried with
 * .select("*, events(name)") — the joined events row is embedded.
 */
export type RegistrationRowWithEvent = RegistrationRow & {
  events: { name: string } | null;
};

/** members table */
export type MemberRow = {
  id: string;              // uuid PK
  registration_id: string; // FK → registrations.id
  member_number: number;   // 1-based index
  full_name: string;
  phone: string;
  email: string;
  id_card_path: string | null; // storage path in id-cards bucket
  created_at: string;
};

/** payments table */
export type PaymentRow = {
  id: string;              // uuid PK
  registration_id: string; // FK → registrations.id
  amount: number;
  utr_number: string;
  payment_status: string;  // "PENDING" | "VERIFIED" | "FAILED"
  verified_at: string | null;
  verified_by: string | null;
  remarks: string | null;
  created_at: string;
  // Razorpay gateway fields (added after Razorpay integration)
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
};

// ── Frontend-friendly shapes used by existing React components ────────────────

/**
 * Per-member shape used in the registration form (Events.tsx) and dashboards.
 * name maps from DB full_name.
 */
export type Member = {
  name: string;        // mapped from members.full_name
  phone: string;
  email: string;
  /** Signed URL for the private id-cards bucket, or "" if not yet loaded */
  idCard: string;
  idCardName: string;
  /** Raw storage path stored in members.id_card_path */
  idCardPath: string | null;
};

/** Registration shape consumed by AdminDashboard, CoordinatorDashboard, RegistrationStatus */
export type Registration = {
  id: string;                   // uuid — used as React key and for status updates
  registration_number: string;  // NEX-XXXXXX — shown to participants
  event: string;                // event name (from events join)
  teamName: string;
  college: string;
  members: Member[];
  utr: string;                  // from payments.utr_number or razorpay_payment_id
  amount: number;
  status: RegStatus;            // mapped from registration_status
  createdAt: string;
  paymentStatus?: string;       // "PENDING" | "VERIFIED"
  paymentMethod?: string;       // "CASH" | "ONLINE" | "NOT COLLECTED"
};

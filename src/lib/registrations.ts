import { supabase } from "@/lib/supabase";
import {
  getIdCardSignedUrl,
} from "@/lib/storage";

import type {
  Registration,
  Member,
  RegStatus,
  RegistrationRowWithEvent,
  MemberRow,
  PaymentRow,
} from "@/lib/types";
import { uploadIdCard } from "@/lib/storage";

// Re-export types
export type {
  Registration,
  Member,
  RegStatus,
};



// ---------------------------------------------------------------------------
// Convert database registration into frontend registration
// ---------------------------------------------------------------------------

async function assembleRegistration(
  row: RegistrationRowWithEvent,
  memberRows: MemberRow[],
  paymentRow: PaymentRow | null,
  withSignedUrls: boolean,
): Promise<Registration> {
  const members: Member[] =
    await Promise.all(
      memberRows.map(async (m) => ({
        name: m.full_name,
        phone: m.phone,
        email: m.email,

        idCard: withSignedUrls
          ? await getIdCardSignedUrl(
              m.id_card_path,
            )
          : "",

        idCardName: m.id_card_path
          ? m.id_card_path.split("/").pop() ?? ""
          : "",

        idCardPath: m.id_card_path,
      })),
    );

  return {
    id: row.id,

    registration_number:
      row.registration_number,

    event:
      row.events?.name ?? "",

    teamName:
      row.team_name,

    college:
      row.college_name,

    members,

    utr:
      paymentRow?.utr_number ?? "",

    amount:
      row.amount,

    /*
     * Database:
     * PENDING
     * ACCEPTED
     * REJECTED
     *
     * Frontend:
     * pending
     * accepted
     * rejected
     */
    status:
      String(
        row.registration_status ?? "PENDING",
      ).toLowerCase() as RegStatus,

    createdAt:
      row.created_at,

    paymentStatus:
      paymentRow?.payment_status ?? "PENDING",

    paymentMethod:
      paymentRow?.remarks ??
      (paymentRow?.payment_status === "VERIFIED" ? "ONLINE" : "NOT COLLECTED"),
  };
}

// ---------------------------------------------------------------------------
// saveRegistration has been removed.
//
// Registration creation is now handled server-side by the
// verify-razorpay-payment Supabase Edge Function after successful payment.
//
// See: src/lib/payment.ts → payAndRegister()
// ---------------------------------------------------------------------------

export async function registerDirectly(payload: {
  event: string;
  teamName: string;
  college: string;
  members: { name: string; phone: string; email: string; idCardFile: File | null }[];
  totalAmount: number;
}): Promise<{ registration_number: string }> {
  // 1. Generate unique registration number
  const regNum = "NEX-" + Math.floor(Math.random() * 900000 + 100000);

  // 2. Fetch event ID
  const { data: evData, error: evErr } = await supabase
    .from("events")
    .select("id")
    .eq("name", payload.event)
    .single();

  if (evErr || !evData) throw new Error("Event not found");

  // 3. Create registration
  const { data: regData, error: regErr } = await supabase
    .from("registrations")
    .insert({
      registration_number: regNum,
      event_id: evData.id,
      team_name: payload.teamName,
      college_name: payload.college,
      amount: payload.totalAmount,
      registration_status: "ACCEPTED", // As requested: save ACCEPTED in DB
    })
    .select("id")
    .single();

  if (regErr || !regData) throw new Error("Failed to create registration: " + (regErr?.message || ""));

  const regId = regData.id;

  // 4. Upload ID cards using registration ID as folder
  const memberPaths = await Promise.all(
    payload.members.map(async (m, idx) => {
      if (!m.idCardFile) return null;
      return await uploadIdCard(regId, idx, m.idCardFile);
    })
  );

  // 5. Insert members
  const memberInserts = payload.members.map((m, idx) => ({
    registration_id: regId,
    member_number: idx + 1,
    full_name: m.name,
    phone: m.phone,
    email: m.email,
    id_card_path: memberPaths[idx],
  }));

  const { error: memErr } = await supabase.from("members").insert(memberInserts);
  if (memErr) throw new Error("Failed to save members: " + memErr.message);

  // 6. Insert payment as PENDING and NOT COLLECTED
  const { error: payErr } = await supabase.from("payments").insert({
    registration_id: regId,
    amount: payload.totalAmount,
    payment_status: "PENDING",
    remarks: "NOT COLLECTED",
    utr_number: "PAY_AT_EVENT",
  });
  if (payErr) throw new Error("Failed to save payment status: " + payErr.message);

  return { registration_number: regNum };
}

// ---------------------------------------------------------------------------
// Find one registration
// ---------------------------------------------------------------------------

export async function findRegistration(
  query: string,
): Promise<
  Registration | undefined
> {
  const q =
    query
      .trim()
      .toUpperCase();

  const {
    data: regRows,
    error,
  } = await supabase
    .from("registrations")
    .select("*, events(name)")
    .eq(
      "registration_number",
      q,
    )
    .limit(1);

  if (
    error ||
    !regRows ||
    regRows.length === 0
  ) {
    return undefined;
  }

  const row =
    regRows[0] as RegistrationRowWithEvent;

  // -------------------------------------------------------------------------
  // Get members + payment
  // -------------------------------------------------------------------------

  const [
    { data: memberRows },
    { data: paymentRows },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq(
        "registration_id",
        row.id,
      )
      .order(
        "member_number",
      ),

    supabase
      .from("payments")
      .select("*")
      .eq(
        "registration_id",
        row.id,
      )
      .limit(1),
  ]);

  return assembleRegistration(
    row,

    (memberRows ??
      []) as MemberRow[],

    ((paymentRows ??
      [])[0] ??
      null) as PaymentRow | null,

    false,
  );
}

// ---------------------------------------------------------------------------
// Get all registrations
// ---------------------------------------------------------------------------

export async function getAllRegistrations(): Promise<
  Registration[]
> {
  const {
    data: regRows,
    error,
  } = await supabase
    .from("registrations")
    .select("*, events(name)")
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    console.error(
      "Failed to fetch registrations:",
      error,
    );

    throw new Error(
      `Failed to fetch registrations: ${error.message}`,
    );
  }

  if (
    !regRows ||
    regRows.length === 0
  ) {
    return [];
  }

  const registrationRows =
    regRows as RegistrationRowWithEvent[];

  const regIds =
    registrationRows.map(
      (r) => r.id,
    );

  // -------------------------------------------------------------------------
  // Get members + payments
  // -------------------------------------------------------------------------

  const [
    {
      data: allMembers,
      error: membersError,
    },
    {
      data: allPayments,
      error: paymentsError,
    },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .in(
        "registration_id",
        regIds,
      ),

    supabase
      .from("payments")
      .select("*")
      .in(
        "registration_id",
        regIds,
      ),
  ]);

  if (membersError) {
    console.error(
      "Failed to fetch members:",
      membersError,
    );

    throw new Error(
      `Failed to fetch members: ${membersError.message}`,
    );
  }

  if (paymentsError) {
    console.error(
      "Failed to fetch payments:",
      paymentsError,
    );

    throw new Error(
      `Failed to fetch payments: ${paymentsError.message}`,
    );
  }

  // -------------------------------------------------------------------------
  // Group members
  // -------------------------------------------------------------------------

  const membersMap =
    groupBy(
      (allMembers ??
        []) as MemberRow[],
      (m) =>
        m.registration_id,
    );

  // -------------------------------------------------------------------------
  // Group payments
  // -------------------------------------------------------------------------

  const paymentsMap: Record<
    string,
    PaymentRow
  > =
    Object.fromEntries(
      (
        (allPayments ??
          []) as PaymentRow[]
      ).map((p) => [
        p.registration_id,
        p,
      ]),
    );

  // -------------------------------------------------------------------------
  // Assemble registrations
  // -------------------------------------------------------------------------

  return Promise.all(
    registrationRows.map(
      (row) =>
        assembleRegistration(
          row,

          membersMap[
            row.id
          ] ?? [],

          paymentsMap[
            row.id
          ] ?? null,

          true,
        ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Get registrations by event
// ---------------------------------------------------------------------------

export async function getRegistrationsByEvent(
  event: string,
): Promise<Registration[]> {
  // -------------------------------------------------------------------------
  // Find event
  //
  // IMPORTANT:
  // Do NOT require is_active here.
  //
  // The admin dashboard should be able to export registrations
  // that already exist for an event.
  // -------------------------------------------------------------------------

  const {
    data: eventRows,
    error: eventErr,
  } = await supabase
    .from("events")
    .select("id, name")
    .eq("name", event)
    .limit(1);

  if (eventErr) {
    console.error(
      "Failed to find event:",
      eventErr,
    );

    return [];
  }

  if (
    !eventRows ||
    eventRows.length === 0
  ) {
    console.error(
      `Event "${event}" was not found.`,
    );

    return [];
  }

  const eventId =
    Number(eventRows[0].id);

  // -------------------------------------------------------------------------
  // Get registrations
  // -------------------------------------------------------------------------

  const {
    data: regRows,
    error,
  } = await supabase
    .from("registrations")
    .select("*, events(name)")
    .eq(
      "event_id",
      eventId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    console.error(
      "Failed to get registrations for event:",
      error,
    );

    return [];
  }

  if (
    !regRows ||
    regRows.length === 0
  ) {
    console.log(
      `No registrations found for event "${event}".`,
    );

    return [];
  }

  const registrationRows =
    regRows as RegistrationRowWithEvent[];

  const regIds =
    registrationRows.map(
      (r) => r.id,
    );

  // -------------------------------------------------------------------------
  // Get members + payments
  // -------------------------------------------------------------------------

  const [
    {
      data: allMembers,
      error: membersError,
    },
    {
      data: allPayments,
      error: paymentsError,
    },
  ] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .in(
        "registration_id",
        regIds,
      ),

    supabase
      .from("payments")
      .select("*")
      .in(
        "registration_id",
        regIds,
      ),
  ]);

  if (membersError) {
    console.error(
      "Failed to get members for Excel export:",
      membersError,
    );
  }

  if (paymentsError) {
    console.error(
      "Failed to get payments for Excel export:",
      paymentsError,
    );
  }

  // -------------------------------------------------------------------------
  // Group members
  // -------------------------------------------------------------------------

  const membersMap =
    groupBy(
      (allMembers ??
        []) as MemberRow[],
      (m) =>
        m.registration_id,
    );

  // -------------------------------------------------------------------------
  // Group payments
  // -------------------------------------------------------------------------

  const paymentsMap: Record<
    string,
    PaymentRow
  > =
    Object.fromEntries(
      (
        (allPayments ??
          []) as PaymentRow[]
      ).map((p) => [
        p.registration_id,
        p,
      ]),
    );

  // -------------------------------------------------------------------------
  // Assemble registrations
  //
  // Signed ID-card URLs are NOT required for Excel.
  // The Excel file only needs the ID card filename.
  // -------------------------------------------------------------------------

  return Promise.all(
    registrationRows.map(
      (row) =>
        assembleRegistration(
          row,

          membersMap[
            row.id
          ] ?? [],

          paymentsMap[
            row.id
          ] ?? null,

          false,
        ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Accept / Reject registration
// ---------------------------------------------------------------------------

export async function setRegistrationStatus(
  id: string,
  status: RegStatus,
): Promise<void> {
  /*
   * Frontend:
   *   pending
   *   accepted
   *   rejected
   *
   * Database:
   *   PENDING
   *   ACCEPTED
   *   REJECTED
   */

  const dbStatus =
    String(status)
      .trim()
      .toUpperCase();

  // -------------------------------------------------------------------------
  // Validate status
  // -------------------------------------------------------------------------

  if (
    dbStatus !== "PENDING" &&
    dbStatus !== "ACCEPTED" &&
    dbStatus !== "REJECTED"
  ) {
    throw new Error(
      `Invalid registration status: ${status}`,
    );
  }

  // -------------------------------------------------------------------------
  // Validate registration ID
  // -------------------------------------------------------------------------

  if (!id) {
    throw new Error(
      "Registration ID is missing.",
    );
  }

  // -------------------------------------------------------------------------
  // Call Supabase RPC
  // -------------------------------------------------------------------------

  const {
    data,
    error,
  } = await supabase.rpc(
    "set_registration_status",
    {
      p_registration_id: id,
      p_status: dbStatus,
    },
  );

  // -------------------------------------------------------------------------
  // Handle Supabase error
  // -------------------------------------------------------------------------

  if (error) {
    console.error(
      "set_registration_status RPC error:",
      error,
    );

    throw new Error(
      `Status update failed: ${error.message}`,
    );
  }

  // -------------------------------------------------------------------------
  // Verify response
  // -------------------------------------------------------------------------

  if (
    !data ||
    data.success !== true
  ) {
    console.error(
      "Unexpected RPC response:",
      data,
    );

    throw new Error(
      "Registration status update failed.",
    );
  }

  console.log(
    "Registration status updated successfully:",
    data,
  );
}

// ---------------------------------------------------------------------------
// Payment verification
// ---------------------------------------------------------------------------

export function isPaymentVerified(
  r: Registration,
): boolean {
  return (
    r.paymentStatus?.toUpperCase() === "VERIFIED"
  );
}

// ---------------------------------------------------------------------------
// Collect Payment at Event
// ---------------------------------------------------------------------------

export async function collectPayment(
  registrationId: string,
  method: "CASH" | "ONLINE",
  collectedBy?: string,
  amount?: number,
): Promise<void> {
  if (!registrationId) {
    throw new Error("Registration ID is missing.");
  }

  const { data, error } = await supabase
    .from("payments")
    .update({
      payment_status: "VERIFIED",
      remarks: method,
      verified_at: new Date().toISOString(),
      verified_by: collectedBy || "COORDINATOR",
    })
    .eq("registration_id", registrationId)
    .select();

  if (error) {
    console.error("Failed to collect payment:", error);
    throw new Error(`Failed to update payment status: ${error.message}`);
  }

  // If no payment row existed for this registration, insert one with amount
  if (!data || data.length === 0) {
    let finalAmount = amount;
    if (finalAmount === undefined || finalAmount === null) {
      const { data: regRow } = await supabase
        .from("registrations")
        .select("amount")
        .eq("id", registrationId)
        .single();
      finalAmount = regRow?.amount ?? 0;
    }

    const { error: insErr } = await supabase.from("payments").insert({
      registration_id: registrationId,
      amount: finalAmount,
      payment_status: "VERIFIED",
      remarks: method,
      verified_at: new Date().toISOString(),
      verified_by: collectedBy || "COORDINATOR",
      utr_number: method === "CASH" ? "CASH_COLLECTED" : "ONLINE_COLLECTED",
    });
    if (insErr) {
      console.error("Failed to insert payment record:", insErr);
      throw new Error(`Failed to insert payment record: ${insErr.message}`);
    }
  }
}


// ---------------------------------------------------------------------------
// Group helper
// ---------------------------------------------------------------------------

function groupBy<T>(
  arr: T[],
  key: (item: T) => string,
): Record<string, T[]> {
  return arr.reduce<
    Record<string, T[]>
  >(
    (acc, item) => {
      const k = key(item);

      (acc[k] ??= []).push(item);

      return acc;
    },
    {},
  );
}
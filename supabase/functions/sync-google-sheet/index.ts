// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9.6.3";
import { GoogleSpreadsheet } from "npm:google-spreadsheet@4.1.1";

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
const GOOGLE_SPREADSHEET_ID = Deno.env.get("GOOGLE_SPREADSHEET_ID");
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://symposium-website-steel.vercel.app";

const CLEAN_EVENT_HEADERS = [
  "Registration Number",
  "Event Name",
  "Team Name",
  "College Name",
  "Team Size",
  "Amount Paid",
  "Total Amount Paid",
  "Payment Status",
  "Registration Status",
  "Payment Method",
  "Collection Date/Time",
  "UTR",
  "Razorpay Payment ID",
  "Razorpay Order ID",
  "Registration Date",
  "Registration Date/Time",
  "Member 1 Name", "Member 1 Phone", "Member 1 Email", "Member 1 ID Card",
  "Member 2 Name", "Member 2 Phone", "Member 2 Email", "Member 2 ID Card",
  "Member 3 Name", "Member 3 Phone", "Member 3 Email", "Member 3 ID Card",
  "Member 4 Name", "Member 4 Phone", "Member 4 Email", "Member 4 ID Card",
];

const CLEAN_SUMMARY_HEADERS = [
  "Registration Number",
  "Event Name",
  "Team Name",
  "College Name",
  "Total Amount Paid",
  "Payment Status",
  "Registration Status",
  "Payment Method",
  "Collection Date/Time",
  "UTR",
  "Razorpay Payment ID",
  "Razorpay Order ID",
  "Registration Date",
  "Registration Date/Time"
];

Deno.serve(async (req: Request) => {
  try {
    // 1. Verify Webhook Secret
    const authHeader = req.headers.get("Authorization");
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!GOOGLE_SERVICE_ACCOUNT_JSON || !GOOGLE_SPREADSHEET_ID) {
      console.error("Google Sheets configuration missing.");
      return new Response("Configuration missing", { status: 500 });
    }

    const payload = await req.json();
    console.log("Webhook payload:", JSON.stringify(payload));

    const { type, table, record, reset_headers } = payload;
    
    // Ignore DELETE events
    if (type === "DELETE") {
      return new Response("Ignored DELETE event", { status: 200 });
    }

    // 2. Extract Registration ID
    let registration_id = null;
    if (table === "registrations") {
      registration_id = record.id;
    } else if (table === "members" || table === "payments") {
      registration_id = record.registration_id;
    }

    if (!registration_id) {
      return new Response("No registration_id found", { status: 400 });
    }

    // 3. Fetch Aggregate Registration Data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .select("*, events(name)")
      .eq("id", registration_id)
      .single();

    if (regErr || !reg) {
      console.error("Failed to fetch aggregate registration:", regErr);
      return new Response(JSON.stringify({ 
        success: false, 
        registration_id: registration_id,
        operation: "SKIPPED",
        message: "Database fetch error: " + JSON.stringify(regErr || "No record found") 
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const { data: members } = await supabase
      .from("members")
      .select("*")
      .eq("registration_id", registration_id)
      .order("member_number", { ascending: true });
      
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("registration_id", registration_id)
      .order("created_at", { ascending: false });

    const fullReg = {
      ...reg,
      members: members || [],
      payments: payments || []
    };

    // 4. Validate Completeness (Don't sync incomplete registrations)
    if (!fullReg.members || fullReg.members.length === 0 || !fullReg.payments || fullReg.payments.length === 0) {
      console.log("Registration is incomplete. Skipping sync until members and payment are inserted.");
      return new Response(JSON.stringify({
        success: true,
        registration_id: registration_id,
        registration_number: fullReg.registration_number,
        event_name: fullReg.events?.name || "Unknown",
        operation: "SKIPPED",
        message: "Registration is incomplete (missing members or payments)"
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 5. Construct Google Sheet Row Data
    const eventName = fullReg.events?.name;
    if (!eventName) {
      console.error("Event name missing");
      return new Response(JSON.stringify({
        success: false,
        registration_id: registration_id,
        registration_number: fullReg.registration_number,
        operation: "SKIPPED",
        message: "Missing event name in registration data"
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const sortedMembers = fullReg.members;
    const pay = Array.isArray(fullReg.payments) ? (fullReg.payments[0] || {}) : (fullReg.payments || {});
    
    const formattedDate = fullReg.created_at ? new Date(fullReg.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "";

    const rowData: Record<string, string | number> = {
      "Registration Number": fullReg.registration_number,
      "Registration Num": fullReg.registration_number,
      "Event Name": eventName,
      "Team Name": fullReg.team_name || "N/A",
      "College Name": fullReg.college_name || "N/A",
      "Team Size": sortedMembers.length || 0,
      "Amount Paid": fullReg.amount || 0,
      "Total Amount Paid": fullReg.amount || 0,
      "Payment Status": pay.payment_status || "PENDING",
      "Registration Status": fullReg.registration_status || "ACCEPTED",
      "Payment Method": pay.remarks || "NOT COLLECTED",
      "Collection Date/Time": pay.verified_at || pay.updated_at || "N/A",
      "UTR": fullReg.utr || pay.utr_number || "N/A",
      "Razorpay Payment ID": pay.razorpay_payment_id || "N/A",
      "Razorpay Paym": pay.razorpay_payment_id || "N/A",
      "Razorpay Order ID": pay.razorpay_order_id || "N/A",
      "Razorpay Order": pay.razorpay_order_id || "N/A",
      "Registration Date": formattedDate,
      "Registration Dat": formattedDate,
      "Registration Date/Time": fullReg.created_at || "",
    };

    // Add up to 4 members with direct clickable ID card URLs
    for (let i = 0; i < 4; i++) {
      const m = sortedMembers[i];
      const mName = `Member ${i + 1} Name`;
      const mPhone = `Member ${i + 1} Phone`;
      const mPhoneShort = `Member ${i + 1} Phon`;
      const mEmail = `Member ${i + 1} Email`;
      const mIdCard = `Member ${i + 1} ID Card`;
      const mIdCardShort = `Member ${i + 1} ID Ca`;

      if (m) {
        rowData[mName] = m.full_name || "";
        rowData[mPhone] = m.phone || "N/A";
        rowData[mPhoneShort] = m.phone || "N/A";
        rowData[mEmail] = m.email || "N/A";

        let viewUrl = "No ID Uploaded";
        if (m.id_card_path) {
          viewUrl = `${FRONTEND_URL}/view-id?p=${encodeURIComponent(m.id_card_path)}`;
        }
        rowData[mIdCard] = viewUrl;
        rowData[mIdCardShort] = viewUrl;
      } else {
        rowData[mName] = "";
        rowData[mPhone] = "";
        rowData[mPhoneShort] = "";
        rowData[mEmail] = "";
        rowData[mIdCard] = "";
        rowData[mIdCardShort] = "";
      }
    }

    // 6. Connect to Google Sheets
    const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
    const serviceAccountAuth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(GOOGLE_SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo(); 

    // Find the event tab
    const sheet = doc.sheetsByTitle[eventName];
    if (!sheet) {
      console.error(`Sheet tab not found for event: ${eventName}`);
      return new Response(JSON.stringify({
        success: false,
        registration_id: registration_id,
        registration_number: fullReg.registration_number,
        event_name: eventName,
        operation: "SKIPPED",
        message: `Sheet tab not found for event: ${eventName}`
      }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // 7. Ensure sheet has enough columns and load/reset headers
    const requiredCols = Math.max(CLEAN_EVENT_HEADERS.length + 5, 40);
    if ((sheet.columnCount || 0) < requiredCols) {
      console.log(`Resizing sheet "${eventName}" from ${sheet.columnCount} to ${requiredCols} columns`);
      await sheet.resize({
        rowCount: Math.max(sheet.rowCount || 100, 100),
        columnCount: requiredCols,
      });
    }

    let rows;
    try {
      if (reset_headers === true) {
        console.log(`Explicitly resetting header row for sheet: ${eventName}`);
        await sheet.setHeaderRow(CLEAN_EVENT_HEADERS);
      } else {
        await sheet.loadHeaderRow();
      }
      rows = await sheet.getRows();
    } catch (err: any) {
      console.warn(`Header error in sheet ${eventName}: ${err.message}. Overwriting with clean headers.`);
      await sheet.setHeaderRow(CLEAN_EVENT_HEADERS);
      rows = await sheet.getRows();
    }

    // 8. Upsert Row (Prevent Duplicates)
    const existingRow = rows.find(r => r.get("Registration Number") === fullReg.registration_number || r.get("Registration Num") === fullReg.registration_number);

    let operation = "INSERTED";
    if (existingRow) {
      console.log(`Updating existing row for ${fullReg.registration_number}`);
      existingRow.assign(rowData);
      await existingRow.save();
      operation = "UPDATED";
    } else {
      console.log(`Appending new row for ${fullReg.registration_number}`);
      await sheet.addRow(rowData);
    }

    // 9. Update Payment Summary Tab if it exists
    const summarySheet = doc.sheetsByTitle["Payment Summary"];
    if (summarySheet) {
      const summaryRequiredCols = Math.max(CLEAN_SUMMARY_HEADERS.length + 5, 25);
      if ((summarySheet.columnCount || 0) < summaryRequiredCols) {
        await summarySheet.resize({
          rowCount: Math.max(summarySheet.rowCount || 100, 100),
          columnCount: summaryRequiredCols,
        });
      }

      let summaryRows;
      try {
        if (reset_headers === true) {
          await summarySheet.setHeaderRow(CLEAN_SUMMARY_HEADERS);
        } else {
          await summarySheet.loadHeaderRow();
        }
        summaryRows = await summarySheet.getRows();
      } catch (err: any) {
        console.warn(`Header error in Payment Summary: ${err.message}. Overwriting with clean headers.`);
        await summarySheet.setHeaderRow(CLEAN_SUMMARY_HEADERS);
        summaryRows = await summarySheet.getRows();
      }

      const existingSummaryRow = summaryRows.find(r => r.get("Registration Number") === fullReg.registration_number);
      const summaryData = {
        "Registration Number": fullReg.registration_number,
        "Event Name": eventName,
        "Team Name": fullReg.team_name || "N/A",
        "College Name": fullReg.college_name || "N/A",
        "Total Amount Paid": fullReg.amount || 0,
        "Payment Status": pay.payment_status || "PENDING",
        "Registration Status": fullReg.registration_status || "ACCEPTED",
        "Payment Method": pay.remarks || "NOT COLLECTED",
        "Collection Date/Time": pay.verified_at || pay.updated_at || "N/A",
        "UTR": fullReg.utr || pay.utr_number || "N/A",
        "Razorpay Payment ID": pay.razorpay_payment_id || "N/A",
        "Razorpay Order ID": pay.razorpay_order_id || "N/A",
        "Registration Date": formattedDate,
        "Registration Date/Time": fullReg.created_at || "",
      };

      if (existingSummaryRow) {
        existingSummaryRow.assign(summaryData);
        await existingSummaryRow.save();
      } else {
        await summarySheet.addRow(summaryData);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      registration_id: registration_id,
      registration_number: fullReg.registration_number,
      event_name: eventName,
      operation: operation,
      message: "Row written successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("sync-google-sheet error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

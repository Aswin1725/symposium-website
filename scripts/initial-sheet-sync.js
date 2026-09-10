// scripts/initial-sheet-sync.js
// 
// Run this script using Node.js to push all existing registrations to Google Sheets.
// Usage: node scripts/initial-sheet-sync.js
//
// Prerequisites:
// 1. You must have deployed the sync-google-sheet Edge Function.
// 2. You need your Supabase URL, Service Role Key, and Webhook Secret.
// 3. Set them in a .env file or export them in your terminal.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load public variables (like VITE_SUPABASE_URL) from existing frontend config
config({ path: resolve(process.cwd(), ".env.local") });

// Load highly sensitive server-side secrets from a separate gitignored file
// to completely prevent them from ever leaking into VITE variables.
config({ path: resolve(process.cwd(), ".env.server") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Fetching all registrations from Supabase...");
  
  const { data: registrations, error } = await supabase
    .from("registrations")
    .select("id");

  if (error || !registrations) {
    console.error("Error fetching registrations:", error);
    process.exit(1);
  }

  console.log(`Found ${registrations.length} registrations. Beginning sync...`);

  let successCount = 0;
  let failCount = 0;

  for (const reg of registrations) {
    console.log(`Syncing registration ID: ${reg.id}...`);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-google-sheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WEBHOOK_SECRET || ""}`,
        },
        body: JSON.stringify({
          type: "UPDATE",
          table: "registrations",
          record: { id: reg.id },
          reset_headers: true,
        }),
      });

      const responseText = await res.text();
      let responseJson = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        // If not JSON
      }

      if (!res.ok) {
        console.error(`  [FAIL] Registration ${reg.id}: HTTP ${res.status}`);
        if (responseJson && responseJson.message) {
          console.error(`         Message: ${responseJson.message}`);
        } else {
          console.error(`         Response: ${responseText}`);
        }
        failCount++;
      } else {
        if (responseJson) {
          if (responseJson.success && (responseJson.operation === "INSERTED" || responseJson.operation === "UPDATED")) {
            console.log(`  [OK] Registration ${reg.id} synced successfully!`);
            console.log(`       - Reg Number: ${responseJson.registration_number}`);
            console.log(`       - Event: ${responseJson.event_name}`);
            console.log(`       - Operation: ${responseJson.operation}`);
            successCount++;
          } else if (responseJson.success && responseJson.operation === "SKIPPED") {
            console.log(`  [SKIPPED] Registration ${reg.id}: ${responseJson.message}`);
            // Count skipped as technically failed to sync to sheet, or at least not a "success"
            failCount++;
          } else {
            console.log(`  [UNKNOWN] Registration ${reg.id}: ${responseText}`);
            failCount++;
          }
        } else {
          console.log(`  [OK] Registration ${reg.id} synced. (Response: ${responseText})`);
          successCount++;
        }
      }
    } catch (err) {
      console.error(`  [ERROR] Network or fetch error for ${reg.id}:`, err);
      failCount++;
    }

    // Small delay to prevent rate-limiting on Google Sheets API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("========================================");
  console.log("SYNC COMPLETE");
  console.log(`Success: ${successCount}`);
  console.log(`Failed:  ${failCount}`);
  console.log("========================================");
}

run();

// ==============================================================================
// NALI MOBILE POS - SUPABASE EDGE FUNCTION
// Function: notify-widget-reload
// Purpose: Triggered via Database Webhook on pos_sales INSERT.
//          Sends an APNs Silent Background Push Notification (content-available: 1)
//          to wake the Nali Mobile companion iOS app and immediately reload
//          all WidgetKit timelines with the latest cashier sale.
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id?: string;
    invoice_no?: string;
    total?: number;
    checkout_currency?: string;
    currency?: string;
    notes?: string;
    customer_name?: string;
    sell_type?: string;
    payment_method?: string;
    created_at?: string;
    [key: string]: any;
  };
  old_record: any;
}

interface ApnsJwtHeader {
  alg: "ES256";
  kid: string;
}

interface ApnsJwtPayload {
  iss: string; // Apple Developer Team ID
  iat: number; // Issued at timestamp
}

// Generate an Apple APNs JWT authentication token using ES256
async function generateApnsJwt(teamId: string, keyId: string, privateKeyP8: string): Promise<string> {
  const header: ApnsJwtHeader = { alg: "ES256", kid: keyId };
  const payload: ApnsJwtPayload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };

  const encoder = new TextEncoder();
  const encodeBase64Url = (buf: Uint8Array) =>
    btoa(String.fromCharCode(...buf))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const headerEncoded = encodeBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadEncoded = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`;

  // Clean and import the P8 ECDSA Private Key
  const pem = privateKeyP8
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  
  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureEncoded = encodeBase64Url(new Uint8Array(signature));
  return `${unsignedToken}.${signatureEncoded}`;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Verify this is a sale insertion event
    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(JSON.stringify({ message: "Ignored non-insert event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const sale = payload.record;
    const invoiceNo = sale.invoice_no || sale.id || "N/A";
    const totalAmount = Number(sale.total || 0);
    const currency = sale.checkout_currency || sale.currency || "USD";
    const cashierName = sale.notes || sale.customer_name || "Cashier Desk";

    // Format currency amount for display
    const formattedTotal =
      currency === "IQD"
        ? `${totalAmount.toLocaleString("en-US")} IQD`
        : `$${totalAmount.toFixed(2)}`;

    // Initialize Supabase Client to query registered Apple Device Tokens
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve active device push tokens for Store Administrators
    const { data: deviceTokens, error: tokenError } = await supabase
      .from("user_sessions")
      .select("ip_address, device_name, location")
      .eq("user_role", "Administrator")
      .not("ip_address", "is", null);

    // Alternatively, retrieve dedicated APNs device tokens table if configured:
    const { data: apnsRegistrations } = await supabase
      .from("apns_device_tokens")
      .select("device_token, environment")
      .eq("is_active", true);

    const tokensToSend: Array<{ token: string; sandbox: boolean }> = [];

    if (apnsRegistrations && apnsRegistrations.length > 0) {
      for (const reg of apnsRegistrations) {
        tokensToSend.push({
          token: reg.device_token,
          sandbox: reg.environment === "sandbox"
        });
      }
    }

    // APNs Credentials from Supabase Edge Secrets
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID") || "";
    const apnsKeyId = Deno.env.get("APNS_KEY_ID") || "";
    const apnsPrivateKeyP8 = Deno.env.get("APNS_PRIVATE_KEY_P8") || "";
    const apnsTopic = Deno.env.get("APNS_BUNDLE_ID") || "com.nalimobile.app";

    let apnsResult = { sent: 0, skipped: false, reason: "" };

    if (!apnsTeamId || !apnsKeyId || !apnsPrivateKeyP8) {
      console.warn("APNs credentials not configured in environment. Skipping push delivery.");
      apnsResult = { sent: 0, skipped: true, reason: "Missing APNs secrets" };
    } else if (tokensToSend.length === 0) {
      apnsResult = { sent: 0, skipped: true, reason: "No registered device tokens" };
    } else {
      const jwtToken = await generateApnsJwt(apnsTeamId, apnsKeyId, apnsPrivateKeyP8);

      // APNs Silent Push Notification Payload
      // 'content-available: 1' wakes the companion app in the background without disturbing the user
      // 'apns-push-type: background' guarantees low-power background dispatch to invoke WidgetCenter reload
      const pushBody = JSON.stringify({
        aps: {
          "content-available": 1,
          sound: ""
        },
        event: "cashier_sale_completed",
        invoice_no: invoiceNo,
        total: totalAmount,
        currency: currency,
        formatted_total: formattedTotal,
        cashier: cashierName,
        timestamp: new Date().toISOString()
      });

      for (const { token, sandbox } of tokensToSend) {
        const apnsHost = sandbox
          ? "https://api.sandbox.push.apple.com"
          : "https://api.push.apple.com";
        const url = `${apnsHost}/3/device/${token}`;

        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              authorization: `bearer ${jwtToken}`,
              "apns-topic": apnsTopic,
              "apns-push-type": "background",
              "apns-priority": "5",
              "apns-expiration": "0",
              "Content-Type": "application/json"
            },
            body: pushBody
          });

          if (res.ok) {
            apnsResult.sent++;
          } else {
            const errText = await res.text();
            console.error(`APNs error for token ${token.slice(0, 8)}...:`, res.status, errText);
          }
        } catch (pushErr) {
          console.error(`Fetch error connecting to APNs:`, pushErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice: invoiceNo,
        sale_total: formattedTotal,
        cashier: cashierName,
        apns_dispatch: apnsResult
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    console.error("Unhandled error in notify-widget-reload:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

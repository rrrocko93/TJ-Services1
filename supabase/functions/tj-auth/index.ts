import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SESSION_TTL_DAYS = 30;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Verify a plaintext secret against a pgcrypto bcrypt hash stored in DB.
// Uses an RPC that runs crypt() server-side so we never need bcryptjs in the function.
async function verifySecret(
  supabase: ReturnType<typeof createClient>,
  table: "admins" | "customers",
  idCol: string,
  idVal: string,
  secret: string,
): Promise<{ ok: boolean; row?: any }> {
  // Use a parameterized RPC to avoid SQL injection. We pass the candidate secret and
  // the stored hash; the function compares with crypt($1, hash) = hash.
  const { data, error } = await supabase.rpc("verify_secret", {
    p_table: table,
    p_id_col: idCol,
    p_id_val: idVal,
    p_secret: secret,
  });
  if (error) return { ok: false };
  return { ok: !!data?.ok, row: data?.row || null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/tj-auth/, "").replace(/^\/+/, "");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    if (path === "login" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return errorResponse("Invalid JSON body", 400);
      const { role, identifier, secret } = body as {
        role: string;
        identifier?: string;
        secret?: string;
      };
      if (!role || !identifier || !secret) {
        return errorResponse("Missing credentials", 400);
      }

      if (role === "customer") {
        const { data: customer, error } = await supabase
          .from("customers")
          .select("id, client_id, pin_hash, name")
          .eq("client_id", identifier.toUpperCase().trim())
          .maybeSingle();
        if (error) return errorResponse("Login failed", 500);
        if (!customer) return errorResponse("Invalid Client ID or PIN", 401);

        // Verify PIN using pgcrypto via RPC
        const { data: v } = await supabase.rpc("check_pin", {
          p_pin: String(secret),
          p_hash: customer.pin_hash,
        });
        if (!v) return errorResponse("Invalid Client ID or PIN", 401);

        const expires_at = new Date(
          Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: session, error: sErr } = await supabase
          .from("sessions")
          .insert({ role: "customer", customer_id: customer.id, expires_at })
          .select("id")
          .single();
        if (sErr || !session) return errorResponse("Could not create session", 500);

        return jsonResponse({
          token: session.id,
          role: "customer",
          customer: { id: customer.id, client_id: customer.client_id, name: customer.name },
        });
      }

      if (role === "admin") {
        const { data: admin, error } = await supabase
          .from("admins")
          .select("id, username, password_hash, display_name")
          .eq("username", identifier.toLowerCase().trim())
          .maybeSingle();
        if (error) return errorResponse("Login failed", 500);
        if (!admin) return errorResponse("Invalid admin credentials", 401);

        const { data: v } = await supabase.rpc("check_pin", {
          p_pin: String(secret),
          p_hash: admin.password_hash,
        });
        if (!v) return errorResponse("Invalid admin credentials", 401);

        const expires_at = new Date(
          Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: session, error: sErr } = await supabase
          .from("sessions")
          .insert({ role: "admin", admin_id: admin.id, expires_at })
          .select("id")
          .single();
        if (sErr || !session) return errorResponse("Could not create session", 500);

        return jsonResponse({
          token: session.id,
          role: "admin",
          admin: { id: admin.id, username: admin.username, display_name: admin.display_name },
        });
      }

      return errorResponse("Unknown role", 400);
    }

    if (path === "logout" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body?.token) return errorResponse("Missing token", 400);
      await supabase.from("sessions").delete().eq("id", body.token);
      return jsonResponse({ ok: true });
    }

    if (path === "me" && req.method === "GET") {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      if (!token) return errorResponse("Unauthorized", 401);

      const { data: session, error } = await supabase
        .from("sessions")
        .select("id, role, admin_id, customer_id, expires_at")
        .eq("id", token)
        .maybeSingle();
      if (error || !session) return errorResponse("Unauthorized", 401);
      if (new Date(session.expires_at).getTime() < Date.now()) {
        await supabase.from("sessions").delete().eq("id", token);
        return errorResponse("Session expired", 401);
      }

      if (session.role === "admin") {
        const { data: admin } = await supabase
          .from("admins")
          .select("id, username, display_name")
          .eq("id", session.admin_id)
          .maybeSingle();
        return jsonResponse({ role: "admin", admin: admin || null });
      }
      if (session.role === "customer") {
        const { data: customer } = await supabase
          .from("customers")
          .select("id, client_id, name, phone, email, address, loyalty_target")
          .eq("id", session.customer_id)
          .maybeSingle();
        return jsonResponse({ role: "customer", customer });
      }
      return errorResponse("Unauthorized", 401);
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    return errorResponse(err.message || "Server error", 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Idempotent: create default admin if none exists.
    const { data: existing } = await supabase
      .from("admins")
      .select("id, username")
      .ilike("username", "admin")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: true, message: "Admin already exists", username: "admin", password: "(already set)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const password_hash = await bcrypt.hash("tjservices2024", 10);
    const { error } = await supabase
      .from("admins")
      .insert({ username: "admin", password_hash, display_name: "TJ Services Admin" });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ ok: true, username: "admin", password: "tjservices2024" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

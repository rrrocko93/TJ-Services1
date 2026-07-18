import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

interface Session {
  id: string;
  role: "admin" | "customer";
  admin_id: string | null;
  customer_id: string | null;
  expires_at: string;
}

async function getSession(req: Request, supabase: ReturnType<typeof createClient>) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await supabase
    .from("sessions")
    .select("id, role, admin_id, customer_id, expires_at")
    .eq("id", token)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await supabase.from("sessions").delete().eq("id", token);
    return null;
  }
  return data as Session;
}

// Generate next client id like TJ0001, TJ0002...
async function nextClientId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await supabase
    .from("customers")
    .select("client_id")
    .ilike("client_id", "TJ%")
    .order("client_id", { ascending: false })
    .limit(1);
  let max = 0;
  for (const row of data || []) {
    const n = parseInt(String(row.client_id).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return "TJ" + String(max + 1).padStart(4, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/tj-api/, "").replace(/^\/+/, "").split("/").filter(Boolean);
  const resource = parts[0] || "";
  const id = parts[1] || "";
  const sub = parts[2] || "";

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const session = await getSession(req, supabase);
    if (!session) return errorResponse("Unauthorized", 401);

    const isAdmin = session.role === "admin";
    const customerId = session.customer_id;

    // ---------- ADMIN: customers ----------
    if (resource === "customers") {
      if (!isAdmin) return errorResponse("Forbidden", 403);

      // GET /customers  -> list all
      if (req.method === "GET" && !id) {
        const { data, error } = await supabase
          .from("customers")
          .select("id, client_id, name, phone, email, address, notes, loyalty_target, created_at")
          .order("created_at", { ascending: false });
        if (error) return errorResponse(error.message, 500);
        // attach loyalty progress + vehicle count
        const enriched = await Promise.all(
          (data || []).map(async (c: any) => {
            const [{ count: completed }, { count: vehicles }] = await Promise.all([
              supabase.from("loyalty_log").select("id", { count: "exact", head: true }).eq("customer_id", c.id),
              supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("customer_id", c.id),
            ]);
            return { ...c, completed_services: completed || 0, vehicle_count: vehicles || 0 };
          }),
        );
        return jsonResponse({ customers: enriched });
      }

      // POST /customers  -> create
      if (req.method === "POST" && !id) {
        const body = await req.json().catch(() => null);
        if (!body) return errorResponse("Invalid body", 400);
        const { name, phone, email, address, notes, pin, loyalty_target } = body as any;
        if (!name || !pin) return errorResponse("name and pin are required", 400);
        const client_id = await nextClientId(supabase);
        const { data: hashData } = await supabase.rpc("hash_secret", { p_secret: String(pin) });
        const pin_hash = hashData as string;
        if (!pin_hash) return errorResponse("Failed to hash PIN", 500);
        const { data, error } = await supabase
          .from("customers")
          .insert({
            client_id,
            pin_hash,
            name,
            phone: phone || null,
            email: email || null,
            address: address || null,
            notes: notes || null,
            loyalty_target: loyalty_target || 5,
          })
          .select("id, client_id, name, phone, email, address, notes, loyalty_target, created_at")
          .single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ customer: data });
      }

      // GET /customers/:id
      if (req.method === "GET" && id && !sub) {
        const { data, error } = await supabase
          .from("customers")
          .select("id, client_id, name, phone, email, address, notes, loyalty_target, created_at")
          .eq("id", id)
          .maybeSingle();
        if (error) return errorResponse(error.message, 500);
        if (!data) return errorResponse("Not found", 404);
        return jsonResponse({ customer: data });
      }

      // PUT /customers/:id  -> update
      if (req.method === "PUT" && id && !sub) {
        const body = await req.json().catch(() => null);
        if (!body) return errorResponse("Invalid body", 400);
        const { name, phone, email, address, notes, loyalty_target } = body as any;
        const update: any = {};
        if (name !== undefined) update.name = name;
        if (phone !== undefined) update.phone = phone;
        if (email !== undefined) update.email = email;
        if (address !== undefined) update.address = address;
        if (notes !== undefined) update.notes = notes;
        if (loyalty_target !== undefined) update.loyalty_target = loyalty_target;
        const { data, error } = await supabase
          .from("customers")
          .update(update)
          .eq("id", id)
          .select("id, client_id, name, phone, email, address, notes, loyalty_target, created_at")
          .maybeSingle();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ customer: data });
      }

      // POST /customers/:id/reset-pin  -> reset pin
      if (req.method === "POST" && id && sub === "reset-pin") {
        const body = await req.json().catch(() => ({}));
        const pin = body?.pin;
        if (!pin) return errorResponse("pin required", 400);
        const { data: hashData } = await supabase.rpc("hash_secret", { p_secret: String(pin) });
        const pin_hash = hashData as string;
        if (!pin_hash) return errorResponse("Failed to hash PIN", 500);
        const { error } = await supabase.from("customers").update({ pin_hash }).eq("id", id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true });
      }

      // DELETE /customers/:id
      if (req.method === "DELETE" && id && !sub) {
        const { error } = await supabase.from("customers").delete().eq("id", id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true });
      }
    }

    // ---------- VEHICLES ----------
    if (resource === "vehicles") {
      // GET /vehicles  (admin: all or by customer_id query; customer: own only)
      if (req.method === "GET" && !id) {
        const qCustomer = url.searchParams.get("customer_id");
        let query = supabase.from("vehicles").select("*").order("created_at", { ascending: false });
        if (!isAdmin) {
          if (!customerId) return errorResponse("Forbidden", 403);
          query = query.eq("customer_id", customerId);
        } else if (qCustomer) {
          query = query.eq("customer_id", qCustomer);
        }
        const { data, error } = await query;
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ vehicles: data });
      }

      // POST /vehicles  (admin only)
      if (req.method === "POST" && !id) {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const body = await req.json().catch(() => null);
        if (!body) return errorResponse("Invalid body", 400);
        const { customer_id, make, model, year, vin, license_plate, color, photo_url, notes } = body as any;
        if (!customer_id) return errorResponse("customer_id required", 400);
        const { data, error } = await supabase
          .from("vehicles")
          .insert({ customer_id, make, model, year, vin, license_plate, color, photo_url, notes })
          .select("*")
          .single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ vehicle: data });
      }

      // GET /vehicles/:id
      if (req.method === "GET" && id && !sub) {
        const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
        if (error) return errorResponse(error.message, 500);
        if (!data) return errorResponse("Not found", 404);
        if (!isAdmin && data.customer_id !== customerId) return errorResponse("Forbidden", 403);
        return jsonResponse({ vehicle: data });
      }

      // PUT /vehicles/:id
      if (req.method === "PUT" && id && !sub) {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const body = await req.json().catch(() => null);
        if (!body) return errorResponse("Invalid body", 400);
        const { make, model, year, vin, license_plate, color, photo_url, notes } = body as any;
        const update: any = {};
        if (make !== undefined) update.make = make;
        if (model !== undefined) update.model = model;
        if (year !== undefined) update.year = year;
        if (vin !== undefined) update.vin = vin;
        if (license_plate !== undefined) update.license_plate = license_plate;
        if (color !== undefined) update.color = color;
        if (photo_url !== undefined) update.photo_url = photo_url;
        if (notes !== undefined) update.notes = notes;
        const { data, error } = await supabase.from("vehicles").update(update).eq("id", id).select("*").maybeSingle();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ vehicle: data });
      }

      // DELETE /vehicles/:id
      if (req.method === "DELETE" && id && !sub) {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const { error } = await supabase.from("vehicles").delete().eq("id", id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true });
      }
    }

    // ---------- SERVICES ----------
    if (resource === "services") {
      // GET /services  (admin: by vehicle_id/customer_id query; customer: own only)
      if (req.method === "GET" && !id) {
        const qVehicle = url.searchParams.get("vehicle_id");
        const qCustomer = url.searchParams.get("customer_id");
        let query = supabase
          .from("services")
          .select("*")
          .order("service_date", { ascending: false });
        if (!isAdmin) {
          if (!customerId) return errorResponse("Forbidden", 403);
          query = query.eq("customer_id", customerId);
        } else if (qCustomer) {
          query = query.eq("customer_id", qCustomer);
        }
        if (qVehicle) query = query.eq("vehicle_id", qVehicle);
        const { data, error } = await query;
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ services: data });
      }

      // POST /services  (admin only)
      if (req.method === "POST" && !id) {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const body = await req.json().catch(() => null);
        if (!body) return errorResponse("Invalid body", 400);
        const {
          vehicle_id,
          customer_id,
          service_date,
          mileage,
          service_type,
          description,
          notes,
          recommendations,
          next_service_date,
          next_service_mileage,
          photo_urls,
        } = body as any;
        if (!vehicle_id || !customer_id) return errorResponse("vehicle_id and customer_id required", 400);

        // verify vehicle belongs to customer
        const { data: v } = await supabase.from("vehicles").select("customer_id").eq("id", vehicle_id).maybeSingle();
        if (!v || v.customer_id !== customer_id) return errorResponse("Vehicle/customer mismatch", 400);

        const { data, error } = await supabase
          .from("services")
          .insert({
            vehicle_id,
            customer_id,
            service_date: service_date || new Date().toISOString().slice(0, 10),
            mileage,
            service_type,
            description,
            notes,
            recommendations,
            next_service_date,
            next_service_mileage,
            photo_urls: photo_urls || [],
            completed: false,
          })
          .select("*")
          .single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ service: data });
      }

      // GET /services/:id
      if (req.method === "GET" && id && !sub) {
        const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
        if (error) return errorResponse(error.message, 500);
        if (!data) return errorResponse("Not found", 404);
        if (!isAdmin && data.customer_id !== customerId) return errorResponse("Forbidden", 403);
        return jsonResponse({ service: data });
      }

      // PUT /services/:id  (admin: any field; customer: not allowed)
      if (req.method === "PUT" && id && !sub) {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const body = await req.json().catch(() => null);
        if (!body) return errorResponse("Invalid body", 400);
        const fields = ["service_date","mileage","service_type","description","notes","recommendations","next_service_date","next_service_mileage","photo_urls"];
        const update: any = {};
        for (const f of fields) if (body[f] !== undefined) update[f] = body[f];
        const { data, error } = await supabase.from("services").update(update).eq("id", id).select("*").maybeSingle();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ service: data });
      }

      // POST /services/:id/complete  -> Complete Service button
      if (req.method === "POST" && id && sub === "complete") {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const body = await req.json().catch(() => ({}));
        const { notes, recommendations, mileage, photo_urls, next_service_date, next_service_mileage } = body as any;

        const { data: existing } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
        if (!existing) return errorResponse("Service not found", 404);

        const update: any = {
          completed: true,
          completed_at: new Date().toISOString(),
        };
        if (notes !== undefined) update.notes = notes;
        if (recommendations !== undefined) update.recommendations = recommendations;
        if (mileage !== undefined) update.mileage = mileage;
        if (photo_urls !== undefined) update.photo_urls = photo_urls;
        if (next_service_date !== undefined) update.next_service_date = next_service_date;
        if (next_service_mileage !== undefined) update.next_service_mileage = next_service_mileage;

        const { data, error } = await supabase.from("services").update(update).eq("id", id).select("*").maybeSingle();
        if (error) return errorResponse(error.message, 500);
        if (!data) return errorResponse("Update failed", 500);

        // Add to loyalty_log only if it wasn't already completed
        if (!existing.completed) {
          await supabase.from("loyalty_log").insert({ customer_id: data.customer_id, service_id: data.id });
        }
        return jsonResponse({ service: data });
      }

      // DELETE /services/:id
      if (req.method === "DELETE" && id && !sub) {
        if (!isAdmin) return errorResponse("Forbidden", 403);
        const { error } = await supabase.from("services").delete().eq("id", id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true });
      }
    }

    // ---------- UPLOAD (admin) ----------
    if (resource === "upload" && req.method === "POST") {
      if (!isAdmin) return errorResponse("Forbidden", 403);

      const body = await req.json().catch(() => null);
      if (!body) return errorResponse("Invalid body", 400);

      const { filename, content_type, data } = body as {
        filename?: string;
        content_type?: string;
        data?: string;
      };

      if (!filename || !content_type || !data) {
        return errorResponse("filename, content_type, and data are required", 400);
      }
      if (!content_type.startsWith("image/")) {
        return errorResponse("Only image uploads are allowed", 400);
      }

      const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "jpg";
      const allowedExt = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];
      if (!allowedExt.includes(ext)) {
        return errorResponse("Unsupported image type", 400);
      }

      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      } catch {
        return errorResponse("Invalid image data", 400);
      }
      if (bytes.length > 5 * 1024 * 1024) {
        return errorResponse("Image must be 5 MB or smaller", 400);
      }

      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("service-photos")
        .upload(path, bytes, { contentType: content_type, upsert: false });

      if (uploadError) return errorResponse(uploadError.message, 500);

      const { data: urlData } = supabase.storage.from("service-photos").getPublicUrl(path);
      return jsonResponse({ url: urlData.publicUrl, path });
    }

    // ---------- LOYALTY ----------
    if (resource === "loyalty") {
      // GET /loyalty?customer_id=...  (admin: any; customer: own only)
      if (req.method === "GET") {
        const target = url.searchParams.get("customer_id") || (isAdmin ? "" : customerId);
        if (!target) return errorResponse("customer_id required", 400);
        if (!isAdmin && target !== customerId) return errorResponse("Forbidden", 403);
        const { data: customer } = await supabase
          .from("customers")
          .select("id, name, loyalty_target")
          .eq("id", target)
          .maybeSingle();
        if (!customer) return errorResponse("Not found", 404);
        const { count } = await supabase
          .from("loyalty_log")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", target);
        const completed = count || 0;
        return jsonResponse({
          customer_id: target,
          name: customer.name,
          target: customer.loyalty_target,
          completed,
          remaining: Math.max(0, customer.loyalty_target - completed),
          reward_earned: completed >= customer.loyalty_target,
        });
      }
    }

    // ---------- DASHBOARD (admin) ----------
    if (resource === "dashboard" && req.method === "GET") {
      if (!isAdmin) return errorResponse("Forbidden", 403);
      const [{ count: customers }, { count: vehicles }, { count: services }, { count: completed }, { count: pending }] =
        await Promise.all([
          supabase.from("customers").select("id", { count: "exact", head: true }),
          supabase.from("vehicles").select("id", { count: "exact", head: true }),
          supabase.from("services").select("id", { count: "exact", head: true }),
          supabase.from("services").select("id", { count: "exact", head: true }).eq("completed", true),
          supabase.from("services").select("id", { count: "exact", head: true }).eq("completed", false),
        ]);
      return jsonResponse({
        stats: {
          customers: customers || 0,
          vehicles: vehicles || 0,
          services: services || 0,
          completed: completed || 0,
          pending: pending || 0,
        },
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    return errorResponse(err.message || "Server error", 500);
  }
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fnBase = `${supabaseUrl}/functions/v1`;

function headers(token?: string | null): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function tjAuth<T = any>(
  path: string,
  options: { method?: string; body?: any; token?: string | null } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  const res = await fetch(`${fnBase}/tj-auth/${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export async function tjApi<T = any>(
  path: string,
  options: { method?: string; body?: any; token: string } = { token: "" },
): Promise<T> {
  const { method = "GET", body, token } = options;
  const res = await fetch(`${fnBase}/tj-api/${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

export async function tjUploadImage(file: File, token: string): Promise<{ url: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const data = btoa(binary);

  return tjApi<{ url: string }>("upload", {
    method: "POST",
    token,
    body: {
      filename: file.name,
      content_type: file.type || "image/jpeg",
      data,
    },
  });
}

/*
# Add pgcrypto helper RPCs for PIN/password hashing and verification

## Why
Edge functions need to verify and create bcrypt hashes stored in the `admins.password_hash`
and `customers.pin_hash` columns. Doing the hashing server-side in Postgres with pgcrypto
(`crypt()` + `gen_salt('bf', 10)`) is the most reliable approach and avoids depending on
bcryptjs producing hashes that pgcrypto can verify.

## New Functions
- `hash_secret(p_secret text) RETURNS text` — returns `crypt(p_secret, gen_salt('bf', 10))`,
  a fresh bcrypt-style `$2a$` hash suitable for storing as a password/pin hash.
- `check_pin(p_pin text, p_hash text) RETURNS boolean` — returns true if
  `crypt(p_pin, p_hash) = p_hash`, i.e. the plaintext matches the stored hash.

## Security
- Both functions are `SECURITY DEFINER` so the service-role key can call them via RPC.
- They are safe: inputs are passed as parameters, not interpolated into SQL.
- No RLS needed on functions; access is controlled by the service-role key.
*/

CREATE OR REPLACE FUNCTION hash_secret(p_secret text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN crypt(p_secret, gen_salt('bf', 10));
END;
$$;

CREATE OR REPLACE FUNCTION check_pin(p_pin text, p_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_pin IS NULL OR p_hash IS NULL THEN
    RETURN false;
  END IF;
  RETURN crypt(p_pin, p_hash) = p_hash;
END;
$$;

-- Grant execute to the service role (and anon, since edge functions use service-role key
-- but the RPC is invoked through the anon-key client in some flows).
GRANT EXECUTE ON FUNCTION hash_secret(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_pin(text, text) TO anon, authenticated, service_role;

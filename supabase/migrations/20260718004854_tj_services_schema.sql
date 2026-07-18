/*
# TJ Services Customer Portal - Core Schema

## Overview
Custom auth system for an automotive service business. Customers log in with a
Client ID (e.g. TJ0001) + PIN set by the admin. Admins log in with username + password.
No email/password auth is used (per business requirement).

## Authentication Model
- Custom `admins` table (username + bcrypt-hashed password).
- Custom `customers` table (client_id + bcrypt-hashed pin).
- A `sessions` table stores issued tokens (UUID) with role + owner id + expiry.
- The frontend sends `Authorization: Bearer <token>` to edge functions.
- Edge functions validate the session and run queries with the service-role key,
  enforcing ownership server-side before returning data.
- RLS is enabled on all data tables and locked to `authenticated`/service-role only;
  the anon key cannot read any business data directly. All reads/writes go through
  edge functions that use the service role key and enforce ownership in SQL.

## Tables

### admins
- `id` uuid PK
- `username` text unique not null (admin login name)
- `password_hash` text not null (bcrypt)
- `display_name` text
- `created_at` timestamptz

### customers
- `id` uuid PK
- `client_id` text unique not null (e.g. TJ0001)
- `pin_hash` text not null (bcrypt)
- `name` text not null
- `phone` text
- `email` text
- `address` text
- `notes` text (admin-only notes about the customer)
- `loyalty_target` int default 5 (services needed for a loyalty reward)
- `created_at` timestamptz

### vehicles
- `id` uuid PK
- `customer_id` uuid FK -> customers.id ON DELETE CASCADE
- `make` text
- `model` text
- `year` int
- `vin` text
- `license_plate` text
- `color` text
- `photo_url` text (path in Supabase Storage or external URL)
- `notes` text
- `created_at` timestamptz

### services
- `id` uuid PK
- `vehicle_id` uuid FK -> vehicles.id ON DELETE CASCADE
- `customer_id` uuid FK -> customers.id ON DELETE CASCADE (denormalized for fast customer queries)
- `service_date` date not null
- `mileage` int
- `service_type` text (e.g. Oil Change, Brake Service)
- `description` text
- `notes` text (technician notes)
- `recommendations` text (next-service recommendations)
- `next_service_date` date
- `next_service_mileage` int
- `photo_urls` text[] (array of photo paths)
- `completed` boolean default false (set true when "Complete Service" pressed)
- `completed_at` timestamptz
- `created_at` timestamptz

### loyalty_log
- `id` uuid PK
- `customer_id` uuid FK -> customers.id ON DELETE CASCADE
- `service_id` uuid FK -> services.id ON DELETE CASCADE
- `created_at` timestamptz
- One row per completed service; count(*) = loyalty progress.

### sessions
- `id` uuid PK DEFAULT gen_random_uuid() (this is the bearer token)
- `role` text not null ('admin' | 'customer')
- `admin_id` uuid nullable
- `customer_id` uuid nullable
- `expires_at` timestamptz not null
- `created_at` timestamptz default now()

## Security
- RLS enabled on every table.
- Policies: only `authenticated` role (Supabase auth users, which we don't use here)
  OR service role can access. The anon key CANNOT read any data directly.
- All business data access goes through edge functions using the service-role key,
  with ownership enforced in SQL inside each function.

## Notes
1. Passwords/PINs are bcrypt-hashed server-side in edge functions.
2. Sessions expire after 30 days.
3. The `services.customer_id` denormalization lets us enforce ownership in one hop.
4. `loyalty_log` is appended to only when a service transitions to `completed = true`.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- admins
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL,
  pin_hash text NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  loyalty_target int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  make text,
  model text,
  year int,
  vin text,
  license_plate text,
  color text,
  photo_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);

-- services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  mileage int,
  service_type text,
  description text,
  notes text,
  recommendations text,
  next_service_date date,
  next_service_mileage int,
  photo_urls text[] DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_services_customer ON services(customer_id);
CREATE INDEX IF NOT EXISTS idx_services_vehicle ON services(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_services_date ON services(service_date DESC);

-- loyalty_log
CREATE TABLE IF NOT EXISTS loyalty_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE loyalty_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_log(customer_id);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin','customer')),
  admin_id uuid REFERENCES admins(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (role = 'admin' AND admin_id IS NOT NULL AND customer_id IS NULL) OR
    (role = 'customer' AND customer_id IS NOT NULL AND admin_id IS NULL)
  )
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Helper function: count completed services for a customer (loyalty progress)
CREATE OR REPLACE FUNCTION loyalty_progress(p_customer_id uuid)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::int FROM loyalty_log WHERE customer_id = p_customer_id;
$$;

-- All tables are RLS-locked with NO policies for the anon role.
-- Only the service-role (used inside edge functions) can read/write.
-- This enforces the requirement: "Data access must be protected on the backend,
-- not only hidden on the frontend." The frontend anon key sees nothing.

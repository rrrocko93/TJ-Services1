export interface Admin {
  id: string;
  username: string;
  display_name?: string | null;
}

export interface Customer {
  id: string;
  client_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  loyalty_target: number;
  created_at?: string;
  completed_services?: number;
  vehicle_count?: number;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
  license_plate?: string | null;
  color?: string | null;
  photo_url?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ServiceRecord {
  id: string;
  vehicle_id: string;
  customer_id: string;
  service_date: string;
  mileage?: number | null;
  service_type?: string | null;
  description?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  next_service_date?: string | null;
  next_service_mileage?: number | null;
  photo_urls?: string[];
  completed: boolean;
  completed_at?: string | null;
  created_at?: string;
}

export interface LoyaltyInfo {
  customer_id: string;
  name: string;
  target: number;
  completed: number;
  remaining: number;
  reward_earned: boolean;
}

export interface DashboardStats {
  customers: number;
  vehicles: number;
  services: number;
  completed: number;
  pending: number;
}

export type SessionRole = "admin" | "customer";

export interface SessionUser {
  token: string;
  role: SessionRole;
  admin?: Admin | null;
  customer?: Customer | null;
}

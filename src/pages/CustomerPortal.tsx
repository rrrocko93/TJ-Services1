import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { tjApi } from "../lib/supabase";
import type { Vehicle, ServiceRecord, LoyaltyInfo, Customer } from "../lib/types";
import { Card, Badge, Button, EmptyState, Spinner } from "../components/ui";
import {
  Car,
  Wrench,
  Award,
  Calendar,
  Gauge,
  LogOut,
  CheckCircle2,
  Circle,
  Bell,
  FileText,
  MapPin,
  Phone,
  Mail,
  Sparkles,
} from "lucide-react";

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const token = user!.token;
  const customer = user!.customer as Customer;

  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [services, setServices] = useState<ServiceRecord[] | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [vRes, sRes, lRes] = await Promise.all([
          tjApi<{ vehicles: Vehicle[] }>("vehicles", { token }),
          tjApi<{ services: ServiceRecord[] }>("services", { token }),
          tjApi<LoyaltyInfo>(`loyalty?customer_id=${customer.id}`, { token }),
        ]);
        setVehicles(vRes.vehicles);
        setServices(sRes.services);
        setLoyalty(lRes);
      } catch (err: any) {
        setError(err.message);
      }
    })();
  }, [token, customer.id]);

  const completedServices = (services || []).filter((s) => s.completed);
  const upcomingRecommendation = (services || []).find(
    (s) => s.recommendations || s.next_service_date || s.next_service_mileage,
  );
  const latestMileage = completedServices
    .filter((s) => s.mileage != null)
    .sort((a, b) => (b.service_date || "").localeCompare(a.service_date || ""))[0]?.mileage;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={logout}>Back to Login</Button>
        </Card>
      </div>
    );
  }

  if (!vehicles || !services || !loyalty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8 text-red-600" />
      </div>
    );
  }

  const loyaltyPct = Math.min(100, (loyalty.completed / loyalty.target) * 100);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/60 border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-wider leading-none">TJ SERVICES</div>
              <div className="text-[9px] tracking-[0.25em] text-neutral-500 uppercase">Customer Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-white">{customer.name}</div>
              <div className="text-xs text-neutral-500">{customer.client_id}</div>
            </div>
            <Button variant="ghost" onClick={logout} className="px-3 py-2 text-sm">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome banner */}
        <div className="animate-fade-in-up">
          <p className="text-sm text-neutral-500">Welcome back,</p>
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-tight">
            {customer.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone || "—"}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email || "—"}</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {customer.address || "—"}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={<Car className="w-5 h-5" />} label="Vehicles" value={vehicles.length} />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Services Done" value={loyalty.completed} />
          <StatCard icon={<Gauge className="w-5 h-5" />} label="Latest Mileage" value={latestMileage ? `${latestMileage.toLocaleString()} mi` : "—"} />
          <StatCard icon={<Calendar className="w-5 h-5" />} label="Next Service" value={upcomingRecommendation?.next_service_date || "—"} />
        </div>

        {/* Loyalty card */}
        <Card className="p-5 sm:p-6 animate-fade-in-up" hover>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-500 text-xs font-semibold uppercase tracking-wider mb-1">
                <Award className="w-4 h-4" /> Loyalty Program
              </div>
              <h2 className="font-display text-2xl font-bold uppercase">
                {loyalty.completed} / {loyalty.target} Services
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                {loyalty.reward_earned
                  ? "Reward earned! Contact TJ Services to redeem."
                  : `${loyalty.remaining} more service${loyalty.remaining === 1 ? "" : "s"} to unlock your reward.`}
              </p>
            </div>
            <div className="shrink-0">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="#262626" strokeWidth="6" fill="none" />
                  <circle
                    cx="40" cy="40" r="34" stroke="#e10600" strokeWidth="6" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(loyaltyPct / 100) * 213.6} 213.6`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold">
                  {Math.round(loyaltyPct)}%
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: loyalty.target }).map((_, i) => (
              <div key={i} className="flex-1 h-2 rounded-full overflow-hidden bg-neutral-800">
                <div
                  className={`h-full ${i < loyalty.completed ? "bg-red-600" : "bg-transparent"}`}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Next recommended service */}
        {upcomingRecommendation?.recommendations && (
          <Card className="p-5 border-red-900/40 bg-gradient-to-br from-red-950/30 to-transparent animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">Next Recommended Service</div>
                <p className="text-sm text-neutral-200 mt-1">{upcomingRecommendation.recommendations}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-400">
                  {upcomingRecommendation.next_service_date && (
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {upcomingRecommendation.next_service_date}</span>
                  )}
                  {upcomingRecommendation.next_service_mileage && (
                    <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {upcomingRecommendation.next_service_mileage.toLocaleString()} mi</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Vehicles */}
        <section>
          <SectionTitle icon={<Car className="w-5 h-5" />} title="Your Vehicles" count={vehicles.length} />
          {vehicles.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={<Car className="w-10 h-10" />} title="No vehicles yet" subtitle="Your vehicles will appear here once TJ Services adds them." />
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <Card key={v.id} className="overflow-hidden animate-fade-in-up" hover>
                  <div className="flex">
                    <div className="w-24 sm:w-28 bg-neutral-900 shrink-0">
                      {v.photo_url ? (
                        <img src={v.photo_url} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full min-h-[112px] flex items-center justify-center">
                          <Car className="w-8 h-8 text-neutral-700" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-display text-lg font-bold uppercase leading-tight">
                            {[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
                          </h3>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {v.license_plate && <span>Plate: {v.license_plate}</span>}
                            {v.color && <span> · {v.color}</span>}
                          </div>
                        </div>
                        <Badge color="red">{v.vin ? "VIN" : ""}</Badge>
                      </div>
                      {v.vin && <div className="text-[11px] text-neutral-600 mt-1 font-mono">{v.vin}</div>}
                      {v.notes && <p className="text-xs text-neutral-400 mt-2 line-clamp-2">{v.notes}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Service history timeline */}
        <section>
          <SectionTitle icon={<Wrench className="w-5 h-5" />} title="Service History" count={completedServices.length} />
          {completedServices.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={<Wrench className="w-10 h-10" />} title="No completed services yet" subtitle="Your service history will appear here." />
            </Card>
          ) : (
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-neutral-800" />
              {completedServices
                .sort((a, b) => (b.service_date || "").localeCompare(a.service_date || ""))
                .map((s) => {
                  const vehicle = vehicles.find((v) => v.id === s.vehicle_id);
                  return (
                    <div key={s.id} className="relative animate-fade-in-up">
                      <div className="absolute -left-[18px] top-4 w-3 h-3 rounded-full bg-red-600 ring-4 ring-black" />
                      <Card className="p-4" hover>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-display text-base font-bold uppercase">
                                {s.service_type || "Service"}
                              </h4>
                              <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-400">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {s.service_date}</span>
                              {s.mileage != null && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {s.mileage.toLocaleString()} mi</span>}
                              {vehicle && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {[vehicle.make, vehicle.model].filter(Boolean).join(" ")}</span>}
                            </div>
                            {s.description && <p className="text-sm text-neutral-300 mt-2">{s.description}</p>}
                            {s.notes && (
                              <div className="mt-2 text-xs text-neutral-400 bg-neutral-900/50 rounded-lg p-2.5 border border-neutral-800">
                                <span className="text-neutral-500 font-semibold">Notes: </span>{s.notes}
                              </div>
                            )}
                            {s.recommendations && (
                              <div className="mt-2 text-xs text-amber-400/90 bg-amber-950/20 rounded-lg p-2.5 border border-amber-900/30 flex items-start gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">Recommendation: </span>{s.recommendations}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {/* All records summary */}
        {(services || []).length > 0 && (
          <section>
            <SectionTitle icon={<FileText className="w-5 h-5" />} title="All Records" count={services.length} />
            <Card className="overflow-hidden">
              <div className="divide-y divide-neutral-900">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      {s.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-neutral-600" />}
                      <div>
                        <div className="text-sm font-medium">{s.service_type || "Service"}</div>
                        <div className="text-xs text-neutral-500">{s.service_date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      {s.mileage != null && <span>{s.mileage.toLocaleString()} mi</span>}
                      <Badge color={s.completed ? "green" : "amber"}>{s.completed ? "Done" : "Pending"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}
      </main>

      <footer className="text-center text-xs text-neutral-700 py-6 px-6">
        TJ Services · Need help? Call us to reset your PIN or update your records.
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card className="p-4 animate-fade-in-up">
      <div className="flex items-center gap-2 text-red-500 mb-1.5">{icon}</div>
      <div className="text-xs text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className="font-display text-xl font-bold mt-0.5">{value}</div>
    </Card>
  );
}

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="text-red-500">{icon}</div>
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h2>
      {count != null && <span className="text-xs text-neutral-600">({count})</span>}
    </div>
  );
}

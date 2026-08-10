import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { tjApi } from "../lib/supabase";
import type { Customer, Vehicle, ServiceRecord, DashboardStats } from "../lib/types";
import { Card, Badge, Button, Modal, Field, Input, Textarea, EmptyState, Spinner } from "../components/ui";
import {
  Car,
  Wrench,
  Users,
  LogOut,
  Plus,
  Search,
  KeyRound,
  Trash2,
  Pencil,
  ChevronRight,
  CheckCircle2,
  Gauge,
  Calendar,
  Award,
  LayoutDashboard,
  UserPlus,
  X,
} from "lucide-react";

type Tab = "dashboard" | "customers" | "customer";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const token = user!.token;
  const admin = user!.admin;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const r = await tjApi<{ stats: DashboardStats }>("dashboard", { token });
      setStats(r.stats);
    } catch {}
  }, [token]);

  const loadCustomers = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await tjApi<{ customers: Customer[] }>("customers", { token });
      setCustomers(r.customers);
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
    loadCustomers();
  }, [loadStats, loadCustomers]);

  const filtered = (customers || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_id.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search),
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-60 lg:min-h-screen bg-[#0c0c0c] border-b lg:border-b-0 lg:border-r border-neutral-900 flex lg:flex-col">
        <div className="p-4 flex items-center gap-2.5 lg:border-b border-neutral-900">
          <div className="w-9 h-9 rounded-lg bg-bronze-600 flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display text-base font-bold tracking-wider leading-none">TJ SERVICES</div>
            <div className="text-[9px] tracking-[0.25em] text-bronze-500 uppercase">Admin Console</div>
          </div>
        </div>

        <nav className="flex lg:flex-col p-2 lg:p-3 gap-1 flex-1">
          <NavBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={<LayoutDashboard className="w-4 h-4" />}>
            Dashboard
          </NavBtn>
          <NavBtn active={tab === "customers"} onClick={() => setTab("customers")} icon={<Users className="w-4 h-4" />}>
            Customers
          </NavBtn>
        </nav>

        <div className="hidden lg:block p-3 border-t border-neutral-900">
          <div className="text-xs text-neutral-500 mb-1">Signed in as</div>
          <div className="text-sm font-semibold">{admin?.display_name || admin?.username}</div>
          <Button variant="ghost" onClick={logout} className="w-full mt-3 justify-start text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
        <div className="lg:hidden">
          <Button variant="ghost" onClick={logout} className="px-3 py-2">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {tab === "dashboard" && stats && (
          <DashboardView stats={stats} customers={customers || []} onOpenCustomer={(c) => { setSelectedCustomer(c); setTab("customer"); }} onNewCustomer={() => setShowNewCustomer(true)} />
        )}
        {tab === "dashboard" && !stats && (
          <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8 text-bronze-600" /></div>
        )}
        {tab === "customers" && (
          <CustomersView
            customers={filtered || []}
            loading={loadingList}
            search={search}
            setSearch={setSearch}
            onOpen={(c) => { setSelectedCustomer(c); setTab("customer"); }}
            onNew={() => setShowNewCustomer(true)}
            onChanged={loadCustomers}
            token={token}
          />
        )}
        {tab === "customer" && selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            token={token}
            onBack={() => { setTab("customers"); setSelectedCustomer(null); }}
            onChanged={async () => { await loadCustomers(); await loadStats(); }}
          />
        )}
        {tab === "customer" && !selectedCustomer && (
          <div className="p-8"><EmptyState title="No customer selected" /></div>
        )}
      </div>

      <NewCustomerModal
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        token={token}
        onCreated={async (c) => { setShowNewCustomer(false); await loadCustomers(); setSelectedCustomer(c); setTab("customer"); }}
      />
    </div>
  );
}

function NavBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition flex-1 lg:flex-none text-left ${
        active ? "bg-bronze-600 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function DashboardView({ stats, customers, onOpenCustomer, onNewCustomer }: {
  stats: DashboardStats;
  customers: Customer[];
  onOpenCustomer: (c: Customer) => void;
  onNewCustomer: () => void;
}) {
  const recent = [...customers].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 5);
  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Overview of TJ Services operations</p>
        </div>
        <Button onClick={onNewCustomer}><UserPlus className="w-4 h-4" /> New Customer</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
        <StatBox icon={<Users className="w-5 h-5" />} label="Customers" value={stats.customers} />
        <StatBox icon={<Car className="w-5 h-5" />} label="Vehicles" value={stats.vehicles} />
        <StatBox icon={<Wrench className="w-5 h-5" />} label="Total Services" value={stats.services} />
        <StatBox icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={stats.completed} color="green" />
        <StatBox icon={<Calendar className="w-5 h-5" />} label="Pending" value={stats.pending} color="amber" />
      </div>

      <h2 className="font-display text-xl font-bold uppercase tracking-wide mb-3">Recent Customers</h2>
      {recent.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Users className="w-10 h-10" />} title="No customers yet" subtitle="Create your first customer to get started." /></Card>
      ) : (
        <div className="space-y-2">
          {recent.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between" hover>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-bronze-600/15 flex items-center justify-center font-display font-bold text-bronze-400">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-neutral-500">{c.client_id} · {c.vehicle_count || 0} vehicles · {c.completed_services || 0} services</div>
                </div>
              </div>
              <Button variant="ghost" onClick={() => onOpenCustomer(c)} className="text-sm">Open <ChevronRight className="w-4 h-4" /></Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: "green" | "amber" }) {
  const colorClass = color === "green" ? "text-green-500" : color === "amber" ? "text-amber-500" : "text-bronze-500";
  return (
    <Card className="p-4 animate-fade-in-up">
      <div className={`mb-1.5 ${colorClass}`}>{icon}</div>
      <div className="text-xs text-neutral-500 uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl font-bold mt-0.5">{value}</div>
    </Card>
  );
}

function CustomersView({ customers, loading, search, setSearch, onOpen, onNew, onChanged, token }: {
  customers: Customer[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  onOpen: (c: Customer) => void;
  onNew: () => void;
  onChanged: () => void;
  token: string;
}) {
  const [resetFor, setResetFor] = useState<Customer | null>(null);
  const [editFor, setEditFor] = useState<Customer | null>(null);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">Customers</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{customers.length} total</p>
        </div>
        <Button onClick={onNew}><UserPlus className="w-4 h-4" /> New Customer</Button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, Client ID, or phone..."
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="w-8 h-8 text-bronze-600" /></div>
      ) : customers.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Users className="w-10 h-10" />} title="No customers found" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {customers.map((c) => (
            <Card key={c.id} className="p-4" hover>
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => onOpen(c)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-bronze-600/15 flex items-center justify-center font-display font-bold text-bronze-400 shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-xs text-neutral-500 font-mono">{c.client_id}</div>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <Badge>{c.vehicle_count || 0} vehicles</Badge>
                      <Badge color="red">{c.completed_services || 0} services</Badge>
                    </div>
                  </div>
                </button>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => setEditFor(c)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 rounded-md transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setResetFor(c)} className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-white/5 rounded-md transition" title="Reset PIN"><KeyRound className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ResetPinModal open={!!resetFor} customer={resetFor} token={token} onClose={() => setResetFor(null)} />
      <EditCustomerModal open={!!editFor} customer={editFor} token={token} onClose={() => setEditFor(null)} onSaved={() => { setEditFor(null); onChanged(); }} />
    </div>
  );
}

function CustomerDetail({ customer, token, onBack, onChanged }: {
  customer: Customer;
  token: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [services, setServices] = useState<ServiceRecord[] | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState<Vehicle | "new" | null>(null);
  const [showServiceForm, setShowServiceForm] = useState<ServiceRecord | "new" | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    const [v, s] = await Promise.all([
      tjApi<{ vehicles: Vehicle[] }>(`vehicles?customer_id=${customer.id}`, { token }),
      tjApi<{ services: ServiceRecord[] }>(`services?customer_id=${customer.id}`, { token }),
    ]);
    setVehicles(v.vehicles);
    setServices(s.services);
  }, [token, customer.id]);

  useEffect(() => { load(); }, [load]);

  const completed = (services || []).filter((s) => s.completed).length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <button onClick={onBack} className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 mb-4">
        <ChevronRight className="w-4 h-4 rotate-180" /> Back to Customers
      </button>

      {/* Customer header */}
      <Card className="p-5 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-bronze-600/15 flex items-center justify-center font-display text-2xl font-bold text-bronze-400">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold uppercase">{customer.name}</h1>
              <div className="text-sm text-neutral-500 font-mono">{customer.client_id}</div>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-400">
                {customer.phone && <span className="flex items-center gap-1">📞 {customer.phone}</span>}
                {customer.email && <span className="flex items-center gap-1">✉ {customer.email}</span>}
              </div>
              {customer.address && <div className="text-xs text-neutral-500 mt-1">{customer.address}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4" /> Edit</Button>
            <Button variant="outline" onClick={() => setResetOpen(true)}><KeyRound className="w-4 h-4" /> Reset PIN</Button>
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 text-sm text-neutral-400 bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
            <span className="text-neutral-500 font-semibold">Notes: </span>{customer.notes}
          </div>
        )}
      </Card>

      {/* Loyalty mini */}
      <Card className="p-4 mb-6 flex items-center gap-4">
        <Award className="w-8 h-8 text-bronze-500" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Loyalty Progress</div>
          <div className="text-xs text-neutral-500">{completed} / {customer.loyalty_target} services completed</div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: customer.loyalty_target }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < completed ? "bg-bronze-600" : "bg-neutral-800"}`} />
          ))}
        </div>
      </Card>

      {/* Vehicles */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <Car className="w-5 h-5 text-bronze-500" /> Vehicles
        </h2>
        <Button variant="outline" onClick={() => setShowVehicleForm("new")}><Plus className="w-4 h-4" /> Add Vehicle</Button>
      </div>
      {!vehicles ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-bronze-600" /></div>
      ) : vehicles.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Car className="w-10 h-10" />} title="No vehicles" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {vehicles.map((v) => (
            <Card key={v.id} className="p-4" hover>
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-lg bg-neutral-900 shrink-0 overflow-hidden flex items-center justify-center">
                  {v.photo_url ? <img src={v.photo_url} alt="" className="w-full h-full object-cover" /> : <Car className="w-7 h-7 text-neutral-700" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display font-bold uppercase leading-tight">{[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}</h3>
                    <div className="flex gap-1">
                      <button onClick={() => setShowVehicleForm(v)} className="p-1 text-neutral-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {v.license_plate && <div className="text-xs text-neutral-500 mt-0.5">Plate: {v.license_plate}</div>}
                  {v.vin && <div className="text-[11px] text-neutral-600 font-mono truncate">{v.vin}</div>}
                  {v.notes && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{v.notes}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Services */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide flex items-center gap-2">
          <Wrench className="w-5 h-5 text-bronze-500" /> Service Records
        </h2>
        <Button variant="outline" onClick={() => setShowServiceForm("new")}><Plus className="w-4 h-4" /> Add Service</Button>
      </div>
      {!services ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-bronze-600" /></div>
      ) : services.length === 0 ? (
        <Card className="p-6"><EmptyState icon={<Wrench className="w-10 h-10" />} title="No services yet" /></Card>
      ) : (
        <div className="space-y-2">
          {services.sort((a, b) => (b.service_date || "").localeCompare(a.service_date || "")).map((s) => {
            const v = (vehicles || []).find((x) => x.id === s.vehicle_id);
            return (
              <ServiceRow key={s.id} service={s} vehicleName={v ? [v.make, v.model].filter(Boolean).join(" ") : "—"} onEdit={() => setShowServiceForm(s)} onComplete={async (notes, recs, mileage, photos, nextDate, nextMileage) => {
                await tjApi(`services/${s.id}/complete`, { method: "POST", body: { notes, recommendations: recs, mileage, photo_urls: photos, next_service_date: nextDate, next_service_mileage: nextMileage }, token });
                await load(); onChanged();
              }} token={token} onChanged={async () => { await load(); onChanged(); }} />
            );
          })}
        </div>
      )}

      {/* Modals */}
      <VehicleFormModal
        open={showVehicleForm !== null}
        vehicle={showVehicleForm === "new" ? null : showVehicleForm}
        customerId={customer.id}
        token={token}
        onClose={() => setShowVehicleForm(null)}
        onSaved={async () => { setShowVehicleForm(null); await load(); onChanged(); }}
      />
      <ServiceFormModal
        open={showServiceForm !== null}
        service={showServiceForm === "new" ? null : showServiceForm}
        vehicles={vehicles || []}
        customerId={customer.id}
        token={token}
        onClose={() => setShowServiceForm(null)}
        onSaved={async () => { setShowServiceForm(null); await load(); onChanged(); }}
      />
      <ResetPinModal open={resetOpen} customer={customer} token={token} onClose={() => setResetOpen(false)} />
      <EditCustomerModal open={editOpen} customer={customer} token={token} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); onChanged(); }} />
    </div>
  );
}

function ServiceRow({ service, vehicleName, onEdit, onComplete, token, onChanged }: {
  service: ServiceRecord;
  vehicleName: string;
  onEdit: () => void;
  onComplete: (notes: string, recs: string, mileage: number | null, photos: string[], nextDate: string | null, nextMileage: number | null) => Promise<void>;
  token: string;
  onChanged: () => void;
}) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <Card className="p-4" hover>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display font-bold uppercase">{service.service_type || "Service"}</h4>
            {service.completed ? <Badge color="green"><CheckCircle2 className="w-3 h-3" /> Completed</Badge> : <Badge color="amber">Pending</Badge>}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-400">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {service.service_date}</span>
            {service.mileage != null && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {service.mileage.toLocaleString()} mi</span>}
            <span>· {vehicleName}</span>
          </div>
          {service.description && <p className="text-sm text-neutral-300 mt-1.5">{service.description}</p>}
          {service.notes && <p className="text-xs text-neutral-500 mt-1"><span className="font-semibold">Notes:</span> {service.notes}</p>}
          {service.recommendations && <p className="text-xs text-amber-400/90 mt-1"><span className="font-semibold">Rec:</span> {service.recommendations}</p>}
          {service.photo_urls && service.photo_urls.length > 0 && (
            <div className="flex gap-2 mt-2">
              {service.photo_urls.map((p, i) => (
                <img key={i} src={p} alt="" className="w-12 h-12 rounded-md object-cover border border-neutral-800" />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!service.completed && (
            <Button onClick={() => setCompleteOpen(true)} className="text-sm py-2 px-3"><CheckCircle2 className="w-4 h-4" /> Complete</Button>
          )}
          <Button variant="ghost" onClick={onEdit} className="text-xs py-1.5 px-2"><Pencil className="w-3.5 h-3.5" /> Edit</Button>
          <button
            onClick={async () => {
              if (confirm("Delete this service record? This cannot be undone.")) {
                setDeleting(true);
                try { await tjApi(`services/${service.id}`, { method: "DELETE", token }); onChanged(); } catch (e) { alert((e as Error).message); } finally { setDeleting(false); }
              }
            }}
            disabled={deleting}
            className="text-xs text-neutral-500 hover:text-bronze-400 flex items-center gap-1 py-1 px-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
      <CompleteServiceModal open={completeOpen} onClose={() => setCompleteOpen(false)} service={service} onComplete={async (n, r, m, p, nd, nm) => { await onComplete(n, r, m, p, nd, nm); setCompleteOpen(false); }} />
    </Card>
  );
}

function CompleteServiceModal({ open, onClose, service, onComplete }: {
  open: boolean;
  onClose: () => void;
  service: ServiceRecord;
  onComplete: (notes: string, recommendations: string, mileage: number | null, photos: string[], nextDate: string | null, nextMileage: number | null) => Promise<void>;
}) {
  const [notes, setNotes] = useState(service.notes || "");
  const [recs, setRecs] = useState(service.recommendations || "");
  const [mileage, setMileage] = useState(service.mileage?.toString() || "");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>(service.photo_urls || []);
  const [nextDate, setNextDate] = useState(service.next_service_date || "");
  const [nextMileage, setNextMileage] = useState(service.next_service_mileage?.toString() || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes(service.notes || "");
      setRecs(service.recommendations || "");
      setMileage(service.mileage?.toString() || "");
      setPhotos(service.photo_urls || []);
      setNextDate(service.next_service_date || "");
      setNextMileage(service.next_service_mileage?.toString() || "");
    }
  }, [open, service]);

  const submit = async () => {
    setSaving(true);
    try {
      await onComplete(notes, recs, mileage ? parseInt(mileage) : null, photos, nextDate || null, nextMileage ? parseInt(nextMileage) : null);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete Service" size="lg">
      <div className="space-y-4">
        <div className="bg-green-950/30 border border-green-900/40 rounded-lg p-3 text-sm text-green-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> This will permanently save the service, update the customer's history, and record loyalty progress.
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Mileage at Service">
            <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="e.g. 52340" />
          </Field>
          <Field label="Next Service Date">
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Service Notes">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done, parts used, observations..." />
        </Field>
        <Field label="Recommendations">
          <Textarea rows={2} value={recs} onChange={(e) => setRecs(e.target.value)} placeholder="Recommended next service, items to watch..." />
        </Field>
        <Field label="Next Recommended Mileage">
          <Input type="number" value={nextMileage} onChange={(e) => setNextMileage(e.target.value)} placeholder="e.g. 58000" />
        </Field>
        <Field label="Service Photos (URLs)" hint="Add image URLs (e.g. hosted image links).">
          <div className="flex gap-2">
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
            <Button variant="outline" onClick={() => { if (photoUrl) { setPhotos([...photos, photoUrl]); setPhotoUrl(""); } }}><Plus className="w-4 h-4" /></Button>
          </div>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="w-16 h-16 rounded-md object-cover border border-neutral-800" />
                  <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-bronze-600 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}><CheckCircle2 className="w-4 h-4" /> Complete Service</Button>
        </div>
      </div>
    </Modal>
  );
}

function ServiceFormModal({ open, service, vehicles, customerId, token, onClose, onSaved }: {
  open: boolean;
  service: ServiceRecord | null;
  vehicles: Vehicle[];
  customerId: string;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!service;
  const [vehicleId, setVehicleId] = useState(service?.vehicle_id || vehicles[0]?.id || "");
  const [serviceDate, setServiceDate] = useState(service?.service_date || new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState(service?.mileage?.toString() || "");
  const [serviceType, setServiceType] = useState(service?.service_type || "");
  const [description, setDescription] = useState(service?.description || "");
  const [notes, setNotes] = useState(service?.notes || "");
  const [recs, setRecs] = useState(service?.recommendations || "");
  const [nextDate, setNextDate] = useState(service?.next_service_date || "");
  const [nextMileage, setNextMileage] = useState(service?.next_service_mileage?.toString() || "");
  const [photos, setPhotos] = useState<string[]>(service?.photo_urls || []);
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setVehicleId(service?.vehicle_id || vehicles[0]?.id || "");
      setServiceDate(service?.service_date || new Date().toISOString().slice(0, 10));
      setMileage(service?.mileage?.toString() || "");
      setServiceType(service?.service_type || "");
      setDescription(service?.description || "");
      setNotes(service?.notes || "");
      setRecs(service?.recommendations || "");
      setNextDate(service?.next_service_date || "");
      setNextMileage(service?.next_service_mileage?.toString() || "");
      setPhotos(service?.photo_urls || []);
    }
  }, [open, service, vehicles]);

  const submit = async () => {
    setSaving(true);
    try {
      const body = {
        vehicle_id: vehicleId,
        customer_id: customerId,
        service_date: serviceDate,
        mileage: mileage ? parseInt(mileage) : null,
        service_type: serviceType,
        description,
        notes,
        recommendations: recs,
        next_service_date: nextDate || null,
        next_service_mileage: nextMileage ? parseInt(nextMileage) : null,
        photo_urls: photos,
      };
      if (isEdit) {
        await tjApi(`services/${service!.id}`, { method: "PUT", body, token });
      } else {
        await tjApi("services", { method: "POST", body, token });
      }
      onSaved();
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Service" : "Add Service"} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Vehicle">
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="tj-input w-full rounded-lg px-3.5 py-2.5 text-sm">
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{[v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}</option>
              ))}
            </select>
          </Field>
          <Field label="Service Type">
            <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Oil Change, Brake Service..." />
          </Field>
          <Field label="Service Date">
            <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
          </Field>
          <Field label="Mileage">
            <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="e.g. 52340" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was performed..." />
        </Field>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Recommendations">
          <Textarea rows={2} value={recs} onChange={(e) => setRecs(e.target.value)} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Next Service Date">
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </Field>
          <Field label="Next Service Mileage">
            <Input type="number" value={nextMileage} onChange={(e) => setNextMileage(e.target.value)} />
          </Field>
        </div>
        <Field label="Photos (URLs)">
          <div className="flex gap-2">
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
            <Button variant="outline" onClick={() => { if (photoUrl) { setPhotos([...photos, photoUrl]); setPhotoUrl(""); } }}><Plus className="w-4 h-4" /></Button>
          </div>
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="w-16 h-16 rounded-md object-cover border border-neutral-800" />
                  <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-bronze-600 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
          )}
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? "Save Changes" : "Add Service"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function VehicleFormModal({ open, vehicle, customerId, token, onClose, onSaved }: {
  open: boolean;
  vehicle: Vehicle | null;
  customerId: string;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!vehicle;
  const [make, setMake] = useState(vehicle?.make || "");
  const [model, setModel] = useState(vehicle?.model || "");
  const [year, setYear] = useState(vehicle?.year?.toString() || "");
  const [vin, setVin] = useState(vehicle?.vin || "");
  const [plate, setPlate] = useState(vehicle?.license_plate || "");
  const [color, setColor] = useState(vehicle?.color || "");
  const [photoUrl, setPhotoUrl] = useState(vehicle?.photo_url || "");
  const [notes, setNotes] = useState(vehicle?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMake(vehicle?.make || ""); setModel(vehicle?.model || ""); setYear(vehicle?.year?.toString() || "");
      setVin(vehicle?.vin || ""); setPlate(vehicle?.license_plate || ""); setColor(vehicle?.color || "");
      setPhotoUrl(vehicle?.photo_url || ""); setNotes(vehicle?.notes || "");
    }
  }, [open, vehicle]);

  const submit = async () => {
    setSaving(true);
    try {
      const body = { make, model, year: year ? parseInt(year) : null, vin, license_plate: plate, color, photo_url: photoUrl, notes };
      if (isEdit) {
        await tjApi(`vehicles/${vehicle!.id}`, { method: "PUT", body, token });
      } else {
        await tjApi("vehicles", { method: "POST", body: { ...body, customer_id: customerId }, token });
      }
      onSaved();
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Vehicle" : "Add Vehicle"} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Make"><Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" /></Field>
          <Field label="Model"><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" /></Field>
          <Field label="Year"><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="VIN"><Input value={vin} onChange={(e) => setVin(e.target.value)} /></Field>
          <Field label="License Plate"><Input value={plate} onChange={(e) => setPlate(e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Color"><Input value={color} onChange={(e) => setColor(e.target.value)} /></Field>
          <Field label="Photo URL" hint="Link to a vehicle photo.">
            <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
          </Field>
        </div>
        {photoUrl && (
          <div className="flex justify-center">
            <img src={photoUrl} alt="" className="w-full max-h-40 object-cover rounded-lg border border-neutral-800" />
          </div>
        )}
        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? "Save Changes" : "Add Vehicle"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function NewCustomerModal({ open, onClose, token, onCreated }: {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: (c: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setName(""); setPin(""); setPhone(""); setEmail(""); setAddress(""); setNotes(""); setTarget("5"); } }, [open]);

  const submit = async () => {
    if (!name || !pin) return;
    setSaving(true);
    try {
      const r = await tjApi<{ customer: Customer }>("customers", {
        method: "POST",
        body: { name, pin, phone, email, address, notes, loyalty_target: parseInt(target) },
        token,
      });
      onCreated(r.customer);
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Customer" size="lg">
      <div className="space-y-4">
        <div className="bg-bronze-950/30 border border-bronze-900/40 rounded-lg p-3 text-sm text-bronze-300">
          A unique Client ID (e.g. TJ0001) will be generated automatically. Set a PIN the customer will use to log in.
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" /></Field>
          <Field label="PIN" hint="Customer will use this to log in."><Input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="4-8 digits" /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Loyalty Target" hint="Services needed for a reward."><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        </div>
        <Field label="Internal Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!name || !pin}><UserPlus className="w-4 h-4" /> Create Customer</Button>
        </div>
      </div>
    </Modal>
  );
}

function EditCustomerModal({ open, customer, token, onClose, onSaved }: {
  open: boolean;
  customer: Customer | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && customer) {
      setName(customer.name); setPhone(customer.phone || ""); setEmail(customer.email || "");
      setAddress(customer.address || ""); setNotes(customer.notes || ""); setTarget(String(customer.loyalty_target));
    }
  }, [open, customer]);

  if (!customer) return null;

  const submit = async () => {
    setSaving(true);
    try {
      await tjApi(`customers/${customer.id}`, {
        method: "PUT",
        body: { name, phone, email, address, notes, loyalty_target: parseInt(target) },
        token,
      });
      onSaved();
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Customer" size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Loyalty Target"><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        </div>
        <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Internal Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPinModal({ open, customer, token, onClose }: {
  open: boolean;
  customer: Customer | null;
  token: string;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (open) { setPin(""); setDone(false); } }, [open]);
  if (!customer) return null;

  const submit = async () => {
    if (!pin) return;
    setSaving(true);
    try {
      await tjApi(`customers/${customer.id}/reset-pin`, { method: "POST", body: { pin }, token });
      setDone(true);
    } catch (e) { alert((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reset Customer PIN" size="sm">
      {done ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold">PIN reset successfully.</p>
          <p className="text-sm text-neutral-500 mt-1">New PIN for {customer.name} ({customer.client_id}).</p>
          <Button onClick={onClose} className="mt-4">Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">Set a new PIN for <span className="font-semibold text-white">{customer.name}</span> ({customer.client_id}).</p>
          <Field label="New PIN"><Input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="4-8 digits" /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={saving} disabled={!pin}><KeyRound className="w-4 h-4" /> Reset PIN</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

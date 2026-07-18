import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Button, Input, Field } from "../components/ui";
import { Car, Lock, User, Shield, Wrench, Clock, Award, ChevronRight, QrCode } from "lucide-react";

export default function Landing() {
  const { login } = useAuth();
  const [mode, setMode] = useState<"customer" | "admin">("customer");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(mode, identifier, secret);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-tj-gold flex items-center justify-center shadow-lg shadow-tj-gold/30">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-wider leading-none">TJ SERVICES</div>
            <div className="text-[10px] tracking-[0.3em] text-neutral-500 uppercase">Customer Portal</div>
          </div>
        </div>
        <button
          onClick={() => setMode(mode === "customer" ? "admin" : "customer")}
          className="text-xs text-neutral-400 hover:text-white transition flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5" />
          {mode === "customer" ? "Admin Login" : "Customer Login"}
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left brand panel */}
        <section className="relative flex-1 px-6 py-10 lg:py-20 lg:px-16 flex flex-col justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-tj-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-tj-gold/5 rounded-full blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tj-gold/10 border border-tj-gold/30 text-amber-400 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              SCAN QR · ACCESS YOUR SERVICE RECORDS
            </div>
            <h1 className="font-display text-5xl lg:text-7xl font-black uppercase leading-[0.95] tracking-tight">
              Your vehicle.
              <br />
              <span className="text-tj-gold">Every record.</span>
              <br />
              One scan away.
            </h1>
            <p className="mt-6 text-neutral-400 text-base lg:text-lg leading-relaxed max-w-md">
              TJ Services keeps your full service history, mileage, and maintenance schedule
              in one secure place. Log in with your Client ID to view your records.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: <Wrench className="w-5 h-5" />, label: "Service History" },
                { icon: <Clock className="w-5 h-5" />, label: "Mileage Tracking" },
                { icon: <Award className="w-5 h-5" />, label: "Loyalty Rewards" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-neutral-800">
                  <div className="text-amber-500">{f.icon}</div>
                  <span className="text-xs text-neutral-400 font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right login panel */}
        <section className="lg:w-[460px] px-6 py-10 lg:py-16 lg:px-12 flex items-center justify-center bg-[#0c0c0c] border-t lg:border-t-0 lg:border-l border-neutral-900">
          <div className="w-full max-w-sm animate-fade-in-up">
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
              <QrCode className="w-4 h-4" />
              <span className="uppercase tracking-widest">Scan · Sign In · View</span>
            </div>
            <h2 className="font-display text-3xl font-bold uppercase mb-1">
              {mode === "customer" ? "Customer Sign-In" : "Admin Sign-In"}
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
              {mode === "customer"
                ? "Enter the Client ID and PIN provided by TJ Services."
                : "Authorized personnel only."}
            </p>

            {/* Mode tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-900 rounded-lg mb-6">
              <button
                onClick={() => setMode("customer")}
                className={`py-2 text-sm font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
                  mode === "customer" ? "bg-tj-gold text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" /> Customer
              </button>
              <button
                onClick={() => setMode("admin")}
                className={`py-2 text-sm font-semibold rounded-md transition flex items-center justify-center gap-1.5 ${
                  mode === "admin" ? "bg-tj-gold text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> Admin
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <Field label={mode === "customer" ? "Client ID" : "Admin Username"}>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={mode === "customer" ? "TJ0001" : "admin"}
                  autoCapitalize={mode === "customer" ? "characters" : "none"}
                  autoComplete="off"
                  required
                />
              </Field>
              <Field label={mode === "customer" ? "PIN" : "Password"}>
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="••••••"
                  autoComplete="off"
                  required
                />
              </Field>

              {error && (
                <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full py-3">
                Sign In <ChevronRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="mt-6 flex items-start gap-2 text-xs text-neutral-600">
              <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p>
                Your records are protected. Each Client ID only has access to its own vehicles
                and service history. Need your PIN reset? Contact TJ Services.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-neutral-600 border-t border-neutral-900">
        TJ Services · Automotive Service Portal · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

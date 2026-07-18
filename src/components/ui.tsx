import { ReactNode } from "react";
import { Loader2, X } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
  loading,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "outline" | "danger";
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-4 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "btn-primary",
    ghost: "bg-transparent text-neutral-300 hover:bg-white/5",
    outline: "border border-neutral-700 text-neutral-200 hover:border-tj-gold hover:text-white",
    danger: "bg-red-900/30 text-red-300 border border-red-800 hover:bg-red-900/50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Spinner className="w-4 h-4" />}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`bg-[#141414] border border-neutral-800 rounded-2xl ${hover ? "card-hover" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  color = "neutral",
}: {
  children: ReactNode;
  color?: "neutral" | "gold" | "green" | "amber" | "blue";
}) {
  const colors = {
    neutral: "bg-neutral-800 text-neutral-300",
    gold: "bg-tj-gold/15 text-amber-400 border border-amber-800/50",
    green: "bg-green-600/15 text-green-400 border border-green-800/50",
    amber: "bg-amber-600/15 text-amber-400 border border-amber-800/50",
    blue: "bg-blue-600/15 text-blue-400 border border-blue-800/50",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${colors[color]}`}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up">
      <div className={`w-full ${sizes[size]} bg-[#141414] border border-neutral-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`tj-input w-full rounded-lg px-3.5 py-2.5 text-sm ${props.className || ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`tj-input w-full rounded-lg px-3.5 py-2.5 text-sm resize-y ${props.className || ""}`}
    />
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-neutral-600 mb-3">{icon}</div>}
      <p className="font-display text-lg font-semibold text-neutral-300 uppercase">{title}</p>
      {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
    </div>
  );
}

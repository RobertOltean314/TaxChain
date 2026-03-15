import type { ReactNode } from "react";
import type { InvoiceStatus, PartnerTip } from "../../types";
import { STATUS_LABELS, PARTNER_TIP_LABELS } from "../../types";

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--amber)" }} />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-sm font-mono" style={{ color: "var(--text-dim)" }}>{msg}</p>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display text-3xl" style={{ color: "var(--text)" }}>{title}</h1>
        {sub && <p className="text-xs font-mono mt-1" style={{ color: "var(--text-dim)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
export function BtnPrimary({ onClick, children, type = "button", loading, disabled }: {
  onClick?: () => void; children: ReactNode; type?: "button" | "submit";
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50"
      style={{ color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-dim)" }}>
      {loading && <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--amber)" }} />}
      {children}
    </button>
  );
}

export function BtnGhost({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
      style={{ color: "var(--text-sub)", borderColor: "var(--border)" }}>
      {children}
    </button>
  );
}

export function BtnBack({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-mono mb-5 transition-colors"
      style={{ color: "var(--text-dim)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}>
      ← Înapoi
    </button>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────
export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: "var(--bg)" }}>
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider whitespace-nowrap"
            style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border)" }}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

export function TRow({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  return (
    <tr className={onClick ? "cursor-pointer" : ""}
      style={{ background: "var(--bg-card)" }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-card)"}
      onClick={onClick}>
      {children}
    </tr>
  );
}

export function TD({ children, mono, right }: { children: ReactNode; mono?: boolean; right?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm ${mono ? "font-mono" : ""} ${right ? "text-right" : ""}`}
      style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}>
      {children}
    </td>
  );
}

export const Dash = () => <span style={{ color: "var(--text-dim)" }}>—</span>;

// ─── Form helpers ─────────────────────────────────────────────────────────────
export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-mono uppercase tracking-wider mb-1.5"
      style={{ color: "var(--text-sub)" }}>
      {children}
      {required && <span className="ml-1" style={{ color: "var(--amber)" }}>*</span>}
    </label>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs font-mono" style={{ color: "var(--red)" }}>{msg}</p> : null;
}

export function inputCls(err?: boolean) {
  return [
    "w-full rounded-lg px-3 py-2 text-sm font-mono outline-none transition-colors",
    "bg-[var(--bg)] border text-[var(--text)] placeholder-[var(--text-dim)]",
    err ? "border-[var(--red)]" : "border-[var(--border)] focus:border-[var(--amber)]",
  ].join(" ");
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border p-5 space-y-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>{title}</p>
      {children}
    </div>
  );
}

// ─── Status badges ────────────────────────────────────────────────────────────
const INV_COLOR: Record<InvoiceStatus, [string, string]> = {
  Draft:     ["var(--text-sub)",   "var(--bg-raised)"],
  Issued:    ["var(--blue)",       "var(--blue-bg)"],
  Sent:      ["var(--violet)",     "#0d0b1f"],
  Paid:      ["var(--green)",      "var(--green-bg)"],
  Cancelled: ["var(--red)",        "var(--red-bg)"],
};

const PF_COLOR: Record<string, [string, string]> = {
  Activ:     ["var(--green)",  "var(--green-bg)"],
  Inactiv:   ["var(--text-sub)", "var(--bg-raised)"],
  Suspendat: ["var(--orange)", "var(--orange-bg)"],
};

const PJ_COLOR: Record<string, [string, string]> = {
  Activa:       ["var(--green)",  "var(--green-bg)"],
  Radiata:      ["var(--red)",    "var(--red-bg)"],
  Suspendata:   ["var(--orange)", "var(--orange-bg)"],
  InInsolventa: ["var(--orange)", "var(--orange-bg)"],
};

const PARTNER_COLOR: Record<PartnerTip, [string, string]> = {
  Client:   ["var(--blue)",  "var(--blue-bg)"],
  Furnizor: ["var(--green)", "var(--green-bg)"],
  Ambele:   ["var(--amber)", "var(--amber-bg)"],
};

export function Badge({
  value, variant,
}: {
  value: string;
  variant: "invoice" | "pf" | "pj" | "partner";
}) {
  let label = value;
  let color = "var(--text-sub)";
  let bg    = "var(--bg-raised)";

  if (variant === "invoice") {
    const c = INV_COLOR[value as InvoiceStatus];
    if (c) { [color, bg] = c; label = STATUS_LABELS[value as InvoiceStatus]; }
  } else if (variant === "pf" && PF_COLOR[value]) {
    [color, bg] = PF_COLOR[value];
  } else if (variant === "pj") {
    const c = PJ_COLOR[value];
    if (c) { [color, bg] = c; }
    if (value === "InInsolventa") label = "În insolvență";
  } else if (variant === "partner") {
    const c = PARTNER_COLOR[value as PartnerTip];
    if (c) { [color, bg] = c; label = PARTNER_TIP_LABELS[value as PartnerTip]; }
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium"
      style={{ color, background: bg, border: `1px solid ${color}33` }}>
      {label}
    </span>
  );
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const fmtNum = (n: number, currency?: string) =>
  n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
  (currency ? ` ${currency}` : "");

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });

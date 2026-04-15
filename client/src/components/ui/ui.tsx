import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ButtonHTMLAttributes,
} from "react";
import type { InvoiceStatus, PartnerType } from "../../types";

// ─── Loading States ──────────────────────────────────────────────────────────
export function Skeleton({ className = "h-4 w-24" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-border ${className}`}
      aria-hidden="true"
    />
  );
}

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full border-2 border-t-transparent animate-spin`}
      style={{ borderColor: "var(--blue) var(--blue) transparent transparent" }}
      role="status"
      aria-label="Loading"
    />
  );
}

// ─── Legacy Spinner (for backward compatibility) ─────────────────────────────
export function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <LoadingSpinner size="lg" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-20">
      <p className="text-sm font-mono" style={{ color: "var(--text-dim)" }}>
        {msg}
      </p>
    </div>
  );
}

// ─── Enhanced Buttons ────────────────────────────────────────────────────────
interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: BaseButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "bg-blue text-white hover:bg-blue-600 focus:ring-blue-500 shadow-sm",
    secondary:
      "bg-bg-card text-text border border-border hover:bg-bg-hover focus:ring-blue-500",
    ghost:
      "text-text-sub hover:text-text hover:bg-bg-hover focus:ring-blue-500",
    danger: "bg-red text-white hover:bg-red-600 focus:ring-red-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-text">{title}</h1>
        {subtitle && (
          <p className="text-sm text-text-dim font-mono">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
// ─── Legacy Button Components (for backward compatibility) ───────────────────
export function BtnPrimary({
  onClick,
  children,
  type = "button",
  loading,
  disabled,
}: {
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit";
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="primary"
      onClick={onClick}
      type={type}
      loading={loading}
      disabled={disabled}
      style={{
        boxShadow: "0 12px 30px rgba(49, 130, 206, 0.18)",
      }}
    >
      {children}
    </Button>
  );
}

export function BtnGhost({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant="ghost" onClick={onClick}>
      {children}
    </Button>
  );
}

export function BtnBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-mono mb-5 transition-colors hover:text-text"
      style={{ color: "var(--text-dim)" }}
    >
      ← Înapoi
    </button>
  );
}

// ─── Enhanced Table Components ───────────────────────────────────────────────
interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div
      className={`overflow-x-auto rounded-lg border border-border ${className}`}
    >
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

interface TableHeadProps {
  columns: string[];
}

export function TableHead({ columns }: TableHeadProps) {
  return (
    <thead>
      <tr className="border-b border-border bg-bg-raised">
        {columns.map((column, index) => (
          <th
            key={index}
            className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider text-text-dim"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface TableRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function TableRow({ children, onClick, className = "" }: TableRowProps) {
  return (
    <tr
      className={`border-b border-border bg-bg-card transition-colors ${
        onClick ? "cursor-pointer hover:bg-bg-hover" : ""
      } ${className}`}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export function TableCell({
  children,
  align = "left",
  className = "",
}: TableCellProps) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <td className={`px-4 py-3 text-text ${alignClasses[align]} ${className}`}>
      {children}
    </td>
  );
}

// ─── Legacy Table Helpers (for backward compatibility) ──────────────────────
export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background: "var(--bg)" }}>
        {cols.map((c) => (
          <th
            key={c}
            className="px-4 py-3 text-left text-xs font-mono uppercase tracking-wider whitespace-nowrap"
            style={{
              color: "var(--text-dim)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TRow({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <tr
      className={onClick ? "cursor-pointer" : ""}
      style={{ background: "var(--bg-card)" }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "var(--bg-card)")
      }
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  mono,
  right,
}: {
  children: ReactNode;
  mono?: boolean;
  right?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 text-sm ${mono ? "font-mono" : ""} ${right ? "text-right" : ""}`}
      style={{ color: "var(--text)", borderBottom: "1px solid var(--border)" }}
    >
      {children}
    </td>
  );
}

export const Dash = () => <span style={{ color: "var(--text-dim)" }}>—</span>;

// ─── Enhanced Form Components ────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: FormFieldProps) {
  const fieldId = `field-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={fieldId} className="block text-sm font-medium text-text">
        {label}
        {required && (
          <span className="text-red ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      <div className="relative">{children}</div>

      {hint && !error && (
        <p className="text-xs text-text-dim" id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}

      {error && (
        <p
          className="text-xs text-red"
          id={`${fieldId}-error`}
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  error?: boolean;
}

export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm border rounded-lg bg-bg-input text-text placeholder-text-dim transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? "border-red" : "border-border"
      } ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  error?: boolean;
  placeholder?: string;
}

export function Select({
  options,
  error,
  placeholder,
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      className={`w-full px-3 py-2 text-sm border rounded-lg bg-bg-input text-text transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? "border-red" : "border-border"
      } ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// ─── Legacy Form Helpers (for backward compatibility) ───────────────────────
export function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-xs font-mono uppercase tracking-wider mb-1.5"
      style={{ color: "var(--text-sub)" }}
    >
      {children}
      {required && (
        <span className="ml-1" style={{ color: "var(--amber)" }}>
          *
        </span>
      )}
    </label>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? (
    <p className="mt-1 text-xs font-mono" style={{ color: "var(--red)" }}>
      {msg}
    </p>
  ) : null;
}

export function inputCls(err?: boolean) {
  return [
    "w-full rounded-lg px-3 py-2 text-sm font-mono outline-none transition-colors",
    "bg-[var(--bg)] border text-[var(--text)] placeholder-[var(--text-dim)]",
    err
      ? "border-[var(--red)]"
      : "border-[var(--border)] focus:border-[var(--amber)]",
  ].join(" ");
}

// ─── Enhanced Card Component ──────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function EnhancedCard({
  children,
  title,
  className = "",
  padding = "md",
}: CardProps) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`rounded-xl border bg-bg-card shadow-sm ${paddingClasses[padding]} ${className}`}
      style={{ borderColor: "var(--border)" }}
    >
      {title && (
        <h3 className="text-sm font-mono uppercase tracking-wider text-text-dim mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ─── Legacy Card (for backward compatibility) ────────────────────────────────
export function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <p
        className="text-xs font-mono uppercase tracking-widest"
        style={{ color: "var(--text-dim)" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Enhanced Status Badge ───────────────────────────────────────────────────
interface EnhancedBadgeProps {
  value: string;
  variant: "invoice" | "pf" | "pj" | "partner";
  size?: "sm" | "md";
}

export function EnhancedBadge({
  value,
  variant,
  size = "md",
}: EnhancedBadgeProps) {
  // Color logic from original Badge
  let label = value;
  let color = "var(--text-sub)";
  let bg = "var(--bg-raised)";

  if (variant === "invoice") {
    const c = INV_COLOR[value as InvoiceStatus];
    if (c) {
      [color, bg] = c;
      label = value as InvoiceStatus;
    }
  } else if (variant === "pf" && PF_COLOR[value]) {
    [color, bg] = PF_COLOR[value];
  } else if (variant === "pj") {
    const c = PJ_COLOR[value];
    if (c) {
      [color, bg] = c;
    }
    if (value === "InInsolventa") label = "În insolvență";
  } else if (variant === "partner") {
    const c = PARTNER_COLOR[value as PartnerType];
    if (c) {
      [color, bg] = c;
      label = value as PartnerType;
    }
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        color,
        background: bg,
        border: `1px solid ${color}33`,
        boxShadow: `0 1px 2px ${color}20`,
      }}
    >
      {label}
    </span>
  );
}

// ─── Legacy Badge (for backward compatibility) ────────────────────────────────
// Status badges
const INV_COLOR: Record<InvoiceStatus, [string, string]> = {
  Draft: ["var(--text-sub)", "var(--bg-raised)"],
  Issued: ["var(--blue)", "var(--blue-bg)"],
  Sent: ["var(--violet)", "#0d0b1f"],
  Paid: ["var(--green)", "var(--green-bg)"],
  Cancelled: ["var(--red)", "var(--red-bg)"],
};

const PF_COLOR: Record<string, [string, string]> = {
  Activ: ["var(--green)", "var(--green-bg)"],
  Inactiv: ["var(--text-sub)", "var(--bg-raised)"],
  Suspendat: ["var(--orange)", "var(--orange-bg)"],
};

const PJ_COLOR: Record<string, [string, string]> = {
  Activa: ["var(--green)", "var(--green-bg)"],
  Radiata: ["var(--red)", "var(--red-bg)"],
  Suspendata: ["var(--orange)", "var(--orange-bg)"],
  InInsolventa: ["var(--orange)", "var(--orange-bg)"],
};

const PARTNER_COLOR: Record<PartnerType, [string, string]> = {
  Client: ["var(--blue)", "var(--blue-bg)"],
  Furnizor: ["var(--green)", "var(--green-bg)"],
  Ambele: ["var(--amber)", "var(--amber-bg)"],
};

export function Badge({
  value,
  variant,
}: {
  value: string;
  variant: "invoice" | "pf" | "pj" | "partner";
}) {
  return <EnhancedBadge value={value} variant={variant} size="md" />;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const fmtNum = (n: number, currency?: string) =>
  n.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + (currency ? ` ${currency}` : "");

export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ─── Enhanced Utility Functions ───────────────────────────────────────────────
export const formatCurrency = (amount: number, currency = "RON") => {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

// ─── Loading Skeleton Components ──────────────────────────────────────────────
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Table>
      <TableHead
        columns={Array(columns)
          .fill("")
          .map((_, i) => `Column ${i + 1}`)}
      />
      <tbody>
        {Array(rows)
          .fill(0)
          .map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array(columns)
                .fill(0)
                .map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-4 w-full max-w-24" />
                  </TableCell>
                ))}
            </TableRow>
          ))}
      </tbody>
    </Table>
  );
}

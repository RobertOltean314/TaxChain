interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmă",
  isLoading,
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;
  const accent = danger ? "var(--red)" : "var(--amber)";
  const accentBg = danger ? "var(--red-bg)" : "var(--amber-bg)";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className="relative rounded-xl border p-6 w-full max-w-sm mx-4 shadow-2xl"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <p
          className="text-base font-semibold mb-2"
          style={{ color: "var(--text)" }}
        >
          {title}
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--text-sub)" }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50"
            style={{ color: "var(--text-sub)", borderColor: "var(--border)" }}
          >
            Anulează
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ color: accent, background: accentBg, borderColor: accent }}
          >
            {isLoading && (
              <span
                className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: accent }}
              />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

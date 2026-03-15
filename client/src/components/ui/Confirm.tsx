interface Props {
  open: boolean; title: string; body: string;
  ok?: string; loading?: boolean; danger?: boolean;
  onOk: () => void; onCancel: () => void;
}

export function Confirm({ open, title, body, ok = "Confirmă", loading, danger = true, onOk, onCancel }: Props) {
  if (!open) return null;
  const accent = danger ? "var(--red)" : "var(--amber)";
  const accentBg = danger ? "var(--red-bg)" : "var(--amber-bg)";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-xl border p-6 w-full max-w-sm mx-4 shadow-2xl"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <p className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>{title}</p>
        <p className="text-sm mb-6" style={{ color: "var(--text-sub)" }}>{body}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50"
            style={{ color: "var(--text-sub)", borderColor: "var(--border)" }}>
            Anulează
          </button>
          <button onClick={onOk} disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ color: accent, background: accentBg, borderColor: accent }}>
            {loading && <span className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent }} />}
            {ok}
          </button>
        </div>
      </div>
    </div>
  );
}

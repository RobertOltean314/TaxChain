interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmă',
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative card p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>
            Anulează
          </button>
          <button className="btn-danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border border-danger border-t-transparent rounded-full animate-spin" />
                Se procesează...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

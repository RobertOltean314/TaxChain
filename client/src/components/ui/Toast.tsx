import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Kind = "ok" | "err" | "info";
interface T { id: number; msg: string; kind: Kind; }
interface Ctx { toast: (msg: string, kind?: Kind) => void; }

export const ToastCtx = createContext<Ctx>({} as Ctx);
export const useToast = () => useContext(ToastCtx);

let _n = 0;

const STYLE: Record<Kind, string> = {
  ok:   "border-[var(--green)]   bg-[var(--green-bg)]   text-[var(--green)]",
  err:  "border-[var(--red)]     bg-[var(--red-bg)]     text-[var(--red)]",
  info: "border-[var(--amber)]   bg-[var(--amber-bg)]   text-[var(--amber)]",
};
const ICON: Record<Kind, string> = { ok: "✓", err: "✕", info: "◆" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, set] = useState<T[]>([]);

  const toast = useCallback((msg: string, kind: Kind = "info") => {
    const id = ++_n;
    set((p) => [...p, { id, msg, kind }]);
    setTimeout(() => set((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`fade-up flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium backdrop-blur-sm shadow-2xl ${STYLE[t.kind]}`}>
            <span className="text-xs font-mono">{ICON[t.kind]}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

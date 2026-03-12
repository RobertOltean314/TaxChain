import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { persoanaFizicaApi } from '../api/persoanaFizica.api';
import { AppLayout } from '../components/ui/AppLayout';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/useAuth';
import type { PersoanaFizica } from '../types';

export function PersoanaFizicaPage() {
  const [records, setRecords] = useState<PersoanaFizica[]>([]);
  const [filtered, setFiltered] = useState<PersoanaFizica[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PersoanaFizica | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const canEdit = user?.role === 'Admin';

  const load = async () => {
    try {
      const data = await persoanaFizicaApi.getAll();
      setRecords(data);
      setFiltered(data);
    } catch {
      toast('Eroare la încărcarea datelor', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      records.filter(
        (r) =>
          r.cnp.includes(q) ||
          r.nume.toLowerCase().includes(q) ||
          r.prenume.toLowerCase().includes(q) ||
          (r.email ?? '').toLowerCase().includes(q)
      )
    );
  }, [search, records]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await persoanaFizicaApi.delete(deleteTarget.id);
      toast(`${deleteTarget.nume} ${deleteTarget.prenume} a fost șters`, 'success');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Eroare la ștergere', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl text-white mb-1">Persoane Fizice</h1>
            <p className="text-sm text-slate-400">
              {filtered.length} înregistrări
            </p>
          </div>
          {canEdit && (
            <Link to="/persoane-fizice/new" className="btn-primary">
              + Adaugă
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            placeholder="Caută după CNP, nume, prenume, email..."
            className="input-field max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  {['CNP', 'Nume', 'Prenume', 'Email', 'Stare', 'Wallet', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left text-xs text-slate-500 uppercase tracking-wider px-4 py-3 font-medium"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-surface-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-surface-border rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      {search ? 'Nicio înregistrare corespunzătoare' : 'Nicio înregistrare'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/persoane-fizice/${r.id}`)}
                      className="border-b border-surface-border/50 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-300">{r.cnp}</td>
                      <td className="px-4 py-3 text-white">{r.nume}</td>
                      <td className="px-4 py-3 text-slate-300">{r.prenume}</td>
                      <td className="px-4 py-3 text-slate-400">{r.email ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge stare={r.stare} />
                      </td>
                      <td className="px-4 py-3">
                        {r.wallet ? (
                          <span className="font-mono text-xs text-slate-500 truncate max-w-[120px] block">
                            {r.wallet.slice(0, 10)}…
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit && (
                          <button
                            className="btn-danger py-1 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(r);
                            }}
                          >
                            Șterge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Confirmare ștergere"
        message={
          deleteTarget
            ? `Ești sigur că vrei să ștergi ${deleteTarget.nume} ${deleteTarget.prenume}? Această acțiune este ireversibilă.`
            : ''
        }
        confirmLabel="Șterge"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { persoanaFizicaApi } from '../api/persoanaFizica.api';
import { persoanaJuridicaApi } from '../api/persoanaJuridica.api';
import { AppLayout } from '../components/ui/AppLayout';

export function DashboardPage() {
  const { user } = useAuth();
  const [pfCount, setPfCount] = useState<number | null>(null);
  const [pjCount, setPjCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [pf, pj] = await Promise.all([
          persoanaFizicaApi.getAll(),
          persoanaJuridicaApi.getAll(),
        ]);
        setPfCount(pf.length);
        setPjCount(pj.length);
      } catch {
        // counts stay null
      } finally {
        setIsLoading(false);
      }
    };
    fetchCounts();
  }, []);

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-display text-3xl text-white mb-1">
            Bun venit
            {user?.display_name ? `, ${user.display_name}` : ''}
          </h1>
          <p className="text-sm text-slate-400">
            Platformă de management fiscal · Rol:{' '}
            <span className="text-brand font-mono">{user?.role}</span>
          </p>
        </div>

        {/* Wallet info */}
        <div className="card p-4 mb-8 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <span className="text-accent text-sm">◈</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">Wallet custodial asignat</p>
            <p className="text-sm font-mono text-slate-300 truncate">
              {user?.assigned_wallet_address}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <StatCard
            label="Persoane Fizice"
            count={pfCount}
            isLoading={isLoading}
            icon="◈"
            to="/persoane-fizice"
          />
          <StatCard
            label="Persoane Juridice"
            count={pjCount}
            isLoading={isLoading}
            icon="◆"
            to="/persoane-juridice"
          />
        </div>

        {/* Quick actions — Admin only */}
        {user?.role === 'Admin' && (
          <div>
            <h2 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              Acțiuni rapide
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/persoane-fizice/new" className="btn-primary">
                + Persoană Fizică nouă
              </Link>
              <Link to="/persoane-juridice/new" className="btn-primary">
                + Persoană Juridică nouă
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({
  label,
  count,
  isLoading,
  icon,
  to,
}: {
  label: string;
  count: number | null;
  isLoading: boolean;
  icon: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="card p-5 flex items-center gap-4 hover:border-brand/30 hover:shadow-glow-sm transition-all duration-200 group"
    >
      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
        <span className="text-brand">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="font-display text-2xl text-white">
          {isLoading ? (
            <span className="inline-block w-12 h-6 bg-surface-border rounded animate-pulse" />
          ) : count !== null ? (
            count
          ) : (
            '—'
          )}
        </p>
      </div>
      <span className="ml-auto text-slate-600 group-hover:text-brand transition-colors">→</span>
    </Link>
  );
}

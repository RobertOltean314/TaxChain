import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useToast } from './Toast';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { to: '/persoane-fizice', label: 'Persoane Fizice', icon: '◈' },
  { to: '/persoane-juridice', label: 'Persoane Juridice', icon: '◆' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast('Ai fost deconectat', 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-surface-border bg-surface-raised/50">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-surface-border">
          <span className="font-display text-xl text-white tracking-tight">
            Tax<span className="text-brand">Chain</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand/10 text-brand border border-brand/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-slate-500 truncate">
              {user?.display_name ?? user?.email ?? 'Utilizator'}
            </div>
            <div className="text-xs font-mono text-slate-600 truncate mt-0.5">
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400
                       hover:text-danger hover:bg-danger/5 transition-all duration-150"
          >
            <span className="text-base leading-none">⏻</span>
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="text-center">
        <p className="font-mono text-6xl text-surface-border mb-4">403</p>
        <h1 className="font-display text-2xl text-white mb-2">Acces interzis</h1>
        <p className="text-slate-400 text-sm mb-8">
          Nu aveți permisiunea de a accesa această pagină.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
      </div>
    </div>
  );
}

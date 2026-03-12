type StareValue =
  | 'Activ'
  | 'Inactiv'
  | 'Suspendat'
  | 'Activa'
  | 'Radiata'
  | 'Suspendata'
  | 'InInsolventa';

const MAP: Record<StareValue, { label: string; cls: string }> = {
  Activ:       { label: 'Activ',       cls: 'badge badge-activ' },
  Activa:      { label: 'Activă',      cls: 'badge badge-activa' },
  Inactiv:     { label: 'Inactiv',     cls: 'badge badge-inactiv' },
  Suspendat:   { label: 'Suspendat',   cls: 'badge badge-suspendat' },
  Suspendata:  { label: 'Suspendată',  cls: 'badge badge-suspendata' },
  Radiata:     { label: 'Radiată',     cls: 'badge badge-radiata' },
  InInsolventa:{ label: 'Insolvență',  cls: 'badge badge-ininsolventa' },
};

export function StatusBadge({ stare }: { stare: StareValue }) {
  const { label, cls } = MAP[stare] ?? { label: stare, cls: 'badge badge-inactiv' };
  return <span className={cls}>{label}</span>;
}

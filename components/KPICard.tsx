'use client';

interface KPICardProps {
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
  icon?: string;
  prevValue?: string;
  improved?: boolean | null;
}

export default function KPICard({ label, value, color, onClick, clickable, icon, prevValue, improved }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-1
        ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        {icon && <span className="mr-1">{icon}</span>}{label}
      </span>
      <span className="text-2xl font-bold" style={{ color }}>
        {value}
      </span>
      {prevValue != null && (
        <div className="flex items-center gap-1 mt-0.5">
          {improved === true  && <span className="text-green-600 text-xs font-bold">↑</span>}
          {improved === false && <span className="text-red-500 text-xs font-bold">↓</span>}
          {improved === null  && <span className="text-gray-400 text-xs">—</span>}
          <span className="text-xs text-gray-400">vs {prevValue} periodo anterior</span>
        </div>
      )}
      {clickable && (
        <span className="text-xs text-gray-400 mt-1">Ver detalle →</span>
      )}
    </div>
  );
}

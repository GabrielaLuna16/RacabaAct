'use client';

interface KPICardProps {
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  clickable?: boolean;
  icon?: string;
  prevValue?: string;
  prevLabel?: string;
  improved?: boolean | null;
}

export default function KPICard({ label, value, color, onClick, clickable, icon, prevValue, prevLabel, improved }: KPICardProps) {
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
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        {prevValue != null && (
          <span className={`text-sm font-bold ${improved === true ? 'text-green-600' : improved === false ? 'text-red-500' : 'text-gray-400'}`}>
            {improved === true ? '↑' : improved === false ? '↓' : '—'}
            {improved != null && (() => {
              const curr = parseFloat(value);
              const prev = parseFloat(prevValue);
              const diff = Math.abs(curr - prev);
              return value.includes('h') || prevValue.includes('h')
                ? `${diff.toFixed(1)}h`
                : `${Math.round(diff)}%`;
            })()}
          </span>
        )}
      </div>
      {prevValue != null && prevLabel && (
        <div className="flex items-center gap-1 pt-1 border-t border-gray-100 mt-1">
          <span className="text-xs text-gray-400">{prevLabel}:</span>
          <span className="text-xs font-semibold text-gray-500">{prevValue}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import type { Turno } from '@/lib/processPrimerContacto';

type Filter = 'todos' | Turno;

interface TardioDetailPC {
  contacto: string;
  tarea: string;
  tarea_url?: string;
  creado: string;
  cerrado: string;
  turno?: Turno;
  tiempo_min?: number;
}

interface TardioDetailSeg {
  contacto: string;
  tarea: string;
  tarea_url?: string;
  due_date: string;
  cerrado: string;
  turno?: Turno;
  tiempo_min?: number;
}

interface TardioModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisor: string;
  type: 'primer_contacto' | 'seguimiento';
  rows: TardioDetailPC[] | TardioDetailSeg[];
  accentColor: string;
}

function fmtTiempo(min: number): string {
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${(min / 60).toFixed(1)} h`;
  return `${Math.round(min / 1440)} día${min >= 2880 ? 's' : ''}`;
}

const TURNO_LABEL: Record<Turno, string> = {
  horario_laboral: 'Horario laboral',
  fuera_horario:   'Fuera de horario',
  fin_semana:      'Día de descanso',
};

const TURNO_STYLE: Record<Turno, string> = {
  horario_laboral: 'bg-green-50 text-green-700 border border-green-200',
  fuera_horario:   'bg-amber-50 text-amber-700 border border-amber-200',
  fin_semana:      'bg-blue-50 text-blue-700 border border-blue-200',
};

function TurnoBadge({ turno }: { turno?: Turno }) {
  if (!turno) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${TURNO_STYLE[turno]}`}>
      {TURNO_LABEL[turno]}
    </span>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos',           label: 'TODOS' },
  { key: 'horario_laboral', label: 'HORARIO LABORAL' },
  { key: 'fuera_horario',   label: 'FUERA DE HORARIO L-V' },
  { key: 'fin_semana',      label: 'DÍA DE DESCANSO' },
];

export default function TardioModal({ isOpen, onClose, advisor, type, rows, accentColor }: TardioModalProps) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) { setFilter('todos'); setSearch(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const pcRows  = type === 'primer_contacto' ? (rows as TardioDetailPC[])  : [];
  const segRows = type === 'seguimiento'      ? (rows as TardioDetailSeg[]) : [];
  const allRows = type === 'primer_contacto'  ? pcRows : segRows;

  const filtered = allRows.filter((r) => {
    const matchFilter = filter === 'todos' || r.turno === filter;
    const matchSearch  = !search || r.contacto.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          style={{ borderTop: `4px solid ${accentColor}`, borderRadius: '1rem 1rem 0 0' }}
        >
          <div>
            <h2 className="text-lg font-bold text-gray-800">Cierres tardíos</h2>
            <p className="text-sm text-gray-500">{advisor} · {rows.length} registro{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Filtros + Búsqueda */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(({ key, label }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                  style={active
                    ? { background: accentColor, color: '#fff', borderColor: accentColor }
                    : { background: 'white', color: '#6b7280', borderColor: '#d1d5db' }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="ml-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[180px]"
          />
        </div>

        {/* Tabla */}
        <div className="overflow-auto flex-1">
          {filtered.length === 0 ? (
            <p className="p-6 text-gray-400 text-center">Sin registros</p>
          ) : type === 'primer_contacto' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide sticky top-0">
                  <th className="px-4 py-3 font-semibold">Contacto</th>
                  <th className="px-4 py-3 font-semibold">Tarea</th>
                  <th className="px-4 py-3 font-semibold">Creado</th>
                  <th className="px-4 py-3 font-semibold">Cerrado</th>
                  <th className="px-4 py-3 font-semibold">Turno</th>
                  <th className="px-4 py-3 font-semibold text-right">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {(filtered as TardioDetailPC[]).map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.contacto || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {r.tarea_url
                        ? <a href={r.tarea_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.tarea}</a>
                        : r.tarea}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.creado}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.cerrado}</td>
                    <td className="px-4 py-3"><TurnoBadge turno={r.turno} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                      {r.tiempo_min != null ? fmtTiempo(r.tiempo_min) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide sticky top-0">
                  <th className="px-4 py-3 font-semibold">Contacto</th>
                  <th className="px-4 py-3 font-semibold">Tarea</th>
                  <th className="px-4 py-3 font-semibold">Fecha límite</th>
                  <th className="px-4 py-3 font-semibold">Cerrado</th>
                  <th className="px-4 py-3 font-semibold">Turno</th>
                  <th className="px-4 py-3 font-semibold text-right">Tiempo tarde</th>
                </tr>
              </thead>
              <tbody>
                {(filtered as TardioDetailSeg[]).map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.contacto || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {r.tarea_url
                        ? <a href={r.tarea_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.tarea}</a>
                        : r.tarea}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.due_date}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.cerrado}</td>
                    <td className="px-4 py-3"><TurnoBadge turno={r.turno} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                      {r.tiempo_min != null ? fmtTiempo(r.tiempo_min) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

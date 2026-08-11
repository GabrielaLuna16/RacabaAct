'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import KPICard from './KPICard';
import type { AdvisorStats as PCStats, PrimerContactoData, Turno, NoRealizadaDetail } from '@/lib/processPrimerContacto';
import type { SectionStats, HugoAdvisorStats, SeguimientoData, NoRealizadaDetailSeg } from '@/lib/processSeguimiento';

const DonutChart = dynamic(() => import('./DonutChart'), { ssr: false });

type TabType = 'primer_contacto' | 'seguimiento';

const REST_DAY_LABEL: Record<string, string> = {
  'Hugo Cordova':   'Descanso: Martes',
  'Gladys Favela':  'Descanso: Jueves',
  'Erick Suarez':   'Descanso: Jueves',
  'Indira Villegas':'Descanso: Martes',
};

const COMPANY: Record<string, string> = {
  'Hugo Cordova':   'Bosques de Otay',
  'Gladys Favela':  'Bosques de Otay',
  'Erick Suarez':   'Baja Coast Realty',
  'Indira Villegas':'Baja Coast Realty',
};

const BOSQUES_ADVISORS = new Set(['Hugo Cordova', 'Gladys Favela']);

interface BrandColors {
  kpiATime: string; kpiTardio: string; kpiNoRealizada: string; kpiMediana: string;
  headerBg: string; headerBorder: string; avatarFrom: string; avatarTo: string;
  panelBg: string; accentFont: string;
}

const BRAND: Record<string, BrandColors> = {
  'Hugo Cordova': {
    kpiATime: '#5A614F', kpiTardio: '#8B4513', kpiNoRealizada: '#B8860B', kpiMediana: '#6B7360',
    headerBg: '#EBE7E4', headerBorder: '#D4CFC9', avatarFrom: '#5A614F', avatarTo: '#3C4235',
    panelBg: '#F7F5F3', accentFont: "'Cormorant Garamond', serif",
  },
  'Gladys Favela': {
    kpiATime: '#5A614F', kpiTardio: '#8B4513', kpiNoRealizada: '#B8860B', kpiMediana: '#6B7360',
    headerBg: '#EBE7E4', headerBorder: '#D4CFC9', avatarFrom: '#6B7360', avatarTo: '#4A5040',
    panelBg: '#F7F5F3', accentFont: "'Cormorant Garamond', serif",
  },
  'Erick Suarez': {
    kpiATime: '#2A7A4F', kpiTardio: '#E62C3A', kpiNoRealizada: '#B8860B', kpiMediana: '#1C2C3C',
    headerBg: '#DCE3ED', headerBorder: '#C2CFDC', avatarFrom: '#1C2C3C', avatarTo: '#0E1820',
    panelBg: '#F3F6FA', accentFont: "'Instrument Serif', serif",
  },
  'Indira Villegas': {
    kpiATime: '#2A7A4F', kpiTardio: '#E62C3A', kpiNoRealizada: '#B8860B', kpiMediana: '#1C2C3C',
    headerBg: '#DCE3ED', headerBorder: '#C2CFDC', avatarFrom: '#143852', avatarTo: '#1C2C3C',
    panelBg: '#F3F6FA', accentFont: "'Instrument Serif', serif",
  },
};

// ── Turno helpers ────────────────────────────────────────────────────────────

function fmtTiempo(min: number): string {
  if (min === 0) return '—';
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
  if (!turno) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${TURNO_STYLE[turno]}`}>
      {TURNO_LABEL[turno]}
    </span>
  );
}

// ── Inline tardio table ──────────────────────────────────────────────────────

function TardioInline({ stats, tabType }: { stats: PCStats | SectionStats; tabType: TabType }) {
  const [search, setSearch] = useState('');

  if (stats.cierre_tardio === 0) return null;

  type AnyRow = {
    contacto: string; tarea: string; tarea_url?: string;
    creado?: string; cerrado?: string; due_date?: string;
    tiempo_min?: number;
  };

  const rows = stats.tardio_detail as AnyRow[];
  const filtered = rows.filter((r) =>
    !search || r.contacto.toLowerCase().includes(search.toLowerCase())
  );

  const dateHeader = tabType === 'seguimiento' ? 'Fecha límite' : 'Creado';
  const timeHeader = tabType === 'seguimiento' ? 'Tiempo tarde' : 'Tiempo';

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Actividades con cierre tardío
      </p>

      <div className="flex justify-end mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[180px]"
        />
      </div>

      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-gray-400 text-center text-sm">Sin registros</p>
        ) : (
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Contacto</th>
                <th className="px-3 py-2 font-semibold">Tarea</th>
                <th className="px-3 py-2 font-semibold">{dateHeader}</th>
                <th className="px-3 py-2 font-semibold">Cerrado</th>
                <th className="px-3 py-2 font-semibold text-right">{timeHeader}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{r.contacto || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">
                    {r.tarea_url
                      ? <a href={r.tarea_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.tarea}</a>
                      : <span>{r.tarea}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {tabType === 'seguimiento' ? (r.due_date || '—') : (r.creado || '—')}
                  </td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.cerrado || '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-700 whitespace-nowrap">
                    {r.tiempo_min != null ? fmtTiempo(r.tiempo_min) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Inline no realizadas table ───────────────────────────────────────────────

function NoRealizadaInline({ stats, tabType }: { stats: PCStats | SectionStats; tabType: TabType }) {
  const [search, setSearch] = useState('');

  if (stats.no_realizada === 0) return null;

  const rows = (stats as PCStats).no_realizada_detail as (NoRealizadaDetail | NoRealizadaDetailSeg)[] | undefined;
  if (!rows || rows.length === 0) return null;

  const filtered = rows.filter((r) =>
    !search || r.contacto.toLowerCase().includes(search.toLowerCase())
  );

  const dateHeader = tabType === 'seguimiento' ? 'Fecha límite' : 'Creado';

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Actividades no realizadas
      </p>

      <div className="flex justify-end mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 min-w-[180px]"
        />
      </div>

      <div className="overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="py-4 text-gray-400 text-center text-sm">Sin registros</p>
        ) : (
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-left text-xs uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Contacto</th>
                <th className="px-3 py-2 font-semibold">Tarea</th>
                <th className="px-3 py-2 font-semibold">{dateHeader}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const dateVal = tabType === 'seguimiento'
                  ? (r as NoRealizadaDetailSeg).due_date
                  : (r as NoRealizadaDetail).creado;
                return (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{r.contacto || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[220px] truncate">
                      {r.tarea_url
                        ? <a href={r.tarea_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.tarea}</a>
                        : <span>{r.tarea}</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{dateVal || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Comparativa mensual ──────────────────────────────────────────────────────

interface CompareEntry {
  label: string; month: string;
  aTime: number; tardio: number; noRealizada: number; mediana: number | null;
}

function Trend({ delta, better, unit }: { delta: number; better: 'up' | 'down'; unit: '%' | 'h' }) {
  if (Math.abs(delta) < 0.5) return null;
  const isGood = better === 'up' ? delta > 0 : delta < 0;
  const display = unit === 'h' ? `${Math.abs(delta).toFixed(1)}h` : `${Math.abs(Math.round(delta))}%`;
  return (
    <span className={`ml-1 text-sm font-bold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {delta > 0 ? '↑' : '↓'}{display}
    </span>
  );
}

function MonthComparison({ entries, brand }: { entries: CompareEntry[]; brand: BrandColors }) {
  if (entries.length < 2) return null;
  return (
    <div className="mt-5 pt-4 border-t border-gray-200">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Comparativa mensual</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px]">
          <thead>
            <tr className="text-sm text-gray-500 border-b border-gray-200">
              <th className="text-left pb-3 font-semibold">Mes</th>
              <th className="text-right pb-3 font-semibold">A tiempo</th>
              <th className="text-right pb-3 font-semibold">Tardío</th>
              <th className="text-right pb-3 font-semibold">No realizadas</th>
              <th className="text-right pb-3 font-semibold">Mediana</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const prev = entries[i - 1];
              return (
                <tr key={e.month} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 text-gray-700 font-semibold text-sm">{e.label}</td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-base" style={{ color: brand.kpiATime }}>{e.aTime}%</span>
                    {prev && <Trend delta={e.aTime - prev.aTime} better="up" unit="%" />}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-base" style={{ color: brand.kpiTardio }}>{e.tardio}%</span>
                    {prev && <Trend delta={e.tardio - prev.tardio} better="down" unit="%" />}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-base" style={{ color: brand.kpiNoRealizada }}>{e.noRealizada}%</span>
                    {prev && <Trend delta={e.noRealizada - prev.noRealizada} better="down" unit="%" />}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold text-base" style={{ color: brand.kpiMediana }}>
                      {e.mediana != null ? `${e.mediana.toFixed(1)}h` : '—'}
                    </span>
                    {prev && e.mediana != null && prev.mediana != null && (
                      <Trend delta={e.mediana - prev.mediana} better="down" unit="h" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── StatSection ──────────────────────────────────────────────────────────────

type PrevEntry = { aTime: number; tardio: number; noRealizada: number; mediana: number | null } | null;

function calcImproved(curr: number, prev: number, better: 'up' | 'down'): boolean | null {
  if (curr === prev) return null;
  return better === 'up' ? curr > prev : curr < prev;
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function StatSection({
  stats, prevEntry, prevLabel, advisor, tabType, title, brand,
}: {
  stats: PCStats | SectionStats;
  prevEntry: PrevEntry;
  prevLabel?: string;
  advisor: string;
  tabType: TabType;
  title?: string;
  brand: BrandColors;
}) {
  const mediaHours = stats.mediana_horas;
  const mediaLabel = mediaHours != null ? `${mediaHours.toFixed(1)} hrs` : '—';

  return (
    <div className="mb-6">
      {title && (
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">{title}</h3>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard
          label="A tiempo" value={`${stats.pct_a_tiempo}%`} color={brand.kpiATime} icon="✅"
          prevValue={prevEntry ? `${prevEntry.aTime}%` : undefined}
          prevLabel={prevLabel}
          improved={prevEntry ? calcImproved(stats.pct_a_tiempo, prevEntry.aTime, 'up') : undefined}
        />
        <KPICard
          label="Cierre tardío" value={`${stats.pct_tardio}%`} color={brand.kpiTardio} icon="⏰"
          prevValue={prevEntry ? `${prevEntry.tardio}%` : undefined}
          prevLabel={prevLabel}
          improved={prevEntry ? calcImproved(stats.pct_tardio, prevEntry.tardio, 'down') : undefined}
        />
        <KPICard
          label="No realizadas" value={`${stats.pct_no_realizada}%`} color={brand.kpiNoRealizada} icon="⛔"
          prevValue={prevEntry ? `${prevEntry.noRealizada}%` : undefined}
          prevLabel={prevLabel}
          improved={prevEntry ? calcImproved(stats.pct_no_realizada, prevEntry.noRealizada, 'down') : undefined}
        />
        <KPICard
          label="Mediana de cierre" value={mediaLabel} color={brand.kpiMediana} icon="🕐"
          prevValue={prevEntry?.mediana != null ? `${prevEntry.mediana.toFixed(1)}h` : undefined}
          prevLabel={prevLabel}
          improved={prevEntry?.mediana != null && mediaHours != null
            ? calcImproved(mediaHours, prevEntry.mediana, 'down')
            : undefined}
        />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Cumplimiento a tiempo</span>
          <span className="font-semibold" style={{ color: brand.kpiATime }}>{stats.pct_a_tiempo}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${stats.pct_a_tiempo}%`, background: '#008000' }} />
        </div>
      </div>

      {/* Donut + legend */}
      <div className="flex items-center gap-6">
        <DonutChart
          aTime={stats.pct_a_tiempo} tardio={stats.pct_tardio} noRealizada={stats.pct_no_realizada}
          colorATime={brand.kpiATime} colorTardio={brand.kpiTardio} colorNoRealizada={brand.kpiNoRealizada}
        />
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: brand.kpiATime }} />
            <span className="text-gray-600">A tiempo</span>
            <span className="font-bold ml-1" style={{ color: brand.kpiATime }}>{stats.pct_a_tiempo}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: brand.kpiTardio }} />
            <span className="text-gray-600">Tardío</span>
            <span className="font-bold ml-1" style={{ color: brand.kpiTardio }}>{stats.pct_tardio}%</span>
          </div>
          {stats.pct_no_realizada > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: brand.kpiNoRealizada }} />
              <span className="text-gray-600">No realizada</span>
              <span className="font-bold ml-1" style={{ color: brand.kpiNoRealizada }}>{stats.pct_no_realizada}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Tardíos desplegados */}
      <TardioInline stats={stats} tabType={tabType} />

      {/* No realizadas desplegadas */}
      <NoRealizadaInline stats={stats} tabType={tabType} />
    </div>
  );
}

// ── AdvisorPanel ─────────────────────────────────────────────────────────────

interface AdvisorPanelProps {
  advisor: string;
  stats: PCStats | HugoAdvisorStats | SectionStats;
  tabType: TabType;
  allMonthsData: (PrimerContactoData | SeguimientoData)[];
  currentMonth: string;
}

export default function AdvisorPanel({ advisor, stats, tabType, allMonthsData, currentMonth }: AdvisorPanelProps) {
  const brand = BRAND[advisor] ?? BRAND['Hugo Cordova'];
  const isHugoSeg = tabType === 'seguimiento' && advisor === 'Hugo Cordova' && 'actividades' in stats;

  const compareEntries: CompareEntry[] = allMonthsData
    .filter((d) => advisor in d.advisors)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((d) => {
      const s = d.advisors[advisor];
      const st = ('actividades' in s) ? (s as HugoAdvisorStats).actividades : (s as PCStats | SectionStats);
      return {
        label: d.label, month: d.month,
        aTime: st.pct_a_tiempo, tardio: st.pct_tardio,
        noRealizada: st.pct_no_realizada, mediana: st.mediana_horas,
      };
    });

  const currentIdx = compareEntries.findIndex((e) => e.month === currentMonth);
  const prevEntry: PrevEntry = currentIdx > 0 ? compareEntries[currentIdx - 1] : null;
  const prevLabel = currentIdx > 0 ? compareEntries[currentIdx - 1].label : undefined;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ background: brand.panelBg }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4"
        style={{ background: brand.headerBg, borderBottom: `1px solid ${brand.headerBorder}` }}>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${brand.avatarFrom}, ${brand.avatarTo})` }}
        >
          {initials(advisor)}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: brand.accentFont }}>
            {advisor}
          </h2>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-500">{COMPANY[advisor]}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: brand.headerBorder, color: brand.avatarFrom }}>
              {REST_DAY_LABEL[advisor] ?? ''}
            </span>
          </div>
        </div>
        {BOSQUES_ADVISORS.has(advisor) && (
          <img
            src="/logos/bosques-de-otay.webp"
            alt="Bosques de Otay"
            className="h-10 object-contain opacity-80"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {isHugoSeg ? (
          <>
            <StatSection
              stats={(stats as HugoAdvisorStats).actividades}
              prevEntry={prevEntry} prevLabel={prevLabel}
              advisor={advisor} tabType={tabType} title="Actividades" brand={brand}
            />
            <div className="border-t border-gray-200 my-4" />
            <StatSection
              stats={(stats as HugoAdvisorStats).llamadas}
              prevEntry={null}
              advisor={advisor} tabType={tabType} title="Llamadas" brand={brand}
            />
          </>
        ) : (
          <StatSection
            stats={stats as PCStats | SectionStats}
            prevEntry={prevEntry} prevLabel={prevLabel}
            advisor={advisor} tabType={tabType} brand={brand}
          />
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import KPICard from './KPICard';
import TardioModal from './TardioModal';
import type { AdvisorStats as PCStats, PrimerContactoData } from '@/lib/processPrimerContacto';
import type { SectionStats, HugoAdvisorStats, SeguimientoData } from '@/lib/processSeguimiento';

const DonutChart = dynamic(() => import('./DonutChart'), { ssr: false });

type TabType = 'primer_contacto' | 'seguimiento';

const REST_DAY_LABEL: Record<string, string> = {
  'Hugo Cordova': 'Descanso: Martes',
  'Gladys Favela': 'Descanso: Jueves',
  'Erick Suarez': 'Descanso: Jueves',
  'Indira Villegas': 'Descanso: Martes',
};

const COMPANY: Record<string, string> = {
  'Hugo Cordova': 'Bosques de Otay',
  'Gladys Favela': 'Bosques de Otay',
  'Erick Suarez': 'Baja Coast Realty',
  'Indira Villegas': 'Baja Coast Realty',
};

interface BrandColors {
  kpiATime: string;
  kpiTardio: string;
  kpiNoRealizada: string;
  kpiMediana: string;
  headerBg: string;
  headerBorder: string;
  avatarFrom: string;
  avatarTo: string;
  panelBg: string;
  accentFont: string;
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

interface CompareEntry {
  label: string;
  month: string;
  aTime: number;
  tardio: number;
  noRealizada: number;
  mediana: number | null;
}

function Trend({ delta, better }: { delta: number; better: 'up' | 'down' }) {
  if (Math.abs(delta) < 0.5) return null;
  const isGood = better === 'up' ? delta > 0 : delta < 0;
  return (
    <span className={`ml-1 text-xs font-semibold ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {delta > 0 ? '↑' : '↓'}{Math.abs(Math.round(delta))}
    </span>
  );
}

function MonthComparison({ entries, brand }: { entries: CompareEntry[]; brand: BrandColors }) {
  if (entries.length < 2) return null;
  return (
    <div className="mt-5 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Comparativa mensual</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="text-xs text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2 font-medium">Mes</th>
              <th className="text-right pb-2 font-medium">A tiempo</th>
              <th className="text-right pb-2 font-medium">Tardío</th>
              <th className="text-right pb-2 font-medium">No realizadas</th>
              <th className="text-right pb-2 font-medium">Mediana</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const prev = entries[i - 1];
              return (
                <tr key={e.month} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-700 font-medium text-xs">{e.label}</td>
                  <td className="py-2 text-right">
                    <span className="font-bold" style={{ color: brand.kpiATime }}>{e.aTime}%</span>
                    {prev && <Trend delta={e.aTime - prev.aTime} better="up" />}
                  </td>
                  <td className="py-2 text-right">
                    <span className="font-bold" style={{ color: brand.kpiTardio }}>{e.tardio}%</span>
                    {prev && <Trend delta={e.tardio - prev.tardio} better="down" />}
                  </td>
                  <td className="py-2 text-right">
                    <span className="font-bold" style={{ color: brand.kpiNoRealizada }}>{e.noRealizada}%</span>
                    {prev && <Trend delta={e.noRealizada - prev.noRealizada} better="down" />}
                  </td>
                  <td className="py-2 text-right">
                    <span className="font-bold" style={{ color: brand.kpiMediana }}>
                      {e.mediana != null ? `${e.mediana.toFixed(1)}h` : '—'}
                    </span>
                    {prev && e.mediana != null && prev.mediana != null && (
                      <Trend delta={e.mediana - prev.mediana} better="down" />
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

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function StatSection({
  stats,
  advisor,
  tabType,
  title,
  brand,
}: {
  stats: PCStats | SectionStats;
  advisor: string;
  tabType: TabType;
  title?: string;
  brand: BrandColors;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const mediaHours = stats.mediana_horas;
  const mediaLabel = mediaHours != null ? `${mediaHours.toFixed(1)} hrs` : '—';

  return (
    <div className="mb-6">
      {title && (
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">{title}</h3>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard label="A tiempo" value={`${stats.pct_a_tiempo}%`} color={brand.kpiATime} icon="✅" />
        <KPICard
          label="Cierre tardío"
          value={`${stats.pct_tardio}%`}
          color={brand.kpiTardio}
          icon="⏰"
          clickable={stats.cierre_tardio > 0}
          onClick={() => stats.cierre_tardio > 0 && setModalOpen(true)}
        />
        <KPICard label="No realizadas" value={`${stats.pct_no_realizada}%`} color={brand.kpiNoRealizada} icon="⛔" />
        <KPICard label="Mediana de cierre" value={mediaLabel} color={brand.kpiMediana} icon="🕐" />
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Cumplimiento a tiempo</span>
          <span className="font-semibold" style={{ color: brand.kpiATime }}>{stats.pct_a_tiempo}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${stats.pct_a_tiempo}%`, background: brand.kpiATime }}
          />
        </div>
      </div>

      {/* Donut + legend */}
      <div className="flex items-center gap-6">
        <DonutChart
          aTime={stats.pct_a_tiempo}
          tardio={stats.pct_tardio}
          noRealizada={stats.pct_no_realizada}
          colorATime={brand.kpiATime}
          colorTardio={brand.kpiTardio}
          colorNoRealizada={brand.kpiNoRealizada}
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

      <TardioModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        advisor={advisor}
        type={tabType}
        rows={stats.tardio_detail}
        accentColor={brand.kpiTardio}
      />
    </div>
  );
}

interface AdvisorPanelProps {
  advisor: string;
  stats: PCStats | HugoAdvisorStats | SectionStats;
  tabType: TabType;
  allMonthsData: (PrimerContactoData | SeguimientoData)[];
}

export default function AdvisorPanel({ advisor, stats, tabType, allMonthsData }: AdvisorPanelProps) {
  const brand = BRAND[advisor] ?? BRAND['Hugo Cordova'];
  const isHugoSeg = tabType === 'seguimiento' && advisor === 'Hugo Cordova' && 'actividades' in stats;

  const compareEntries: CompareEntry[] = allMonthsData
    .filter((d) => advisor in d.advisors)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((d) => {
      const s = d.advisors[advisor];
      let st: PCStats | SectionStats;
      if ('actividades' in s) {
        st = (s as HugoAdvisorStats).actividades;
      } else {
        st = s as PCStats | SectionStats;
      }
      return {
        label: d.label,
        month: d.month,
        aTime: st.pct_a_tiempo,
        tardio: st.pct_tardio,
        noRealizada: st.pct_no_realizada,
        mediana: st.mediana_horas,
      };
    });

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ background: brand.panelBg }}>
      {/* Advisor header */}
      <div
        className="flex items-center gap-4 px-6 py-4"
        style={{ background: brand.headerBg, borderBottom: `1px solid ${brand.headerBorder}` }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${brand.avatarFrom}, ${brand.avatarTo})` }}
        >
          {initials(advisor)}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: brand.accentFont }}>
            {advisor}
          </h2>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-gray-500">{COMPANY[advisor]}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: brand.headerBorder, color: brand.avatarFrom }}
            >
              {REST_DAY_LABEL[advisor] ?? ''}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isHugoSeg ? (
          <>
            <StatSection
              stats={(stats as HugoAdvisorStats).actividades}
              advisor={advisor}
              tabType={tabType}
              title="Actividades"
              brand={brand}
            />
            <div className="border-t border-gray-200 my-4" />
            <StatSection
              stats={(stats as HugoAdvisorStats).llamadas}
              advisor={advisor}
              tabType={tabType}
              title="Llamadas"
              brand={brand}
            />
          </>
        ) : (
          <StatSection
            stats={stats as PCStats | SectionStats}
            advisor={advisor}
            tabType={tabType}
            brand={brand}
          />
        )}
        <MonthComparison entries={compareEntries} brand={brand} />
      </div>
    </div>
  );
}

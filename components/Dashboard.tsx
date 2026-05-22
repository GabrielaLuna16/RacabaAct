'use client';

import { useState, useEffect } from 'react';
import AdvisorTabs from './AdvisorTabs';
import type { PrimerContactoData } from '@/lib/processPrimerContacto';
import type { SeguimientoData } from '@/lib/processSeguimiento';

type MainTab = 'primer_contacto' | 'seguimiento';

function monthLabel(m: string): string {
  const [year, month] = m.split('-');
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

export default function Dashboard() {
  const [months, setMonths] = useState<string[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('primer_contacto');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [pcData, setPcData] = useState<PrimerContactoData | null>(null);
  const [segData, setSegData] = useState<SeguimientoData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load months index
  useEffect(() => {
    fetch('/data/months.json')
      .then((r) => r.ok ? r.json() : [])
      .then((m: string[]) => {
        setMonths(m);
        if (m.length > 0) setSelectedMonth(m[m.length - 1]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMonth) return;
    setLoading(true);
    setPcData(null);
    setSegData(null);

    Promise.all([
      fetch(`/data/primer-contacto/${selectedMonth}.json`).then((r) => r.ok ? r.json() : null),
      fetch(`/data/seguimiento/${selectedMonth}.json`).then((r) => r.ok ? r.json() : null),
    ]).then(([pc, seg]) => {
      setPcData(pc);
      setSegData(seg);
      setLoading(false);
    });
  }, [selectedMonth]);

  const activeData = mainTab === 'primer_contacto' ? pcData : segData;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              RACABA
            </span>
            <span className="text-xs text-gray-400 font-medium hidden sm:inline">Dashboard de Asesores</span>
          </div>

          <div className="flex items-center gap-3">
            {months.length > 0 ? (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5A614F]"
              >
                {[...months].reverse().map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-400">Sin datos cargados</span>
            )}
            <a
              href="/upload"
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium transition-colors"
            >
              + Cargar mes
            </a>
          </div>
        </div>
      </header>

      {/* Main tabs */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0">
            {(['primer_contacto', 'seguimiento'] as MainTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${mainTab === tab
                    ? 'border-[#5A614F] text-[#5A614F]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab === 'primer_contacto' ? 'Primer Contacto' : 'Seguimiento'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {months.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-lg font-medium mb-2">No hay datos cargados</p>
            <p className="text-sm mb-4">Sube los archivos Excel para comenzar.</p>
            <a href="/upload" className="text-sm text-[#5A614F] font-semibold hover:underline">Cargar primer mes →</a>
          </div>
        ) : loading ? (
          <div className="text-center py-24 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-[#5A614F] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Cargando {monthLabel(selectedMonth)}...</p>
          </div>
        ) : !activeData ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-sm">Sin datos para {monthLabel(selectedMonth)}</p>
          </div>
        ) : (
          <AdvisorTabs
            key={`${mainTab}-${selectedMonth}`}
            data={activeData}
            tabType={mainTab}
          />
        )}
      </main>
    </div>
  );
}

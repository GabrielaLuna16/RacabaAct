'use client';

import { useState } from 'react';
import AdvisorPanel from './AdvisorPanel';
import type { PrimerContactoData } from '@/lib/processPrimerContacto';
import type { SeguimientoData } from '@/lib/processSeguimiento';

type TabType = 'primer_contacto' | 'seguimiento';

const TAB_ACTIVE: Record<string, { bg: string; text: string }> = {
  'Hugo Cordova':   { bg: '#5A614F', text: '#EBE7E4' },
  'Gladys Favela':  { bg: '#6B7360', text: '#EBE7E4' },
  'Erick Suarez':   { bg: '#1C2C3C', text: '#DCE3ED' },
  'Indira Villegas':{ bg: '#143852', text: '#DCE3ED' },
};

const COMPANY_GROUP: Record<string, 'bosques' | 'baja'> = {
  'Hugo Cordova': 'bosques', 'Gladys Favela': 'bosques',
  'Erick Suarez': 'baja', 'Indira Villegas': 'baja',
};

interface AdvisorTabsProps {
  data: PrimerContactoData | SeguimientoData;
  tabType: TabType;
  allMonthsData: (PrimerContactoData | SeguimientoData)[];
}

export default function AdvisorTabs({ data, tabType, allMonthsData }: AdvisorTabsProps) {
  const advisors = Object.keys(data.advisors);
  const [active, setActive] = useState(advisors[0] ?? '');

  const bosques = advisors.filter((a) => COMPANY_GROUP[a] === 'bosques');
  const baja = advisors.filter((a) => COMPANY_GROUP[a] === 'baja');
  const others = advisors.filter((a) => !COMPANY_GROUP[a]);

  const TabButton = ({ advisor }: { advisor: string }) => {
    const isActive = advisor === active;
    const style = TAB_ACTIVE[advisor] ?? { bg: '#5A614F', text: '#EBE7E4' };
    return (
      <button
        onClick={() => setActive(advisor)}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        style={isActive
          ? { background: style.bg, color: style.text }
          : { background: 'transparent', color: '#374151' }
        }
      >
        {advisor}
      </button>
    );
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center flex-wrap gap-2 mb-6 bg-gray-50 rounded-xl p-2 border border-gray-100">
        {bosques.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 px-1">Bosques de Otay</span>
            {bosques.map((a) => <TabButton key={a} advisor={a} />)}
          </div>
        )}
        {baja.length > 0 && (
          <>
            {bosques.length > 0 && <div className="w-px h-6 bg-gray-200 mx-1" />}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 px-1">Baja Coast Realty</span>
              {baja.map((a) => <TabButton key={a} advisor={a} />)}
            </div>
          </>
        )}
        {others.map((a) => <TabButton key={a} advisor={a} />)}
      </div>

      {/* Panel */}
      {active && data.advisors[active] && (
        <AdvisorPanel
          advisor={active}
          stats={data.advisors[active]}
          tabType={tabType}
          allMonthsData={allMonthsData}
        />
      )}
    </div>
  );
}

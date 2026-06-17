'use client';

import { useState, useRef } from 'react';
import type { NonWorkingConfig, AdvisorNonWorking } from '@/lib/nonWorkingConfig';

const ADVISORS = ['Hugo Cordova', 'Gladys Favela', 'Erick Suarez', 'Indira Villegas'];

function emptyAdvisor(): AdvisorNonWorking {
  return { holidays: [], vacations: [] };
}

export default function UploadPage() {
  const [month, setMonth] = useState('');
  const [pcFile, setPcFile] = useState<File | null>(null);
  const [segFile, setSegFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Días no laborables
  const [showNonWorking, setShowNonWorking] = useState(false);
  const [activeAdvisor, setActiveAdvisor] = useState(ADVISORS[0]);
  const [nonWorking, setNonWorking] = useState<NonWorkingConfig>({});
  const [holidayInput, setHolidayInput] = useState('');
  const [vacStart, setVacStart] = useState('');
  const [vacEnd, setVacEnd] = useState('');

  const pcInputRef = useRef<HTMLInputElement>(null);
  const segInputRef = useRef<HTMLInputElement>(null);

  function getAdvisor(a: string): AdvisorNonWorking {
    return nonWorking[a] ?? emptyAdvisor();
  }
  function setAdvisor(a: string, val: AdvisorNonWorking) {
    setNonWorking(prev => ({ ...prev, [a]: val }));
  }

  function addHoliday() {
    if (!holidayInput) return;
    const cfg = getAdvisor(activeAdvisor);
    if (cfg.holidays.includes(holidayInput)) return;
    setAdvisor(activeAdvisor, { ...cfg, holidays: [...cfg.holidays, holidayInput].sort() });
    setHolidayInput('');
  }
  function removeHoliday(date: string) {
    const cfg = getAdvisor(activeAdvisor);
    setAdvisor(activeAdvisor, { ...cfg, holidays: cfg.holidays.filter(h => h !== date) });
  }
  function addVacation() {
    if (!vacStart || !vacEnd || vacStart > vacEnd) return;
    const cfg = getAdvisor(activeAdvisor);
    setAdvisor(activeAdvisor, { ...cfg, vacations: [...cfg.vacations, { start: vacStart, end: vacEnd }] });
    setVacStart('');
    setVacEnd('');
  }
  function removeVacation(i: number) {
    const cfg = getAdvisor(activeAdvisor);
    setAdvisor(activeAdvisor, { ...cfg, vacations: cfg.vacations.filter((_, idx) => idx !== i) });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || !pcFile || !segFile) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('month', month);
      fd.append('primer_contacto', pcFile);
      fd.append('seguimiento', segFile);
      fd.append('non_working_config', JSON.stringify(nonWorking));

      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.ok) {
        setResult({ ok: true, message: `✅ Datos de ${data.label} cargados correctamente. El sitio se actualizará en unos momentos.` });
        setPcFile(null);
        setSegFile(null);
        if (pcInputRef.current) pcInputRef.current.value = '';
        if (segInputRef.current) segInputRef.current.value = '';
      } else {
        setResult({ ok: false, message: `❌ Error: ${data.error}` });
      }
    } catch {
      setResult({ ok: false, message: '❌ Error de red. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const DropZone = ({
    label, file, inputRef, onChange,
  }: {
    label: string; file: File | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (f: File | null) => void;
  }) => {
    const [dragging, setDragging] = useState(false);
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragging ? 'border-[#5A614F] bg-[#f0ede8]' : 'border-gray-300 bg-gray-50 hover:border-[#5A614F] hover:bg-[#f7f5f3]'}`}
      >
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        <div className="text-3xl mb-2">📊</div>
        <p className="font-semibold text-gray-700">{label}</p>
        {file
          ? <p className="text-sm text-green-600 mt-1 font-medium">✓ {file.name}</p>
          : <p className="text-sm text-gray-400 mt-1">Arrastra el archivo o haz clic para seleccionar</p>}
      </div>
    );
  };

  const cfg = getAdvisor(activeAdvisor);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Cargar datos mensuales</h1>
          <p className="text-sm text-gray-500 mt-1">Sube los dos archivos Excel de Zoho CRM para agregar un nuevo mes al historial.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes de los datos</label>
            <input
              type="month" value={month} onChange={(e) => setMonth(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A614F]"
            />
          </div>

          {/* Archivos */}
          <DropZone label="Primer Contacto.xlsx" file={pcFile} inputRef={pcInputRef} onChange={setPcFile} />
          <DropZone label="Seguimiento.xlsx" file={segFile} inputRef={segInputRef} onChange={setSegFile} />

          {/* Días no laborables */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowNonWorking(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            >
              <span>Días no laborables <span className="text-gray-400 font-normal">(vacaciones y festivos)</span></span>
              <span className="text-gray-400 text-xs">{showNonWorking ? '▲ Ocultar' : '▼ Configurar'}</span>
            </button>

            {showNonWorking && (
              <div className="p-4 space-y-4">
                {/* Tabs por asesor */}
                <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-3">
                  {ADVISORS.map(a => (
                    <button
                      key={a} type="button"
                      onClick={() => { setActiveAdvisor(a); setHolidayInput(''); setVacStart(''); setVacEnd(''); }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                        ${activeAdvisor === a ? 'bg-[#5A614F] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {a.split(' ')[0]}
                      {(getAdvisor(a).holidays.length + getAdvisor(a).vacations.length) > 0 && (
                        <span className="ml-1 bg-white text-[#5A614F] rounded-full px-1 text-[10px] font-bold">
                          {getAdvisor(a).holidays.length + getAdvisor(a).vacations.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Festivos */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Festivos o días sueltos · <span className="font-normal normal-case">cierra al siguiente día hábil</span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="date" value={holidayInput} onChange={(e) => setHolidayInput(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A614F]"
                    />
                    <button type="button" onClick={addHoliday}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors">
                      + Agregar
                    </button>
                  </div>
                  {cfg.holidays.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cfg.holidays.map(h => (
                        <span key={h} className="flex items-center gap-1 bg-gray-100 rounded-full px-2.5 py-0.5 text-xs text-gray-700">
                          {h}
                          <button type="button" onClick={() => removeHoliday(h)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vacaciones */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Vacaciones · <span className="font-normal normal-case">cierra al primer día hábil tras el rango</span>
                  </p>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-1 uppercase">Inicio</p>
                      <input type="date" value={vacStart} onChange={(e) => setVacStart(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A614F]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-1 uppercase">Fin</p>
                      <input type="date" value={vacEnd} onChange={(e) => setVacEnd(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A614F]" />
                    </div>
                    <button type="button" onClick={addVacation}
                      disabled={!vacStart || !vacEnd || vacStart > vacEnd}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      + Agregar
                    </button>
                  </div>
                  {cfg.vacations.length > 0 && (
                    <div className="flex flex-col gap-1 mt-2">
                      {cfg.vacations.map((v, i) => (
                        <span key={i} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-1 text-xs text-gray-700">
                          {v.start} → {v.end}
                          <button type="button" onClick={() => removeVacation(i)} className="text-gray-400 hover:text-red-500 font-bold ml-2">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !month || !pcFile || !segFile}
            className="w-full py-3 rounded-xl font-semibold text-white transition-colors
              bg-[#5A614F] hover:bg-[#3C4235] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 'Cargar datos'}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-4 rounded-lg text-sm font-medium
            ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.message}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100">
          <a href="/" className="text-sm text-[#5A614F] hover:underline">← Volver al dashboard</a>
        </div>
      </div>
    </div>
  );
}

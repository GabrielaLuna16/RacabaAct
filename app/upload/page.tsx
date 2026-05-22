'use client';

import { useState, useRef } from 'react';

export default function UploadPage() {
  const [month, setMonth] = useState('');
  const [pcFile, setPcFile] = useState<File | null>(null);
  const [segFile, setSegFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const pcInputRef = useRef<HTMLInputElement>(null);
  const segInputRef = useRef<HTMLInputElement>(null);

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
    label,
    file,
    inputRef,
    onChange,
  }: {
    label: string;
    file: File | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (f: File | null) => void;
  }) => {
    const [dragging, setDragging] = useState(false);

    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) onChange(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragging ? 'border-[#5A614F] bg-[#f0ede8]' : 'border-gray-300 bg-gray-50 hover:border-[#5A614F] hover:bg-[#f7f5f3]'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <div className="text-3xl mb-2">📊</div>
        <p className="font-semibold text-gray-700">{label}</p>
        {file ? (
          <p className="text-sm text-green-600 mt-1 font-medium">✓ {file.name}</p>
        ) : (
          <p className="text-sm text-gray-400 mt-1">Arrastra el archivo o haz clic para seleccionar</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Cargar datos mensuales</h1>
          <p className="text-sm text-gray-500 mt-1">Sube los dos archivos Excel de Zoho CRM para agregar un nuevo mes al historial.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes de los datos</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A614F]"
            />
          </div>

          {/* Files */}
          <DropZone
            label="Primer Contacto.xlsx"
            file={pcFile}
            inputRef={pcInputRef}
            onChange={setPcFile}
          />
          <DropZone
            label="Seguimiento.xlsx"
            file={segFile}
            inputRef={segInputRef}
            onChange={setSegFile}
          />

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

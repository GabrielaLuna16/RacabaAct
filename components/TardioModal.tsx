'use client';

import { useEffect } from 'react';

interface TardioDetailPC {
  contacto: string;
  contacto_url?: string;
  tarea: string;
  creado: string;
  cerrado: string;
}

interface TardioDetailSeg {
  contacto: string;
  contacto_url?: string;
  tarea: string;
  due_date: string;
  cerrado: string;
}

interface TardioModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisor: string;
  type: 'primer_contacto' | 'seguimiento';
  rows: TardioDetailPC[] | TardioDetailSeg[];
  accentColor: string;
}

export default function TardioModal({ isOpen, onClose, advisor, type, rows, accentColor }: TardioModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pcRows = type === 'primer_contacto' ? (rows as TardioDetailPC[]) : [];
  const segRows = type === 'seguimiento' ? (rows as TardioDetailSeg[]) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          style={{ borderTop: `4px solid ${accentColor}`, borderRadius: '1rem 1rem 0 0' }}>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Cierres tardíos</h2>
            <p className="text-sm text-gray-500">{advisor} · {rows.length} registro{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {rows.length === 0 ? (
            <p className="p-6 text-gray-400 text-center">Sin registros tardíos</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="px-4 py-3 font-semibold">Contacto</th>
                  <th className="px-4 py-3 font-semibold">Tarea</th>
                  {type === 'primer_contacto' ? (
                    <>
                      <th className="px-4 py-3 font-semibold">Creado</th>
                      <th className="px-4 py-3 font-semibold">Cerrado</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-semibold">Fecha límite</th>
                      <th className="px-4 py-3 font-semibold">Cerrado</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {type === 'primer_contacto'
                  ? pcRows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {r.contacto_url
                          ? <a href={r.contacto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.contacto || '—'}</a>
                          : (r.contacto || '—')}
                      </td>
                      <td className="px-4 py-2">{r.tarea}</td>
                      <td className="px-4 py-2 text-gray-500">{r.creado}</td>
                      <td className="px-4 py-2 text-gray-500">{r.cerrado}</td>
                    </tr>
                  ))
                  : segRows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {r.contacto_url
                          ? <a href={r.contacto_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.contacto || '—'}</a>
                          : (r.contacto || '—')}
                      </td>
                      <td className="px-4 py-2">{r.tarea}</td>
                      <td className="px-4 py-2 text-gray-500">{r.due_date}</td>
                      <td className="px-4 py-2 text-gray-500">{r.cerrado}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

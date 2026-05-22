import { NextRequest, NextResponse } from 'next/server';
import { processPrimerContacto } from '@/lib/processPrimerContacto';
import { processSeguimiento } from '@/lib/processSeguimiento';
import { commitJsonToGitHub, updateMonthsList } from '@/lib/github';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const monthStr = formData.get('month') as string;
    const pcFile = formData.get('primer_contacto') as File | null;
    const segFile = formData.get('seguimiento') as File | null;

    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json({ error: 'Mes inválido (formato YYYY-MM)' }, { status: 400 });
    }
    if (!pcFile || !segFile) {
      return NextResponse.json({ error: 'Se requieren ambos archivos Excel' }, { status: 400 });
    }

    const pcBuffer = Buffer.from(await pcFile.arrayBuffer());
    const segBuffer = Buffer.from(await segFile.arrayBuffer());

    const pcData = processPrimerContacto({ buffer: pcBuffer }, monthStr);
    const segData = processSeguimiento({ buffer: segBuffer }, monthStr);

    await Promise.all([
      commitJsonToGitHub(
        `public/data/primer-contacto/${monthStr}.json`,
        pcData,
        `data: primer contacto ${monthStr}`
      ),
      commitJsonToGitHub(
        `public/data/seguimiento/${monthStr}.json`,
        segData,
        `data: seguimiento ${monthStr}`
      ),
    ]);

    await updateMonthsList(monthStr);

    return NextResponse.json({ ok: true, month: monthStr, label: pcData.label });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}

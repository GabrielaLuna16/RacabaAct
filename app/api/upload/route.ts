import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { processPrimerContacto } from '@/lib/processPrimerContacto';
import { processSeguimiento } from '@/lib/processSeguimiento';
import { commitJsonToGitHub, updateMonthsList } from '@/lib/github';

// USE_GITHUB=true → modo producción (commit a GitHub). Por defecto: modo local.
const IS_LOCAL = process.env.USE_GITHUB !== 'true';

async function saveLocally(filePath: string, content: unknown) {
  const abs = path.join(process.cwd(), filePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, JSON.stringify(content, null, 2), 'utf-8');
}

async function saveMonthsLocally(monthStr: string) {
  const abs = path.join(process.cwd(), 'public', 'data', 'months.json');
  let existing: string[] = [];
  try { existing = JSON.parse(await fs.readFile(abs, 'utf-8')); } catch { /* first time */ }
  if (!existing.includes(monthStr)) {
    await fs.writeFile(abs, JSON.stringify([...existing, monthStr].sort(), null, 2), 'utf-8');
  }
}

export async function POST(req: NextRequest) {
  console.log('[upload] USE_GITHUB:', process.env.USE_GITHUB, '| IS_LOCAL:', IS_LOCAL, '| cwd:', process.cwd());
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

    if (IS_LOCAL) {
      // Modo local: escribe directamente a public/data/
      await Promise.all([
        saveLocally(`public/data/primer-contacto/${monthStr}.json`, pcData),
        saveLocally(`public/data/seguimiento/${monthStr}.json`, segData),
      ]);
      await saveMonthsLocally(monthStr);
    } else {
      // Modo producción: commit a GitHub
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
    }

    return NextResponse.json({ ok: true, month: monthStr, label: pcData.label });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}

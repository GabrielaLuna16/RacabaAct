import * as XLSX from 'xlsx';

export type RawRow = Record<string, unknown>;

// Excel serial date to JS Date (UTC)
export function excelSerialToDate(serial: unknown): Date | null {
  if (serial == null || serial === '') return null;
  const n = parseFloat(String(serial));
  if (isNaN(n)) return null;
  // Excel epoch: Dec 30, 1899
  return new Date((n - 25569) * 86400 * 1000);
}

// Remove trailing count in parentheses: "Hugo Cordova (96)" → "Hugo Cordova"
function cleanParens(val: unknown): string {
  if (val == null) return '';
  return String(val).replace(/\s*\(.*\)\s*$/, '').trim();
}

export interface ParsedExcelOptions {
  filePath?: string;
  buffer?: ArrayBuffer | Buffer;
  headerRow?: number; // 1-based row number of headers (default: 7)
}

export function parseExcel(opts: ParsedExcelOptions): RawRow[] {
  let wb: XLSX.WorkBook;
  if (opts.buffer) {
    wb = XLSX.read(opts.buffer, { type: 'buffer', cellDates: false });
  } else if (opts.filePath) {
    wb = XLSX.readFile(opts.filePath, { cellDates: false });
  } else {
    throw new Error('Provide filePath or buffer');
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const headerRowIndex = (opts.headerRow ?? 7) - 1; // 0-based

  // Read all rows as array-of-arrays
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const headers = (aoa[headerRowIndex] as unknown[]).map((h) =>
    h != null ? String(h).trim() : ''
  );

  const dataRows = aoa.slice(headerRowIndex + 1);

  // Build objects, forward-fill Task Owner and Status
  let lastOwner = '';
  let lastStatus = '';
  const rows: RawRow[] = [];

  for (const rawRow of dataRows) {
    const arr = rawRow as unknown[];
    const obj: RawRow = {};
    headers.forEach((h, i) => {
      obj[h] = arr[i] ?? null;
    });

    // Forward fill
    const owner = cleanParens(obj['Task Owner']);
    const status = cleanParens(obj['Status']);

    if (owner) lastOwner = owner;
    if (status) lastStatus = status;

    obj['Task Owner'] = lastOwner;
    obj['Status'] = lastStatus;

    // Filter: only rows with a Subject
    const subject = obj['Subject'];
    if (!subject || String(subject).trim() === '') continue;

    rows.push(obj);
  }

  return rows;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function formatDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

export function formatDateOnly(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

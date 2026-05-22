import { parseExcel, excelSerialToDate, median, formatDate, RawRow } from './excelUtils';

// 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
const REST_DAYS: Record<string, number> = {
  'Hugo Cordova': 2,    // martes
  'Gladys Favela': 4,   // jueves
  'Erick Suarez': 4,    // jueves
  'Indira Villegas': 2, // martes
};

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function getDueDate(created: Date, advisor: string): Date {
  const restDay = REST_DAYS[advisor] ?? -1;
  let due = new Date(created);

  // If created on rest day → next day
  if (due.getUTCDay() === restDay) {
    due = addDays(due, 1);
  }
  // If created after 5 PM (UTC hours; Excel stores in UTC) → next day
  if (created.getUTCHours() >= 17) {
    due = addDays(due, 1);
  }
  // If due_date falls on rest day → next day
  if (due.getUTCDay() === restDay) {
    due = addDays(due, 1);
  }
  // If the day AFTER due_date is rest day → extend 2 more days
  if (addDays(due, 1).getUTCDay() === restDay) {
    due = addDays(due, 2);
  }

  return due;
}

export interface TardioDetail {
  contacto: string;
  tarea: string;
  creado: string;
  cerrado: string;
}

export interface AdvisorStats {
  total: number;
  a_tiempo: number;
  cierre_tardio: number;
  no_realizada: number;
  pct_a_tiempo: number;
  pct_tardio: number;
  pct_no_realizada: number;
  mediana_horas: number | null;
  tardio_detail: TardioDetail[];
}

export interface PrimerContactoData {
  month: string;
  label: string;
  advisors: Record<string, AdvisorStats>;
}

function monthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

const ADVISOR_ORDER = ['Hugo Cordova', 'Gladys Favela', 'Erick Suarez', 'Indira Villegas'];

export function processPrimerContacto(
  opts: { filePath?: string; buffer?: ArrayBuffer | Buffer },
  monthStr: string
): PrimerContactoData {
  const rows: RawRow[] = parseExcel({ ...opts, headerRow: 7 });

  const byAdvisor: Record<string, {
    closingHours: number[];
    counts: { a_tiempo: number; cierre_tardio: number; no_realizada: number };
    tardio: TardioDetail[];
  }> = {};

  for (const row of rows) {
    const advisor = String(row['Task Owner'] ?? '').trim();
    if (!advisor) continue;

    if (!byAdvisor[advisor]) {
      byAdvisor[advisor] = {
        closingHours: [],
        counts: { a_tiempo: 0, cierre_tardio: 0, no_realizada: 0 },
        tardio: [],
      };
    }

    const created = excelSerialToDate(row['Created Time']);
    const closed = excelSerialToDate(row['Closed Time']);
    const subject = String(row['Subject'] ?? '').trim();
    const contact =
      String(row['Related To'] ?? '').trim() ||
      String(row['Contact Name'] ?? '').trim();

    const data = byAdvisor[advisor];

    if (!closed) {
      data.counts.no_realizada++;
      continue;
    }

    if (!created) {
      data.counts.no_realizada++;
      continue;
    }

    const dueDate = getDueDate(created, advisor);
    const closedDateOnly = new Date(Date.UTC(
      closed.getUTCFullYear(), closed.getUTCMonth(), closed.getUTCDate()
    ));
    const dueDateOnly = new Date(Date.UTC(
      dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()
    ));

    // Hours between created and closed
    const hours = (closed.getTime() - created.getTime()) / 3600000;
    if (hours >= 0) data.closingHours.push(hours);

    if (closedDateOnly <= dueDateOnly) {
      data.counts.a_tiempo++;
    } else {
      data.counts.cierre_tardio++;
      data.tardio.push({
        contacto: contact,
        tarea: subject,
        creado: formatDate(created),
        cerrado: formatDate(closed),
      });
    }
  }

  const advisors: Record<string, AdvisorStats> = {};

  // Keep defined order + any new advisors at the end
  const orderedAdvisors = [
    ...ADVISOR_ORDER.filter((a) => byAdvisor[a]),
    ...Object.keys(byAdvisor).filter((a) => !ADVISOR_ORDER.includes(a)),
  ];

  for (const advisor of orderedAdvisors) {
    const d = byAdvisor[advisor];
    const total = d.counts.a_tiempo + d.counts.cierre_tardio + d.counts.no_realizada;
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

    advisors[advisor] = {
      total,
      a_tiempo: d.counts.a_tiempo,
      cierre_tardio: d.counts.cierre_tardio,
      no_realizada: d.counts.no_realizada,
      pct_a_tiempo: pct(d.counts.a_tiempo),
      pct_tardio: pct(d.counts.cierre_tardio),
      pct_no_realizada: pct(d.counts.no_realizada),
      mediana_horas: median(d.closingHours),
      tardio_detail: d.tardio,
    };
  }

  return { month: monthStr, label: monthLabel(monthStr), advisors };
}

import { parseExcel, excelSerialToDate, median, formatDate, formatDateOnly, RawRow } from './excelUtils';
import { NonWorkingConfig, skipToNextWorkingDay } from './nonWorkingConfig';

// 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
const REST_DAYS: Record<string, number> = {
  'Hugo Cordova': 2,    // martes
  'Gladys Favela': 4,   // jueves
  'Erick Suarez': 4,    // jueves
  'Indira Villegas': 2, // martes
};

// Horario laboral (horas decimales en tiempo local — Excel serial se trata como hora local)
const WORK_START: Record<string, number> = {
  'Hugo Cordova':   10.5, // 10:30 AM
  'Gladys Favela':  10.5, // 10:30 AM
  'Erick Suarez':   10,   // 10:00 AM
  'Indira Villegas':10,   // 10:00 AM
};
const WORK_END = 17; // 5:00 PM todos

// Calcula horas laborales entre dos fechas (solo cuenta tiempo dentro del horario)
function workingHoursBetween(created: Date, closed: Date, advisor: string): number {
  if (closed.getTime() <= created.getTime()) return 0;
  const startHour = WORK_START[advisor] ?? 10;
  const restDay = REST_DAYS[advisor] ?? -1;
  let total = 0;
  let day = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
  while (day.getTime() < closed.getTime()) {
    if (day.getUTCDay() !== restDay) {
      const winStart = Math.max(created.getTime(), day.getTime() + startHour * 3600000);
      const winEnd   = Math.min(closed.getTime(),  day.getTime() + WORK_END  * 3600000);
      if (winStart < winEnd) total += (winEnd - winStart) / 3600000;
    }
    day = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1));
  }
  return total;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function getDueDate(created: Date, advisor: string, config: NonWorkingConfig): Date {
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

  // Skip vacaciones y festivos configurados
  due = skipToNextWorkingDay(due, advisor, restDay, config);

  return due;
}

export interface TardioDetail {
  contacto: string;
  tarea: string;
  tarea_url: string;
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
  monthStr: string,
  nonWorking: NonWorkingConfig = {}
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
    const relatedTo  = String(row['Related To']   ?? '').trim();
    const contactName = String(row['Contact Name'] ?? '').trim();
    const contact = relatedTo || contactName;
    const recordIdRaw = String(row['Record Id'] ?? row['Record ID'] ?? '').trim();
    const recordId = recordIdRaw.replace(/^zcrm_/, '');
    const tarea_url = recordId
      ? `https://crm.zoho.com/crm/org890924063/tab/Tasks/${recordId}`
      : '';

    const data = byAdvisor[advisor];

    if (!closed) {
      data.counts.no_realizada++;
      continue;
    }

    if (!created) {
      data.counts.no_realizada++;
      continue;
    }

    const dueDate = getDueDate(created, advisor, nonWorking);
    const closedDateOnly = new Date(Date.UTC(
      closed.getUTCFullYear(), closed.getUTCMonth(), closed.getUTCDate()
    ));
    const dueDateOnly = new Date(Date.UTC(
      dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()
    ));

    // Horas laborales entre creación y cierre (solo cuenta dentro del horario del asesor)
    const hours = workingHoursBetween(created, closed, advisor);
    if (hours > 0) data.closingHours.push(hours);

    if (closedDateOnly <= dueDateOnly) {
      data.counts.a_tiempo++;
    } else {
      data.counts.cierre_tardio++;
      data.tardio.push({
        contacto: contact,
        tarea: subject,
        tarea_url,
        creado: formatDateOnly(created),
        cerrado: formatDateOnly(closed),
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

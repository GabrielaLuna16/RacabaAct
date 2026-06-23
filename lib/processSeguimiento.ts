import { parseExcel, excelSerialToDate, median, formatDate, formatDateOnly, RawRow } from './excelUtils';
import { NonWorkingConfig, skipToNextWorkingDay } from './nonWorkingConfig';

const REST_DAYS: Record<string, number> = {
  'Hugo Cordova': 2,    // martes
  'Gladys Favela': 4,   // jueves
  'Erick Suarez': 4,    // jueves
  'Indira Villegas': 2, // martes
};

const WORK_START: Record<string, number> = {
  'Hugo Cordova': 10.5, 'Gladys Favela': 10.5,
  'Erick Suarez': 10,   'Indira Villegas': 10,
};
const WORK_END = 17;

export type Turno = 'horario_laboral' | 'fuera_horario' | 'fin_semana';

function getTurno(dt: Date, advisor: string): Turno {
  const dow = dt.getUTCDay();
  const restDay = REST_DAYS[advisor] ?? -1;
  if (dow === 0 || dow === 6 || dow === restDay) return 'fin_semana';
  const h = dt.getUTCHours() + dt.getUTCMinutes() / 60;
  const start = WORK_START[advisor] ?? 10;
  return h >= start && h < WORK_END ? 'horario_laboral' : 'fuera_horario';
}

function workingHoursBetween(start: Date, end: Date, advisor: string): number {
  if (end.getTime() <= start.getTime()) return 0;
  const startHour = WORK_START[advisor] ?? 10;
  const restDay = REST_DAYS[advisor] ?? -1;
  let total = 0;
  let day = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  while (day.getTime() < end.getTime()) {
    const dow = day.getUTCDay();
    if (dow !== 0 && dow !== 6 && dow !== restDay) {
      const winStart = Math.max(start.getTime(), day.getTime() + startHour * 3600000);
      const winEnd   = Math.min(end.getTime(),   day.getTime() + WORK_END  * 3600000);
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

function getEffectiveDueDate(dueDate: Date, advisor: string, monthStr: string, config: NonWorkingConfig): Date {
  const restDay = REST_DAYS[advisor] ?? -1;
  let effective = new Date(dueDate);

  // Gladys special rule: only April 2026 — due dates 01-05 Apr → close by Apr 6 = a_tiempo
  if (advisor === 'Gladys Favela' && monthStr === '2026-04') {
    const m = effective.getUTCMonth(); // 3 = April
    const d = effective.getUTCDate();
    if (m === 3 && d >= 1 && d <= 5) {
      effective = new Date(Date.UTC(2026, 3, 6)); // April 6, 2026
      return skipToNextWorkingDay(effective, advisor, restDay, config);
    }
  }

  // If due date falls on rest day → extend to next day
  if (effective.getUTCDay() === restDay) {
    effective = addDays(effective, 1);
  }

  // Skip vacaciones y festivos configurados
  effective = skipToNextWorkingDay(effective, advisor, restDay, config);

  return effective;
}

export interface TardioDetailSeg {
  contacto: string;
  tarea: string;
  tarea_url: string;
  due_date: string;
  cerrado: string;
  turno: Turno;
  tiempo_min: number;
}

export interface SectionStats {
  total: number;
  a_tiempo: number;
  cierre_tardio: number;
  no_realizada: number;
  pct_a_tiempo: number;
  pct_tardio: number;
  pct_no_realizada: number;
  mediana_horas: number | null;
  tardio_detail: TardioDetailSeg[];
}

export interface HugoAdvisorStats {
  actividades: SectionStats;
  llamadas: SectionStats;
}

export type AdvisorStatsSeg = SectionStats | HugoAdvisorStats;

export interface SeguimientoData {
  month: string;
  label: string;
  advisors: Record<string, AdvisorStatsSeg>;
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

function emptySection(): { closingHours: number[]; counts: { a_tiempo: number; cierre_tardio: number; no_realizada: number }; tardio: TardioDetailSeg[] } {
  return { closingHours: [], counts: { a_tiempo: 0, cierre_tardio: 0, no_realizada: 0 }, tardio: [] };
}

function buildStats(d: ReturnType<typeof emptySection>): SectionStats {
  const total = d.counts.a_tiempo + d.counts.cierre_tardio + d.counts.no_realizada;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
  return {
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

export function processSeguimiento(
  opts: { filePath?: string; buffer?: ArrayBuffer | Buffer },
  monthStr: string,
  nonWorking: NonWorkingConfig = {}
): SeguimientoData {
  const rows: RawRow[] = parseExcel({ ...opts, headerRow: 7 });

  const byAdvisor: Record<string, {
    actividades: ReturnType<typeof emptySection>;
    llamadas: ReturnType<typeof emptySection>;
  }> = {};

  for (const row of rows) {
    const advisor = String(row['Task Owner'] ?? '').trim();
    if (!advisor) continue;

    const subject = String(row['Subject'] ?? '').trim();

    // Exclude "Contactar Inmediato" tasks
    if (/contactar\s+de?\s*inmediato/i.test(subject)) continue;

    if (!byAdvisor[advisor]) {
      byAdvisor[advisor] = { actividades: emptySection(), llamadas: emptySection() };
    }

    const isLlamada = /^llamada$/i.test(subject.trim());
    const section = isLlamada ? byAdvisor[advisor].llamadas : byAdvisor[advisor].actividades;

    const dueRaw = excelSerialToDate(row['Due Date']);
    const closed = excelSerialToDate(row['Closed Time']);
    const relatedTo   = String(row['Related To']   ?? '').trim();
    const contactName = String(row['Contact Name'] ?? '').trim();
    const contact = relatedTo || contactName;
    const recordIdRaw = String(row['Record Id'] ?? row['Record ID'] ?? '').trim();
    const recordId = recordIdRaw.replace(/^zcrm_/, '');
    const tarea_url = recordId
      ? `https://crm.zoho.com/crm/org890924063/tab/Tasks/${recordId}`
      : '';

    if (!dueRaw || !closed) {
      section.counts.no_realizada++;
      continue;
    }

    const dueDateOnly = new Date(Date.UTC(
      dueRaw.getUTCFullYear(), dueRaw.getUTCMonth(), dueRaw.getUTCDate()
    ));
    const effectiveDue = getEffectiveDueDate(dueDateOnly, advisor, monthStr, nonWorking);
    const closedDateOnly = new Date(Date.UTC(
      closed.getUTCFullYear(), closed.getUTCMonth(), closed.getUTCDate()
    ));

    // Horas laborales entre inicio del día de vencimiento y cierre
    const hours = workingHoursBetween(dueDateOnly, closed, advisor);
    if (hours > 0) section.closingHours.push(hours);

    if (closedDateOnly <= effectiveDue) {
      section.counts.a_tiempo++;
    } else {
      section.counts.cierre_tardio++;
      const turno = getTurno(closed, advisor);
      const tiempo_min = Math.round(workingHoursBetween(dueDateOnly, closed, advisor) * 60);
      section.tardio.push({
        contacto: contact,
        tarea: subject,
        tarea_url,
        due_date: formatDateOnly(dueDateOnly),
        cerrado: formatDate(closed),
        turno,
        tiempo_min,
      });
    }
  }

  const advisors: Record<string, AdvisorStatsSeg> = {};

  const orderedAdvisors = [
    ...ADVISOR_ORDER.filter((a) => byAdvisor[a]),
    ...Object.keys(byAdvisor).filter((a) => !ADVISOR_ORDER.includes(a)),
  ];

  for (const advisor of orderedAdvisors) {
    const d = byAdvisor[advisor];
    if (advisor === 'Hugo Cordova') {
      advisors[advisor] = {
        actividades: buildStats(d.actividades),
        llamadas: buildStats(d.llamadas),
      } as HugoAdvisorStats;
    } else {
      advisors[advisor] = buildStats(d.actividades);
    }
  }

  return { month: monthStr, label: monthLabel(monthStr), advisors };
}

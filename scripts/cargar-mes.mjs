/**
 * Uso: node scripts/cargar-mes.mjs <YYYY-MM> <ruta-primer-contacto.xlsx> <ruta-seguimiento.xlsx>
 * Ejemplo: node scripts/cargar-mes.mjs 2026-05 "C:/Users/gluna/Downloads/Primer Contacto.xlsx" "C:/Users/gluna/Downloads/Seguimiento.xlsx"
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Argumentos ───────────────────────────────────────────────────────────────
const [,, MONTH, PC_PATH, SEG_PATH] = process.argv;

if (!MONTH || !PC_PATH || !SEG_PATH) {
  console.error('Uso: node scripts/cargar-mes.mjs <YYYY-MM> <primer-contacto.xlsx> <seguimiento.xlsx>');
  process.exit(1);
}
if (!/^\d{4}-\d{2}$/.test(MONTH)) {
  console.error('Error: el mes debe tener formato YYYY-MM (ej: 2026-05)');
  process.exit(1);
}
if (!existsSync(PC_PATH)) { console.error(`No encontré: ${PC_PATH}`); process.exit(1); }
if (!existsSync(SEG_PATH)) { console.error(`No encontré: ${SEG_PATH}`); process.exit(1); }

// ─── Utils ────────────────────────────────────────────────────────────────────
function excelSerialToDate(serial) {
  if (serial == null || serial === '') return null;
  const n = parseFloat(String(serial));
  if (isNaN(n)) return null;
  return new Date((n - 25569) * 86400 * 1000);
}
function cleanParens(val) {
  if (val == null) return '';
  return String(val).replace(/\s*\(.*\)\s*$/, '').trim();
}
function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const headers = aoa[6].map(h => h != null ? String(h).trim() : '');
  let lastOwner = '', lastStatus = '';
  const rows = [];
  for (const rawRow of aoa.slice(7)) {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = rawRow[i] ?? null; });
    const owner = cleanParens(obj['Task Owner']);
    const status = cleanParens(obj['Status']);
    if (owner) lastOwner = owner;
    if (status) lastStatus = status;
    obj['Task Owner'] = lastOwner;
    obj['Status'] = lastStatus;
    if (!obj['Subject'] || String(obj['Subject']).trim() === '') continue;
    rows.push(obj);
  }
  return rows;
}
function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
function fmtDate(d) {
  if (!d) return '';
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hour12: false, timeZone:'UTC' });
}
function fmtDateOnly(d) {
  if (!d) return '';
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });
}
function addDays(d, n) { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; }
function monthLabel(m) {
  const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [year, month] = m.split('-');
  return `${names[parseInt(month,10)-1]} ${year}`;
}

const REST_DAYS = { 'Hugo Cordova':2, 'Gladys Favela':4, 'Erick Suarez':4, 'Indira Villegas':2 };
const ADVISOR_ORDER = ['Hugo Cordova','Gladys Favela','Erick Suarez','Indira Villegas'];

// ─── Primer Contacto ──────────────────────────────────────────────────────────
function getDueDate(created, advisor) {
  const restDay = REST_DAYS[advisor] ?? -1;
  let due = new Date(created);
  if (due.getUTCDay() === restDay) due = addDays(due, 1);
  if (created.getUTCHours() >= 16) due = addDays(due, 1);
  if (due.getUTCDay() === restDay) due = addDays(due, 1);
  if (addDays(due, 1).getUTCDay() === restDay) due = addDays(due, 2);
  return due;
}
function processPrimerContacto(filePath, monthStr) {
  const rows = parseExcel(filePath);
  const byAdvisor = {};
  for (const row of rows) {
    const advisor = String(row['Task Owner'] ?? '').trim();
    if (!advisor) continue;
    if (!byAdvisor[advisor]) byAdvisor[advisor] = { hours:[], counts:{a_tiempo:0,tardio:0,no_realizada:0}, tardio:[] };
    const created = excelSerialToDate(row['Created Time']);
    const closed = excelSerialToDate(row['Closed Time']);
    const subject = String(row['Subject'] ?? '').trim();
    const contact = String(row['Related To'] ?? '').trim() || String(row['Contact Name'] ?? '').trim();
    const d = byAdvisor[advisor];
    if (!closed || !created) { d.counts.no_realizada++; continue; }
    const dueDate = getDueDate(created, advisor);
    const closedOnly = new Date(Date.UTC(closed.getUTCFullYear(), closed.getUTCMonth(), closed.getUTCDate()));
    const dueOnly = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
    const hours = (closed - created) / 3_600_000;
    if (hours >= 0) d.hours.push(hours);
    if (closedOnly <= dueOnly) d.counts.a_tiempo++;
    else { d.counts.tardio++; d.tardio.push({ contacto:contact, tarea:subject, creado:fmtDate(created), cerrado:fmtDate(closed) }); }
  }
  const pct = (n, t) => t > 0 ? Math.round(n/t*100) : 0;
  const advisors = {};
  const ordered = [...ADVISOR_ORDER.filter(a => byAdvisor[a]), ...Object.keys(byAdvisor).filter(a => !ADVISOR_ORDER.includes(a))];
  for (const a of ordered) {
    const d = byAdvisor[a];
    const total = d.counts.a_tiempo + d.counts.tardio + d.counts.no_realizada;
    advisors[a] = { total, a_tiempo:d.counts.a_tiempo, cierre_tardio:d.counts.tardio, no_realizada:d.counts.no_realizada,
      pct_a_tiempo:pct(d.counts.a_tiempo,total), pct_tardio:pct(d.counts.tardio,total), pct_no_realizada:pct(d.counts.no_realizada,total),
      mediana_horas: median(d.hours) !== null ? +median(d.hours).toFixed(2) : null,
      tardio_detail: d.tardio };
  }
  return { month: monthStr, label: monthLabel(monthStr), advisors };
}

// ─── Seguimiento ──────────────────────────────────────────────────────────────
function getEffectiveDueDate(dueDate, advisor, monthStr) {
  const restDay = REST_DAYS[advisor] ?? -1;
  if (advisor === 'Gladys Favela' && monthStr === '2026-04') {
    const m = dueDate.getUTCMonth(), d = dueDate.getUTCDate();
    if (m === 3 && d >= 1 && d <= 5) return new Date(Date.UTC(2026, 3, 6));
  }
  let eff = new Date(dueDate);
  if (eff.getUTCDay() === restDay) eff = addDays(eff, 1);
  return eff;
}
function emptySection() { return { hours:[], counts:{a_tiempo:0,tardio:0,no_realizada:0}, tardio:[] }; }
function buildStats(d) {
  const total = d.counts.a_tiempo + d.counts.tardio + d.counts.no_realizada;
  const pct = (n) => total > 0 ? Math.round(n/total*100) : 0;
  return { total, a_tiempo:d.counts.a_tiempo, cierre_tardio:d.counts.tardio, no_realizada:d.counts.no_realizada,
    pct_a_tiempo:pct(d.counts.a_tiempo), pct_tardio:pct(d.counts.tardio), pct_no_realizada:pct(d.counts.no_realizada),
    mediana_horas: median(d.hours) !== null ? +median(d.hours).toFixed(2) : null,
    tardio_detail: d.tardio };
}
function processSeguimiento(filePath, monthStr) {
  const rows = parseExcel(filePath);
  const byAdvisor = {};
  for (const row of rows) {
    const advisor = String(row['Task Owner'] ?? '').trim();
    if (!advisor) continue;
    const subject = String(row['Subject'] ?? '').trim();
    if (/contactar\s+de?\s*inmediato/i.test(subject)) continue;
    if (!byAdvisor[advisor]) byAdvisor[advisor] = { actividades:emptySection(), llamadas:emptySection() };
    const isLlamada = /^llamada$/i.test(subject.trim());
    const section = isLlamada ? byAdvisor[advisor].llamadas : byAdvisor[advisor].actividades;
    const dueRaw = excelSerialToDate(row['Due Date']);
    const closed = excelSerialToDate(row['Closed Time']);
    const contact = String(row['Related To'] ?? '').trim() || String(row['Contact Name'] ?? '').trim();
    if (!dueRaw || !closed) { section.counts.no_realizada++; continue; }
    const dueOnly = new Date(Date.UTC(dueRaw.getUTCFullYear(), dueRaw.getUTCMonth(), dueRaw.getUTCDate()));
    const effDue = getEffectiveDueDate(dueOnly, advisor, monthStr);
    const closedOnly = new Date(Date.UTC(closed.getUTCFullYear(), closed.getUTCMonth(), closed.getUTCDate()));
    const hours = (closed - dueOnly) / 3_600_000;
    if (hours >= 0) section.hours.push(hours);
    if (closedOnly <= effDue) section.counts.a_tiempo++;
    else { section.counts.tardio++; section.tardio.push({ contacto:contact, tarea:subject, due_date:fmtDateOnly(dueOnly), cerrado:fmtDate(closed) }); }
  }
  const advisors = {};
  const ordered = [...ADVISOR_ORDER.filter(a => byAdvisor[a]), ...Object.keys(byAdvisor).filter(a => !ADVISOR_ORDER.includes(a))];
  for (const a of ordered) {
    const d = byAdvisor[a];
    if (a === 'Hugo Cordova') advisors[a] = { actividades:buildStats(d.actividades), llamadas:buildStats(d.llamadas) };
    else advisors[a] = buildStats(d.actividades);
  }
  return { month: monthStr, label: monthLabel(monthStr), advisors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log(`\nProcesando mes: ${MONTH} (${monthLabel(MONTH)})`);
console.log(`  Primer Contacto: ${PC_PATH}`);
console.log(`  Seguimiento:     ${SEG_PATH}\n`);

const pcData = processPrimerContacto(PC_PATH, MONTH);
const segData = processSeguimiento(SEG_PATH, MONTH);

mkdirSync(join(ROOT, 'public/data/primer-contacto'), { recursive: true });
mkdirSync(join(ROOT, 'public/data/seguimiento'), { recursive: true });

writeFileSync(join(ROOT, `public/data/primer-contacto/${MONTH}.json`), JSON.stringify(pcData, null, 2));
writeFileSync(join(ROOT, `public/data/seguimiento/${MONTH}.json`), JSON.stringify(segData, null, 2));

// Actualizar months.json
const monthsPath = join(ROOT, 'public/data/months.json');
let months = [];
try { months = JSON.parse(readFileSync(monthsPath, 'utf-8')); } catch {}
if (!months.includes(MONTH)) {
  months = [...months, MONTH].sort();
  writeFileSync(monthsPath, JSON.stringify(months, null, 2));
}

console.log('✅ Archivos generados:');
console.log(`  public/data/primer-contacto/${MONTH}.json`);
console.log(`  public/data/seguimiento/${MONTH}.json`);
console.log(`  public/data/months.json → [${months.join(', ')}]\n`);

// Resumen
for (const [a, s] of Object.entries(pcData.advisors)) {
  console.log(`PC · ${a}: total=${s.total} a_tiempo=${s.pct_a_tiempo}% tardio=${s.pct_tardio}% no_realizada=${s.pct_no_realizada}%`);
}
console.log('');
for (const [a, s] of Object.entries(segData.advisors)) {
  if (a === 'Hugo Cordova') {
    console.log(`SEG · ${a} actividades: total=${s.actividades.total} a_tiempo=${s.actividades.pct_a_tiempo}%`);
    console.log(`SEG · ${a} llamadas:    total=${s.llamadas.total} a_tiempo=${s.llamadas.pct_a_tiempo}%`);
  } else {
    console.log(`SEG · ${a}: total=${s.total} a_tiempo=${s.pct_a_tiempo}% tardio=${s.pct_tardio}%`);
  }
}
console.log('\nRecarga el dashboard para ver el nuevo mes.');

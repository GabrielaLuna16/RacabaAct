export interface AdvisorNonWorking {
  holidays: string[];                          // 'YYYY-MM-DD'
  vacations: { start: string; end: string }[]; // 'YYYY-MM-DD'
}

export type NonWorkingConfig = Record<string, AdvisorNonWorking>;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isNonWorkingDay(
  date: Date,
  advisor: string,
  restDay: number,
  config: NonWorkingConfig
): boolean {
  if (date.getUTCDay() === restDay) return true;
  const ac = config[advisor];
  if (!ac) return false;
  const ds = toDateStr(date);
  if (ac.holidays.includes(ds)) return true;
  if (ac.vacations.some((v) => ds >= v.start && ds <= v.end)) return true;
  return false;
}

export function skipToNextWorkingDay(
  date: Date,
  advisor: string,
  restDay: number,
  config: NonWorkingConfig
): Date {
  let result = new Date(date);
  for (let i = 0; i < 90; i++) {
    if (!isNonWorkingDay(result, advisor, restDay, config)) break;
    result = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate() + 1));
  }
  return result;
}

import {
  format,
  parseISO,
  startOfWeek,
  subDays,
  differenceInCalendarDays,
  isSameDay,
} from "date-fns";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (s: string) => parseISO(s);

export const prettyDate = (s: string) => format(parseISO(s), "EEEE, d MMMM");
export const shortDate = (s: string) => format(parseISO(s), "d MMM");
export const weekday = (s: string) => format(parseISO(s), "EEE");

/** Returns ISO dates for the last n days, oldest → newest, ending today. */
export function lastNDays(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(iso(subDays(end, i)));
  return out;
}

export const weekStartISO = (d: Date = new Date()) =>
  iso(startOfWeek(d, { weekStartsOn: 1 }));

export const daysBetween = (a: string, b: string) =>
  differenceInCalendarDays(parseISO(a), parseISO(b));

export const isToday = (s: string) => isSameDay(parseISO(s), new Date());

/** Index into a 7-day cyclic split based on days since profile creation. */
export function cycleIndex(createdISO: string, dateISO: string, len: number): number {
  const diff = Math.abs(differenceInCalendarDays(parseISO(dateISO), parseISO(createdISO)));
  return ((diff % len) + len) % len;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

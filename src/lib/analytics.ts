import type { Profile, DayMetrics, FoodLog, Session, DayType } from "@/types";
import { macroTotals } from "./score";
import { sessionVolume } from "./progression";

export interface Adherence {
  protein: number;   // 0..1
  calories: number;
  water: number;
  steps: number;
  sleep: number;
  workout: number;
}

export interface RangeData {
  dates: string[];
  metricsByDate: Map<string, DayMetrics>;
  logsByDate: Map<string, FoodLog[]>;
  sessions: Session[];
  splitForDate: (d: string) => DayType;
}

const r1 = (n: number) => Math.max(0, Math.min(1, n));

/** Adherence ratios across a date range. Rest days excluded from workout adherence. */
export function adherence(p: Profile, data: RangeData): Adherence {
  const t = p.targets;
  let proteinSum = 0, calHit = 0, calDays = 0;
  let waterSum = 0, stepSum = 0, sleepHit = 0, sleepDays = 0;

  for (const d of data.dates) {
    const logs = data.logsByDate.get(d) ?? [];
    const m = data.metricsByDate.get(d);
    if (logs.length) {
      const tot = macroTotals(logs);
      proteinSum += r1(tot.protein / t.protein);
      const cr = tot.kcal / t.calories;
      if (cr >= 0.92 && cr <= 1.08) calHit++;
      calDays++;
    }
    if (m?.water) waterSum += r1(m.water / t.water);
    if (m?.steps) stepSum += r1(m.steps / t.steps);
    if (m?.sleepHours != null) {
      if (m.sleepHours >= t.sleepMin) sleepHit++;
      sleepDays++;
    }
  }

  const n = data.dates.length || 1;
  const trainingDays = data.dates.filter((d) => data.splitForDate(d) !== "rest").length || 1;
  const completed = data.sessions.filter((s) => s.completed).length;

  return {
    protein: proteinSum / n,
    calories: calDays ? calHit / calDays : 0,
    water: waterSum / n,
    steps: stepSum / n,
    sleep: sleepDays ? sleepHit / sleepDays : 0,
    workout: r1(completed / trainingDays),
  };
}

/** Linear-regression slope of weight over time (kg per week). */
export function weightTrend(data: RangeData): { slopePerWeek: number; points: { date: string; weight: number }[] } {
  const points: { date: string; weight: number }[] = [];
  data.dates.forEach((d) => {
    const w = data.metricsByDate.get(d)?.weight;
    if (w) points.push({ date: d, weight: w });
  });
  if (points.length < 2) return { slopePerWeek: 0, points };
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.weight);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slopePerDay = den ? num / den : 0;
  return { slopePerWeek: slopePerDay * 7, points };
}

export function volumeBySession(sessions: Session[]) {
  return sessions
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => ({ date: s.date, volume: Math.round(sessionVolume(s)), title: s.title }));
}

export function adherenceLabel(v: number): string {
  if (v >= 0.9) return "Excellent";
  if (v >= 0.75) return "Good";
  if (v >= 0.5) return "Inconsistent";
  return "Needs work";
}

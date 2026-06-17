import type { Profile, DayMetrics, FoodLog, Session, Checkmarks } from "@/types";
import { dayTypeFor } from "./split";
import { buildChecklist, dailyScore } from "./score";
import { lastNDays } from "./date";

interface Raw {
  metrics: DayMetrics[];
  foodLogs: FoodLog[];
  sessions: Session[];
  checks: Checkmarks[];
}

const STREAK_THRESHOLD = 55;

/** Consecutive days (ending today or yesterday) with a score >= threshold. */
export function computeStreak(profile: Profile, raw: Raw): number {
  const metricsBy = new Map(raw.metrics.map((m) => [m.date, m]));
  const checksBy = new Map(raw.checks.map((c) => [c.date, c]));
  const sessionsBy = new Map(raw.sessions.map((s) => [s.date, s]));
  const logsBy = new Map<string, FoodLog[]>();
  for (const l of raw.foodLogs) {
    const arr = logsBy.get(l.date) ?? [];
    arr.push(l);
    logsBy.set(l.date, arr);
  }

  const dates = lastNDays(60).reverse(); // newest first
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const score = dailyScore(
      buildChecklist(profile, {
        date: d,
        dayType: dayTypeFor(profile, d),
        metrics: metricsBy.get(d),
        foodLogs: logsBy.get(d) ?? [],
        session: sessionsBy.get(d),
        checks: checksBy.get(d),
      })
    );
    if (score >= STREAK_THRESHOLD) streak++;
    else if (i === 0) continue; // today not done yet — don't break the streak
    else break;
  }
  return streak;
}

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useStore } from "@/store/useStore";
import { lastNDays } from "@/lib/date";
import { dayTypeFor } from "@/lib/split";
import type { RangeData } from "@/lib/analytics";

export function useRangeData(days: number): RangeData | null {
  const profile = useStore((s) => s.profile);
  const dates = lastNDays(days);
  const first = dates[0];

  const raw = useLiveQuery(async () => {
    const [metrics, foodLogs, sessions] = await Promise.all([
      db.metrics.where("date").aboveOrEqual(first).toArray(),
      db.foodLogs.where("date").aboveOrEqual(first).toArray(),
      db.sessions.where("date").aboveOrEqual(first).toArray(),
    ]);
    return { metrics, foodLogs, sessions };
  }, [first, days]);

  if (!profile || !raw) return null;

  const metricsByDate = new Map(raw.metrics.map((m) => [m.date, m]));
  const logsByDate = new Map<string, typeof raw.foodLogs>();
  for (const l of raw.foodLogs) {
    const arr = logsByDate.get(l.date) ?? [];
    arr.push(l);
    logsByDate.set(l.date, arr);
  }

  return {
    dates,
    metricsByDate,
    logsByDate,
    sessions: raw.sessions.filter((s) => dates.includes(s.date)),
    splitForDate: (d: string) => dayTypeFor(profile, d),
  };
}

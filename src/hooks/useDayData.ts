import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { useStore } from "@/store/useStore";
import { dayTypeFor } from "@/lib/split";
import { buildChecklist, dailyScore, type DayBundle } from "@/lib/score";
import type { ChecklistItem } from "@/types";

export function useDayBundle(date: string): DayBundle | null {
  const profile = useStore((s) => s.profile);

  const data = useLiveQuery(async () => {
    const [metrics, foodLogs, sessions, checks] = await Promise.all([
      db.metrics.get(date),
      db.foodLogs.where("date").equals(date).toArray(),
      db.sessions.where("date").equals(date).toArray(),
      db.checkmarks.get(date),
    ]);
    return { metrics, foodLogs, session: sessions[0], checks };
  }, [date]);

  if (!profile || !data) return null;
  return {
    date,
    dayType: dayTypeFor(profile, date),
    metrics: data.metrics,
    foodLogs: data.foodLogs,
    session: data.session,
    checks: data.checks,
  };
}

export function useChecklist(date: string): { items: ChecklistItem[]; score: number } {
  const profile = useStore((s) => s.profile);
  const bundle = useDayBundle(date);
  if (!profile || !bundle) return { items: [], score: 0 };
  const items = buildChecklist(profile, bundle);
  return { items, score: dailyScore(items) };
}

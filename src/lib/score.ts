import type {
  Profile, DayMetrics, FoodLog, Session, Checkmarks, ChecklistItem, DayType,
} from "@/types";

export interface DayBundle {
  date: string;
  dayType: DayType;
  metrics?: DayMetrics;
  foodLogs: FoodLog[];
  session?: Session;
  checks?: Checkmarks;
}

export function macroTotals(logs: FoodLog[]) {
  return logs.reduce(
    (a, l) => ({
      kcal: a.kcal + l.kcal * l.qty,
      protein: a.protein + l.protein * l.qty,
      carbs: a.carbs + l.carbs * l.qty,
      fat: a.fat + l.fat * l.qty,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Build today's checklist. Rest days don't penalise for "no workout". */
export function buildChecklist(p: Profile, b: DayBundle): ChecklistItem[] {
  const t = p.targets;
  const totals = macroTotals(b.foodLogs);
  const isRest = b.dayType === "rest";
  const items: ChecklistItem[] = [];

  if (!isRest) {
    const done = !!b.session?.completed;
    items.push({
      key: "workout", label: "Workout Completed", auto: true, weight: 25,
      done, progress: done ? 1 : 0,
      detail: done ? "Logged & done" : "Not logged yet",
    });
  }

  const pPct = clamp01(totals.protein / t.protein);
  items.push({
    key: "protein", label: "Protein Target Hit", auto: true, weight: 20,
    done: totals.protein >= t.protein * 0.95, progress: pPct,
    detail: `${Math.round(totals.protein)} / ${t.protein} g`,
  });

  // Calories: reward landing within ±8% of target.
  const calRatio = totals.kcal / t.calories;
  const calOk = b.foodLogs.length > 0 && calRatio >= 0.92 && calRatio <= 1.08;
  items.push({
    key: "calories", label: "Calorie Target Hit", auto: true, weight: 15,
    done: calOk, progress: clamp01(totals.kcal / t.calories),
    detail: `${Math.round(totals.kcal)} / ${t.calories} kcal`,
  });

  const water = b.metrics?.water ?? 0;
  items.push({
    key: "water", label: "Water Target Hit", auto: true, weight: 10,
    done: water >= t.water, progress: clamp01(water / t.water),
    detail: `${water.toFixed(1)} / ${t.water} L`,
  });

  const steps = b.metrics?.steps ?? 0;
  items.push({
    key: "steps", label: "Step Goal Hit", auto: true, weight: 10,
    done: steps >= t.steps, progress: clamp01(steps / t.steps),
    detail: `${steps.toLocaleString()} / ${t.steps.toLocaleString()}`,
  });

  const sleep = b.metrics?.sleepHours ?? 0;
  items.push({
    key: "sleep", label: "Sleep Goal Hit", auto: true, weight: 10,
    done: sleep >= t.sleepMin, progress: clamp01(sleep / t.sleepMin),
    detail: sleep ? `${sleep.toFixed(1)} h` : "Not logged",
  });

  items.push({
    key: "recovery", label: "Recovery / Mobility", auto: false, weight: 5,
    done: !!b.checks?.recovery, progress: b.checks?.recovery ? 1 : 0,
    detail: "Stretch, walk, mobility",
  });

  items.push({
    key: "photo", label: "Progress Photo", auto: false, weight: 5,
    done: !!b.checks?.photo, progress: b.checks?.photo ? 1 : 0,
    detail: "Optional daily/weekly",
  });

  return items;
}

/** Daily score 0–100 from weighted checklist completion (partial credit). */
export function dailyScore(items: ChecklistItem[]): number {
  const totalWeight = items.reduce((a, i) => a + i.weight, 0) || 1;
  const earned = items.reduce(
    (a, i) => a + i.weight * (i.done ? 1 : clamp01(i.progress ?? 0)),
    0
  );
  return Math.round((earned / totalWeight) * 100);
}

export function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Elite", color: "text-good" };
  if (score >= 75) return { label: "Strong", color: "text-good" };
  if (score >= 55) return { label: "Solid", color: "text-warn" };
  if (score >= 30) return { label: "Building", color: "text-warn" };
  return { label: "Reset", color: "text-bad" };
}

/** Sleep score (0–100) from duration vs target window and quality. */
export function sleepScore(p: Profile, m?: DayMetrics): number {
  if (!m?.sleepHours) return 0;
  const { sleepMin, sleepMax } = p.targets;
  const h = m.sleepHours;
  let durScore: number;
  if (h >= sleepMin && h <= sleepMax) durScore = 100;
  else if (h < sleepMin) durScore = clamp01(h / sleepMin) * 100;
  else durScore = Math.max(60, 100 - (h - sleepMax) * 12);
  const q = (m.sleepQuality ?? 3) / 5; // 0.2..1
  return Math.round(durScore * (0.7 + 0.3 * q));
}

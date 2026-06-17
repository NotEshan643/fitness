import type { Profile, DayType } from "@/types";
import { cycleIndex } from "./date";

export const DEFAULT_SPLIT: DayType[] = ["push", "pull", "rest", "push", "pull", "legs", "rest"];

export function dayTypeFor(p: Profile, dateISO: string): DayType {
  const split = p.splitDays?.length ? p.splitDays : DEFAULT_SPLIT;
  const idx = cycleIndex(p.createdAt.slice(0, 10), dateISO, split.length);
  return split[idx];
}

export const DAY_LABEL: Record<DayType, string> = {
  push: "Push Day",
  pull: "Pull Day",
  legs: "Leg Day",
  rest: "Rest Day",
  upper: "Upper Body",
  lower: "Lower Body",
  full: "Full Body",
  cardio: "Cardio",
};

export const DAY_ACCENT: Record<DayType, string> = {
  push: "from-ember-500 to-ember-600",
  pull: "from-info to-blue-600",
  legs: "from-violet-500 to-purple-600",
  rest: "from-steel-500 to-steel-400",
  upper: "from-ember-500 to-rose-500",
  lower: "from-emerald-500 to-teal-600",
  full: "from-amber-500 to-orange-600",
  cardio: "from-good to-emerald-600",
};

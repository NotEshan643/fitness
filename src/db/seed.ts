import { db } from "./db";
import { EXERCISES } from "@/data/exercises";
import { FOODS } from "@/data/foods";
import type { DayType, Template } from "@/types";

// Default template blueprints by name (resolved to ids after seeding exercises).
const TEMPLATE_BLUEPRINTS: { name: string; dayType: DayType; items: [string, number, string][] }[] = [
  {
    name: "Push Day",
    dayType: "push",
    items: [
      ["Incline Barbell Press", 4, "6-10"],
      ["Flat Dumbbell Press", 3, "8-12"],
      ["Seated Dumbbell Press", 3, "8-12"],
      ["Cable Fly", 3, "12-15"],
      ["Lateral Raise", 4, "12-20"],
      ["Triceps Pushdown", 3, "10-15"],
      ["Overhead Cable Extension", 3, "10-15"],
    ],
  },
  {
    name: "Pull Day",
    dayType: "pull",
    items: [
      ["Lat Pulldown", 4, "8-12"],
      ["Barbell Row", 4, "6-10"],
      ["Seated Cable Row", 3, "10-12"],
      ["Face Pull", 3, "15-20"],
      ["Incline Dumbbell Curl", 3, "10-12"],
      ["Hammer Curl", 3, "10-12"],
      ["Cable Curl", 2, "12-15"],
    ],
  },
  {
    name: "Leg Day",
    dayType: "legs",
    items: [
      ["Back Squat", 4, "6-10"],
      ["Romanian Deadlift", 3, "8-12"],
      ["Leg Press", 3, "10-15"],
      ["Lying Leg Curl", 3, "10-15"],
      ["Leg Extension", 3, "12-20"],
      ["Standing Calf Raise", 4, "12-20"],
      ["Hanging Leg Raise", 3, "10-15"],
    ],
  },
];

export async function ensureSeeded(): Promise<void> {
  const exCount = await db.exercises.count();
  if (exCount === 0) {
    await db.exercises.bulkAdd(EXERCISES);
  }
  const foodCount = await db.foods.count();
  if (foodCount === 0) {
    await db.foods.bulkAdd(FOODS);
  }
  const tplCount = await db.templates.count();
  if (tplCount === 0) {
    const all = await db.exercises.toArray();
    const byName = new Map(all.map((e) => [e.name, e.id!]));
    const templates: Template[] = TEMPLATE_BLUEPRINTS.map((bp, i) => ({
      name: bp.name,
      dayType: bp.dayType,
      isDefault: true,
      order: i,
      entries: bp.items
        .filter(([n]) => byName.has(n))
        .map(([n, sets, reps]) => ({
          exerciseId: byName.get(n)!,
          targetSets: sets,
          targetReps: reps,
        })),
    }));
    await db.templates.bulkAdd(templates);
  }
}

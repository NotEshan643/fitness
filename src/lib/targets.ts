import type { Profile, Targets, ActivityLevel } from "@/types";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.3,
  light: 1.45,
  moderate: 1.55,
  active: 1.7,
  veryactive: 1.85,
};

export interface TargetReason {
  key: keyof Targets | "split";
  label: string;
  value: string;
  reason: string;
}

/** Mifflin-St Jeor BMR. */
export function bmr(p: Pick<Profile, "sex" | "weightKg" | "heightCm" | "age">): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(p.sex === "male" ? base + 5 : base - 161);
}

/**
 * Compute all targets from onboarding answers.
 * Tuned for a lean recomposition cut: moderate deficit, high protein.
 */
export function computeTargets(
  p: Omit<Profile, "targets" | "id" | "onboarded" | "createdAt">
): Targets {
  const b = bmr(p);
  const tdee = Math.round(b * ACTIVITY_FACTOR[p.activity]);

  const cutting = p.goals.includes("fatloss") || p.goals.includes("recomp");
  const bulking = p.goals.includes("muscle") && !cutting;

  // Weekly loss capped at 0.5–0.75% bodyweight to preserve muscle.
  const weeklyLossKg = cutting ? +(p.weightKg * 0.0075).toFixed(2) : 0;
  // ~7700 kcal per kg fat → daily deficit.
  let deficit = cutting ? Math.round((weeklyLossKg * 7700) / 7) : 0;
  deficit = Math.min(deficit, Math.round(tdee * 0.22)); // never exceed ~22% deficit

  let calories = tdee - deficit;
  if (bulking) calories = tdee + 250;
  calories = Math.round(calories / 10) * 10;

  // Protein: protect muscle. Higher of user's 140g and 2.0 g/kg of GOAL weight.
  const goalWeight = cutting ? Math.max(p.weightKg - 5, p.weightKg * 0.92) : p.weightKg;
  const protein = Math.max(140, Math.round(2.0 * goalWeight));

  // Fat floor ~0.8 g/kg bodyweight.
  const fat = Math.round(0.8 * p.weightKg);

  // Carbs fill the remainder.
  const carbKcal = calories - protein * 4 - fat * 9;
  const carbs = Math.max(80, Math.round(carbKcal / 4));

  return {
    bmr: b,
    tdee,
    calories,
    protein,
    carbs,
    fat,
    water: p.waterHabit && p.waterHabit >= 2 ? p.waterHabit : 5,
    steps: 10000,
    sleepMin: 7.5,
    sleepMax: 9,
    weightGoal: cutting ? Math.round(goalWeight) : p.weightKg,
    lossRatePerWeek: -weeklyLossKg,
  };
}

/** Human-readable justification for each computed target. */
export function explainTargets(p: Profile): TargetReason[] {
  const t = p.targets;
  return [
    {
      key: "calories",
      label: "Daily Calories",
      value: `${t.calories} kcal`,
      reason: `Your maintenance (TDEE) is ~${t.tdee} kcal. We set a moderate deficit so you lose about ${Math.abs(t.lossRatePerWeek).toFixed(2)} kg/week — fast enough to see results, slow enough to keep your muscle and avoid looking skinny.`,
    },
    {
      key: "protein",
      label: "Protein",
      value: `${t.protein} g`,
      reason: `At ~2 g per kg of goal bodyweight, this protects lean mass in a deficit and keeps you full. It meets and slightly exceeds your 140 g preference.`,
    },
    {
      key: "carbs",
      label: "Carbs",
      value: `${t.carbs} g`,
      reason: `Carbs fill the calories left after protein and fat. They fuel your 5 weekly sessions and keep gym performance high while cutting.`,
    },
    {
      key: "fat",
      label: "Fat",
      value: `${t.fat} g`,
      reason: `Kept at ~0.8 g/kg — the floor needed for healthy hormones and joint health while dieting.`,
    },
    {
      key: "water",
      label: "Water",
      value: `${t.water} L`,
      reason: `Based on your preference and training load. Hydration supports performance, appetite control and recovery.`,
    },
    {
      key: "steps",
      label: "Daily Steps",
      value: `${t.steps.toLocaleString()}`,
      reason: `Steps are your main non-gym fat-loss lever. 10k/day adds meaningful calorie burn without eating into recovery like extra cardio would.`,
    },
    {
      key: "sleepMin",
      label: "Sleep",
      value: `${t.sleepMin}–${t.sleepMax} h`,
      reason: `Sleep drives recovery, muscle retention and hunger hormones. Under-sleeping in a cut sabotages fat loss and strength.`,
    },
    {
      key: "weightGoal",
      label: "Goal Weight",
      value: `${t.weightGoal} kg`,
      reason: `A realistic lean target from your current ${p.weightKg} kg. Combined with high protein and training, the scale drops while muscle stays — the "lean and athletic" look you want.`,
    },
    {
      key: "split",
      label: "Training Split",
      value: p.splitName,
      reason: `Your Push / Pull / Rest / Push / Pull / Legs / Rest cycle hits each muscle ~twice a week with built-in recovery — ideal frequency for an intermediate lifter retaining muscle while cutting.`,
    },
  ];
}

// ---- Core domain types for FORGE ----

export type DayType = "push" | "pull" | "legs" | "rest" | "upper" | "lower" | "full" | "cardio";
export type Goal = "fatloss" | "muscle" | "recomp" | "strength" | "performance";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "veryactive";
export type Diet = "veg" | "nonveg" | "eggetarian" | "vegan";
export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";
export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "quads" | "hamstrings" | "glutes" | "calves" | "core" | "cardio" | "fullbody";

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;        // litres
  steps: number;
  sleepMin: number;     // hours
  sleepMax: number;
  weightGoal: number;   // kg
  lossRatePerWeek: number; // kg/week (negative = loss)
}

export interface Profile {
  id: 1;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFat: number;
  experience: "beginner" | "intermediate" | "advanced";
  goals: Goal[];
  activity: ActivityLevel;
  // lifestyle
  schedule: string;
  sleepSchedule: string;
  workoutTime: string;
  daysPerWeek: number;
  splitName: string;
  splitDays: DayType[];      // 7-day cycle
  // nutrition
  diet: Diet;
  likes: string;
  dislikes: string;
  allergies: string;
  budget: "low" | "moderate" | "high";
  proteinAfford: string;
  // training
  favExercises: string;
  dislikedExercises: string;
  weakParts: string[];
  strongParts: string[];
  injuries: string;
  mobility: string;
  // cardio
  cardioPrefs: string[];
  // habits
  waterHabit: number;
  sleepQuality: number;
  stress: number;
  targets: Targets;
  onboarded: boolean;
  createdAt: string;
}

export interface Exercise {
  id?: number;
  name: string;
  muscleGroup: MuscleGroup;
  category: "compound" | "isolation";
  equipment: string;
  isCustom?: boolean;
}

export interface TemplateEntry {
  exerciseId: number;
  targetSets: number;
  targetReps: string; // e.g. "8-12"
}

export interface Template {
  id?: number;
  name: string;
  dayType: DayType;
  entries: TemplateEntry[];
  isDefault?: boolean;
  order: number;
}

export interface SetLog {
  reps: number;
  weight: number; // kg
  rpe?: number;
  rest?: number;  // seconds
  done?: boolean;
}

export interface SessionEntry {
  exerciseId: number;
  exerciseName: string;
  sets: SetLog[];
  notes?: string;
}

export interface Session {
  id?: number;
  date: string;          // ISO date
  dayType: DayType;
  templateId?: number;
  title: string;
  entries: SessionEntry[];
  durationMin?: number;
  notes?: string;
  completed: boolean;
}

export interface Food {
  id?: number;
  name: string;
  per: string;        // serving description e.g. "100g", "1 roti"
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  tags?: string[];
  isCustom?: boolean;
}

export interface FoodLog {
  id?: number;
  date: string;
  meal: MealCategory;
  name: string;
  qty: number;        // multiplier of serving
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DayMetrics {
  date: string;        // PK, ISO date
  water?: number;      // litres
  steps?: number;
  sleepHours?: number;
  bedTime?: string;
  wakeTime?: string;
  sleepQuality?: number; // 1-5
  weight?: number;
  waist?: number;
  bodyFat?: number;
  mood?: number;
  recovery?: boolean;
}

export interface ProgressPhoto {
  id?: number;
  date: string;
  dataUrl: string;
  weight?: number;
  note?: string;
}

export interface Achievement {
  id?: number;
  key: string;
  unlockedAt: string;
}

export interface Checkmarks {
  date: string; // PK
  recovery?: boolean;
  photo?: boolean;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  progress?: number; // 0..1 for partial
  detail?: string;
  auto: boolean;     // computed vs manual
}

export interface CoachInsight {
  id: string;
  severity: "good" | "info" | "warn" | "bad";
  title: string;
  message: string;
  reason: string;
  category: "nutrition" | "training" | "recovery" | "bodycomp" | "consistency";
}

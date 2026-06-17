import type { Exercise } from "@/types";

// Curated exercise library covering the user's Push/Pull/Legs split.
export const EXERCISES: Exercise[] = [
  // ---- Chest (Push) ----
  { name: "Barbell Bench Press", muscleGroup: "chest", category: "compound", equipment: "barbell" },
  { name: "Incline Barbell Press", muscleGroup: "chest", category: "compound", equipment: "barbell" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", category: "compound", equipment: "dumbbell" },
  { name: "Flat Dumbbell Press", muscleGroup: "chest", category: "compound", equipment: "dumbbell" },
  { name: "Machine Chest Press", muscleGroup: "chest", category: "compound", equipment: "machine" },
  { name: "Cable Fly", muscleGroup: "chest", category: "isolation", equipment: "cable" },
  { name: "Pec Deck", muscleGroup: "chest", category: "isolation", equipment: "machine" },
  { name: "Push-Up", muscleGroup: "chest", category: "compound", equipment: "bodyweight" },
  { name: "Dips", muscleGroup: "chest", category: "compound", equipment: "bodyweight" },

  // ---- Shoulders (Push) ----
  { name: "Overhead Press", muscleGroup: "shoulders", category: "compound", equipment: "barbell" },
  { name: "Seated Dumbbell Press", muscleGroup: "shoulders", category: "compound", equipment: "dumbbell" },
  { name: "Lateral Raise", muscleGroup: "shoulders", category: "isolation", equipment: "dumbbell" },
  { name: "Cable Lateral Raise", muscleGroup: "shoulders", category: "isolation", equipment: "cable" },
  { name: "Rear Delt Fly", muscleGroup: "shoulders", category: "isolation", equipment: "dumbbell" },
  { name: "Face Pull", muscleGroup: "shoulders", category: "isolation", equipment: "cable" },

  // ---- Triceps (Push) ----
  { name: "Triceps Pushdown", muscleGroup: "triceps", category: "isolation", equipment: "cable" },
  { name: "Overhead Cable Extension", muscleGroup: "triceps", category: "isolation", equipment: "cable" },
  { name: "Skull Crusher", muscleGroup: "triceps", category: "isolation", equipment: "barbell" },
  { name: "Close-Grip Bench Press", muscleGroup: "triceps", category: "compound", equipment: "barbell" },

  // ---- Back (Pull) ----
  { name: "Deadlift", muscleGroup: "back", category: "compound", equipment: "barbell" },
  { name: "Pull-Up", muscleGroup: "back", category: "compound", equipment: "bodyweight" },
  { name: "Lat Pulldown", muscleGroup: "back", category: "compound", equipment: "cable" },
  { name: "Barbell Row", muscleGroup: "back", category: "compound", equipment: "barbell" },
  { name: "Seated Cable Row", muscleGroup: "back", category: "compound", equipment: "cable" },
  { name: "Single-Arm Dumbbell Row", muscleGroup: "back", category: "compound", equipment: "dumbbell" },
  { name: "Chest-Supported Row", muscleGroup: "back", category: "compound", equipment: "machine" },
  { name: "Straight-Arm Pulldown", muscleGroup: "back", category: "isolation", equipment: "cable" },

  // ---- Biceps (Pull) ----
  { name: "Barbell Curl", muscleGroup: "biceps", category: "isolation", equipment: "barbell" },
  { name: "Dumbbell Curl", muscleGroup: "biceps", category: "isolation", equipment: "dumbbell" },
  { name: "Incline Dumbbell Curl", muscleGroup: "biceps", category: "isolation", equipment: "dumbbell" },
  { name: "Hammer Curl", muscleGroup: "biceps", category: "isolation", equipment: "dumbbell" },
  { name: "Cable Curl", muscleGroup: "biceps", category: "isolation", equipment: "cable" },
  { name: "Preacher Curl", muscleGroup: "biceps", category: "isolation", equipment: "machine" },

  // ---- Quads (Legs) ----
  { name: "Back Squat", muscleGroup: "quads", category: "compound", equipment: "barbell" },
  { name: "Front Squat", muscleGroup: "quads", category: "compound", equipment: "barbell" },
  { name: "Hack Squat", muscleGroup: "quads", category: "compound", equipment: "machine" },
  { name: "Leg Press", muscleGroup: "quads", category: "compound", equipment: "machine" },
  { name: "Bulgarian Split Squat", muscleGroup: "quads", category: "compound", equipment: "dumbbell" },
  { name: "Leg Extension", muscleGroup: "quads", category: "isolation", equipment: "machine" },
  { name: "Walking Lunge", muscleGroup: "quads", category: "compound", equipment: "dumbbell" },

  // ---- Hamstrings / Glutes (Legs) ----
  { name: "Romanian Deadlift", muscleGroup: "hamstrings", category: "compound", equipment: "barbell" },
  { name: "Lying Leg Curl", muscleGroup: "hamstrings", category: "isolation", equipment: "machine" },
  { name: "Seated Leg Curl", muscleGroup: "hamstrings", category: "isolation", equipment: "machine" },
  { name: "Hip Thrust", muscleGroup: "glutes", category: "compound", equipment: "barbell" },
  { name: "Cable Kickback", muscleGroup: "glutes", category: "isolation", equipment: "cable" },

  // ---- Calves / Core ----
  { name: "Standing Calf Raise", muscleGroup: "calves", category: "isolation", equipment: "machine" },
  { name: "Seated Calf Raise", muscleGroup: "calves", category: "isolation", equipment: "machine" },
  { name: "Hanging Leg Raise", muscleGroup: "core", category: "isolation", equipment: "bodyweight" },
  { name: "Cable Crunch", muscleGroup: "core", category: "isolation", equipment: "cable" },
  { name: "Plank", muscleGroup: "core", category: "isolation", equipment: "bodyweight" },

  // ---- Cardio ----
  { name: "Treadmill Walk", muscleGroup: "cardio", category: "compound", equipment: "machine" },
  { name: "Incline Walk", muscleGroup: "cardio", category: "compound", equipment: "machine" },
  { name: "Cycling", muscleGroup: "cardio", category: "compound", equipment: "machine" },
  { name: "Stair Master", muscleGroup: "cardio", category: "compound", equipment: "machine" },
];

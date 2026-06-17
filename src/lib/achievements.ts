import type { Profile, Session } from "@/types";

export interface AchievementDef {
  key: string;
  title: string;
  desc: string;
  icon: string; // lucide name
  check: (ctx: AchievementCtx) => boolean;
}

export interface AchievementCtx {
  profile: Profile;
  sessions: Session[];
  currentStreak: number;
  bestScore: number;
  totalLost: number; // kg lost vs start
  weighIns: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first-workout", title: "First Rep", desc: "Log your first workout", icon: "Dumbbell",
    check: (c) => c.sessions.some((s) => s.completed) },
  { key: "ten-workouts", title: "Consistency", desc: "Complete 10 workouts", icon: "Activity",
    check: (c) => c.sessions.filter((s) => s.completed).length >= 10 },
  { key: "fifty-workouts", title: "Iron Habit", desc: "Complete 50 workouts", icon: "Flame",
    check: (c) => c.sessions.filter((s) => s.completed).length >= 50 },
  { key: "hundred-workouts", title: "Centurion", desc: "Complete 100 workouts", icon: "Trophy",
    check: (c) => c.sessions.filter((s) => s.completed).length >= 100 },
  { key: "streak-7", title: "One Week Strong", desc: "7-day score streak", icon: "Zap",
    check: (c) => c.currentStreak >= 7 },
  { key: "streak-30", title: "Locked In", desc: "30-day score streak", icon: "Shield",
    check: (c) => c.currentStreak >= 30 },
  { key: "perfect-day", title: "Perfect Day", desc: "Hit a 90+ daily score", icon: "Star",
    check: (c) => c.bestScore >= 90 },
  { key: "down-2", title: "Momentum", desc: "Lose 2 kg from start", icon: "TrendingDown",
    check: (c) => c.totalLost >= 2 },
  { key: "down-5", title: "Transformation", desc: "Reach your goal weight", icon: "Award",
    check: (c) => c.profile.weightKg - c.totalLost <= c.profile.targets.weightGoal },
  { key: "logger", title: "Data Driven", desc: "Log 20 weigh-ins", icon: "LineChart",
    check: (c) => c.weighIns >= 20 },
];

import Dexie, { Table } from "dexie";
import type {
  Profile, Exercise, Template, Session, Food, FoodLog,
  DayMetrics, ProgressPhoto, Achievement, Checkmarks,
} from "@/types";

export class ForgeDB extends Dexie {
  profile!: Table<Profile, number>;
  exercises!: Table<Exercise, number>;
  templates!: Table<Template, number>;
  sessions!: Table<Session, number>;
  foods!: Table<Food, number>;
  foodLogs!: Table<FoodLog, number>;
  metrics!: Table<DayMetrics, string>;
  photos!: Table<ProgressPhoto, number>;
  achievements!: Table<Achievement, number>;
  checkmarks!: Table<Checkmarks, string>;

  constructor() {
    super("forge-fitness-os");
    this.version(1).stores({
      profile: "id",
      exercises: "++id, name, muscleGroup, category",
      templates: "++id, dayType, order",
      sessions: "++id, date, dayType, completed",
      foods: "++id, name",
      foodLogs: "++id, date, meal",
      metrics: "date",
      photos: "++id, date",
      achievements: "++id, &key",
      checkmarks: "date",
    });
  }
}

export const db = new ForgeDB();

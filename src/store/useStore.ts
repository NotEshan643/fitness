import { create } from "zustand";
import { db } from "@/db/db";
import { ensureSeeded } from "@/db/seed";
import type { Profile, DayMetrics, Checkmarks } from "@/types";
import { todayISO } from "@/lib/date";

interface Toast {
  id: number;
  text: string;
  kind: "ok" | "info" | "warn";
}

interface AppState {
  ready: boolean;
  profile: Profile | null;
  today: string;
  toasts: Toast[];
  init: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  patchProfile: (patch: Partial<Profile>) => Promise<void>;
  upsertMetrics: (date: string, patch: Partial<DayMetrics>) => Promise<void>;
  addWater: (date: string, litres: number) => Promise<void>;
  setCheck: (date: string, patch: Partial<Checkmarks>) => Promise<void>;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  resetAll: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  profile: null,
  today: todayISO(),
  toasts: [],

  init: async () => {
    await ensureSeeded();
    const profile = (await db.profile.get(1)) ?? null;
    set({ profile, ready: true, today: todayISO() });
  },

  saveProfile: async (p) => {
    await db.profile.put(p);
    set({ profile: p });
  },

  patchProfile: async (patch) => {
    const cur = get().profile;
    if (!cur) return;
    const next = { ...cur, ...patch };
    await db.profile.put(next);
    set({ profile: next });
  },

  upsertMetrics: async (date, patch) => {
    const existing = await db.metrics.get(date);
    const next: DayMetrics = { ...(existing ?? { date }), ...patch, date };
    await db.metrics.put(next);
  },

  addWater: async (date, litres) => {
    const existing = await db.metrics.get(date);
    const water = +(((existing?.water ?? 0) + litres)).toFixed(2);
    await db.metrics.put({ ...(existing ?? { date }), date, water });
  },

  setCheck: async (date, patch) => {
    const existing = await db.checkmarks.get(date);
    await db.checkmarks.put({ ...(existing ?? { date }), ...patch, date });
  },

  toast: (text, kind = "ok") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 2600);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  resetAll: async () => {
    await Promise.all([
      db.profile.clear(), db.sessions.clear(), db.foodLogs.clear(),
      db.metrics.clear(), db.photos.clear(), db.achievements.clear(),
      db.checkmarks.clear(), db.templates.clear(),
    ]);
    set({ profile: null });
    await get().init();
  },
}));

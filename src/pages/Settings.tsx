import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import * as Icons from "lucide-react";
import { Download, Upload, RotateCcw, Save, Sliders, Trophy, Lock } from "lucide-react";
import { db } from "@/db/db";
import { useStore } from "@/store/useStore";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { computeTargets } from "@/lib/targets";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { computeStreak } from "@/lib/streak";
import { weightTrend } from "@/lib/analytics";
import { lastNDays } from "@/lib/date";
import type { Targets } from "@/types";

const TARGET_FIELDS: { key: keyof Targets; label: string; step?: number }[] = [
  { key: "calories", label: "Calories (kcal)" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fat", label: "Fat (g)" },
  { key: "water", label: "Water (L)", step: 0.5 },
  { key: "steps", label: "Steps", step: 500 },
  { key: "sleepMin", label: "Sleep min (h)", step: 0.5 },
  { key: "sleepMax", label: "Sleep max (h)", step: 0.5 },
  { key: "weightGoal", label: "Goal Weight (kg)", step: 0.5 },
];

export default function Settings() {
  const profile = useStore((s) => s.profile)!;
  const patchProfile = useStore((s) => s.patchProfile);
  const resetAll = useStore((s) => s.resetAll);
  const toast = useStore((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [t, setT] = useState<Targets>(profile.targets);
  const [splitName, setSplitName] = useState(profile.splitName);

  const saveTargets = async () => {
    await patchProfile({ targets: t, splitName });
    toast("Targets updated");
  };

  const recompute = () => {
    const fresh = computeTargets(profile as any);
    setT(fresh);
    toast("Recomputed from your profile — review & save", "info");
  };

  const exportData = async () => {
    const dump = {
      version: 1, exportedAt: new Date().toISOString(),
      profile: await db.profile.toArray(),
      exercises: await db.exercises.toArray(),
      templates: await db.templates.toArray(),
      sessions: await db.sessions.toArray(),
      foods: await db.foods.toArray(),
      foodLogs: await db.foodLogs.toArray(),
      metrics: await db.metrics.toArray(),
      photos: await db.photos.toArray(),
      achievements: await db.achievements.toArray(),
      checkmarks: await db.checkmarks.toArray(),
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded");
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const d = JSON.parse(reader.result as string);
        await db.transaction("rw", db.tables, async () => {
          for (const tbl of db.tables) {
            const data = d[tbl.name];
            if (Array.isArray(data)) { await tbl.clear(); await tbl.bulkAdd(data); }
          }
        });
        toast("Backup restored — reloading");
        setTimeout(() => location.reload(), 800);
      } catch {
        toast("Invalid backup file", "warn");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Tune your plan. Your data lives only on this device." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle action={<button className="btn-soft px-3 py-1.5 text-xs" onClick={recompute}>Auto-recompute</button>}>
            <span className="flex items-center gap-2"><Sliders className="h-4 w-4 text-ember-400" /> Daily Targets</span>
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {TARGET_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="stat-label">{f.label}</span>
                <input
                  type="number" step={f.step ?? 1} className="input mt-1"
                  value={t[f.key] as number}
                  onChange={(e) => setT({ ...t, [f.key]: +e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="stat-label">Training Split</span>
            <input className="input mt-1" value={splitName} onChange={(e) => setSplitName(e.target.value)} />
          </label>
          <button className="btn-primary mt-4 w-full" onClick={saveTargets}><Save className="h-4 w-4" /> Save Targets</button>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle><span className="flex items-center gap-2"><Download className="h-4 w-4 text-info" /> Backup & Restore</span></SectionTitle>
            <p className="mb-3 text-sm text-steel-400">Export everything to a JSON file you can keep, or restore from a previous backup.</p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={exportData}><Download className="h-4 w-4" /> Export</button>
              <button className="btn-ghost flex-1" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Import</button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importData} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle><span className="flex items-center gap-2 text-bad"><RotateCcw className="h-4 w-4" /> Danger Zone</span></SectionTitle>
            <p className="mb-3 text-sm text-steel-400">Wipe all data and restart onboarding. This cannot be undone.</p>
            <button
              className="btn w-full border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20"
              onClick={async () => {
                if (confirm("Erase ALL FORGE data and start over? This cannot be undone.")) {
                  await resetAll();
                  location.reload();
                }
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset Everything
            </button>
          </Card>
        </div>
      </div>

      <AchievementsSection />
    </div>
  );
}

function AchievementsSection() {
  const profile = useStore((s) => s.profile)!;
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const range = useRangeData(90);
  const streakRaw = useLiveQuery(async () => {
    const first = lastNDays(60)[0];
    const [metrics, foodLogs, sess, checks] = await Promise.all([
      db.metrics.where("date").aboveOrEqual(first).toArray(),
      db.foodLogs.where("date").aboveOrEqual(first).toArray(),
      db.sessions.where("date").aboveOrEqual(first).toArray(),
      db.checkmarks.where("date").aboveOrEqual(first).toArray(),
    ]);
    return { metrics, foodLogs, sessions: sess, checks };
  }, []);

  const weighIns = range ? range.dates.filter((d) => range.metricsByDate.get(d)?.weight).length : 0;
  const trend = range ? weightTrend(range) : { points: [] as any[] };
  const start = trend.points[0]?.weight ?? profile.weightKg;
  const latest = trend.points[trend.points.length - 1]?.weight ?? profile.weightKg;
  const totalLost = Math.max(0, start - latest);
  const streak = streakRaw ? computeStreak(profile, streakRaw) : 0;
  const bestScore = 0;

  const ctx = { profile, sessions, currentStreak: streak, bestScore, totalLost, weighIns };

  return (
    <Card className="mt-6 p-5">
      <SectionTitle><span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-warn" /> Achievements</span></SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = a.check(ctx as any);
          const Icon = (Icons as any)[a.icon] ?? Trophy;
          return (
            <div key={a.key} className={`rounded-xl border p-3 text-center transition ${unlocked ? "border-ember-500/40 bg-ember-500/10" : "border-line bg-ink-900/40 opacity-60"}`}>
              <div className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${unlocked ? "bg-gradient-to-br from-ember-400 to-ember-600 text-white shadow-glow" : "bg-ink-700 text-steel-500"}`}>
                {unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <div className="mt-2 text-xs font-bold text-white">{a.title}</div>
              <div className="text-[10px] text-steel-500">{a.desc}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

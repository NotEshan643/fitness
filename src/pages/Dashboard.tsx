import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Flame, Dumbbell, Droplets, Footprints, Moon, Brain, ChevronRight,
  Check, Plus, Zap, TrendingUp, Beef, Coffee,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { db } from "@/db/db";
import { useDayBundle, useChecklist } from "@/hooks/useDayData";
import { useRangeData } from "@/hooks/useRangeData";
import { Ring } from "@/components/ui/Ring";
import { Card, ProgressBar } from "@/components/ui";
import { greeting, prettyDate, lastNDays } from "@/lib/date";
import { DAY_LABEL, DAY_ACCENT } from "@/lib/split";
import { macroTotals, scoreGrade } from "@/lib/score";
import { runCoach } from "@/lib/coach";
import { computeStreak } from "@/lib/streak";
import type { ChecklistItem } from "@/types";

const SEV_TONE: Record<string, string> = {
  good: "border-good/40 bg-good/10 text-good",
  info: "border-info/40 bg-info/10 text-info",
  warn: "border-warn/40 bg-warn/10 text-warn",
  bad: "border-bad/40 bg-bad/10 text-bad",
};

export default function Dashboard() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const setCheck = useStore((s) => s.setCheck);
  const navigate = useNavigate();

  const bundle = useDayBundle(today);
  const { items, score } = useChecklist(today);
  const range14 = useRangeData(14);
  const range7 = useRangeData(7);

  const template = useLiveQuery(
    async () => (bundle ? db.templates.where("dayType").equals(bundle.dayType).first() : undefined),
    [bundle?.dayType]
  );

  const streakDates = useLiveQuery(async () => {
    const dates = lastNDays(60);
    const first = dates[0];
    const [metrics, foodLogs, sessions, checks] = await Promise.all([
      db.metrics.where("date").aboveOrEqual(first).toArray(),
      db.foodLogs.where("date").aboveOrEqual(first).toArray(),
      db.sessions.where("date").aboveOrEqual(first).toArray(),
      db.checkmarks.where("date").aboveOrEqual(first).toArray(),
    ]);
    return { metrics, foodLogs, sessions, checks };
  }, []);

  if (!bundle) return null;

  const t = profile.targets;
  const totals = macroTotals(bundle.foodLogs);
  const grade = scoreGrade(score);
  const insight = range14 && range7 ? runCoach(profile, range14, range7)[0] : null;
  const streak = streakDates ? computeStreak(profile, streakDates) : 0;
  const accent = DAY_ACCENT[bundle.dayType];

  return (
    <div className="space-y-6">
      {/* ---- Hero header ---- */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-steel-400">{greeting()}{profile.name ? `, ${profile.name}` : ""}.</p>
          <h1 className="mt-0.5 text-3xl font-black text-white">{prettyDate(today)}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${accent} px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-glow`}>
              <Dumbbell className="h-3.5 w-3.5" /> {DAY_LABEL[bundle.dayType]}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-800 px-3 py-1 text-xs font-semibold text-steel-300">
              <Zap className="h-3.5 w-3.5 text-ember-400" /> {streak} day streak
            </span>
          </div>
        </div>

        <Card className="flex items-center gap-5 px-6 py-4">
          <Ring progress={score / 100} size={104} stroke={9} color="#FF6B2C">
            <span className="text-3xl font-black text-white">{score}</span>
            <span className="stat-label">score</span>
          </Ring>
          <div>
            <div className="stat-label">Daily Standing</div>
            <div className={`text-2xl font-black ${grade.color}`}>{grade.label}</div>
            <p className="mt-1 max-w-[150px] text-xs text-steel-500">
              {score >= 75 ? "You're crushing today." : "Knock out the checklist to climb."}
            </p>
          </div>
        </Card>
      </div>

      {/* ---- Metric rings ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricRing label="Calories" value={Math.round(totals.kcal)} target={t.calories} unit="kcal" color="#FF6B2C" icon={Flame} to="/diet" invertGood />
        <MetricRing label="Protein" value={Math.round(totals.protein)} target={t.protein} unit="g" color="#34D399" icon={Beef} to="/diet" />
        <MetricRing label="Water" value={bundle.metrics?.water ?? 0} target={t.water} unit="L" color="#60A5FA" icon={Droplets} to="/water" decimals />
        <MetricRing label="Steps" value={bundle.metrics?.steps ?? 0} target={t.steps} unit="" color="#FBBF24" icon={Footprints} to="/steps" />
        <MetricRing label="Sleep" value={bundle.metrics?.sleepHours ?? 0} target={t.sleepMin} unit="h" color="#A78BFA" icon={Moon} to="/sleep" decimals />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Today's workout ---- */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <div className={`flex items-center justify-between bg-gradient-to-r ${accent} px-5 py-3`}>
              <div className="flex items-center gap-2 text-white">
                <Dumbbell className="h-5 w-5" />
                <span className="font-bold">Today's Workout · {DAY_LABEL[bundle.dayType]}</span>
              </div>
              {bundle.session?.completed && (
                <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold text-white">DONE</span>
              )}
            </div>
            <div className="p-5">
              {bundle.dayType === "rest" ? (
                <div className="flex items-center gap-3 text-steel-300">
                  <Coffee className="h-8 w-8 text-steel-500" />
                  <div>
                    <p className="font-semibold text-white">Rest & recover</p>
                    <p className="text-sm text-steel-400">No lifting today. Hit your steps, protein, water and sleep — that's where growth happens.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {template?.entries.slice(0, 6).map((e, i) => (
                      <ExerciseChip key={i} exerciseId={e.exerciseId} sets={e.targetSets} reps={e.targetReps} />
                    )) ?? <p className="text-sm text-steel-500">No template for this day yet.</p>}
                  </div>
                  <button className="btn-primary w-full" onClick={() => navigate("/workout")}>
                    {bundle.session?.completed ? "View / Edit Session" : "Start Workout"} <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </Card>

          {/* ---- Coach insight ---- */}
          {insight && (
            <Card className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-ember-400" />
                <span className="stat-label">Coach's Focus</span>
              </div>
              <div className={`rounded-xl border p-4 ${SEV_TONE[insight.severity]}`}>
                <p className="font-bold text-white">{insight.title}</p>
                <p className="mt-1 text-sm text-steel-300">{insight.message}</p>
              </div>
              <Link to="/coach" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ember-400 hover:text-ember-300">
                See all insights <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}
        </div>

        {/* ---- Checklist ---- */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">Daily Checklist</h2>
            <span className="text-sm font-bold text-ember-400">
              {items.filter((i) => i.done).length}/{items.length}
            </span>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <ChecklistRow
                key={item.key}
                item={item}
                onToggle={item.auto ? undefined : () => setCheck(today, { [item.key]: !item.done } as any)}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MetricRing({
  label, value, target, unit, color, icon: Icon, to, decimals, invertGood,
}: {
  label: string; value: number; target: number; unit: string; color: string;
  icon: any; to: string; decimals?: boolean; invertGood?: boolean;
}) {
  const pct = target ? value / target : 0;
  const display = decimals ? value.toFixed(1) : Math.round(value).toLocaleString();
  return (
    <Link to={to}>
      <Card className="flex flex-col items-center p-4 transition hover:border-ember-500/40">
        <Ring progress={Math.min(pct, 1)} size={92} stroke={8} color={color}>
          <Icon className="mb-0.5 h-4 w-4" style={{ color }} />
          <span className="text-base font-extrabold leading-none text-white">{display}</span>
          <span className="text-[10px] text-steel-500">{unit}</span>
        </Ring>
        <div className="mt-2 text-center">
          <div className="text-xs font-bold text-white">{label}</div>
          <div className="text-[11px] text-steel-500">
            of {decimals ? target.toFixed(1) : target.toLocaleString()} {unit}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ExerciseChip({ exerciseId, sets, reps }: { exerciseId: number; sets: number; reps: string }) {
  const ex = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
  return (
    <div className="rounded-lg border border-line bg-ink-900/60 px-3 py-2">
      <div className="truncate text-sm font-semibold text-white">{ex?.name ?? "…"}</div>
      <div className="text-xs text-steel-500">{sets} × {reps}</div>
    </div>
  );
}

function ChecklistRow({ item, onToggle }: { item: ChecklistItem; onToggle?: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={!onToggle}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        item.done ? "border-good/30 bg-good/10" : "border-line bg-ink-900/40"
      } ${onToggle ? "hover:border-steel-500" : "cursor-default"}`}
    >
      <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
        item.done ? "border-good bg-good text-ink-900" : "border-steel-500"
      }`}>
        {item.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${item.done ? "text-white" : "text-steel-300"}`}>{item.label}</div>
        {item.detail && <div className="text-[11px] text-steel-500">{item.detail}</div>}
      </div>
      {!item.done && item.progress != null && item.progress > 0 && (
        <div className="w-12"><ProgressBar value={item.progress} /></div>
      )}
    </button>
  );
}

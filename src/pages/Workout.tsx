import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Dumbbell, Plus, Trash2, Check, History, Library, Search, Trophy,
  TrendingUp, X, ChevronDown,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { db } from "@/db/db";
import { useStore } from "@/store/useStore";
import { useDayBundle } from "@/hooks/useDayData";
import { Card, PageHeader, Empty, Pill, SectionTitle } from "@/components/ui";
import { DAY_LABEL } from "@/lib/split";
import { suggestProgression, findLastEntry, e1rm, bestE1rm, sessionVolume, topSet } from "@/lib/progression";
import { shortDate, prettyDate } from "@/lib/date";
import type { Session, SessionEntry, SetLog, Exercise, Template } from "@/types";

type Tab = "today" | "history" | "exercises";

export default function Workout() {
  const [tab, setTab] = useState<Tab>("today");
  return (
    <div>
      <PageHeader title="Training" subtitle="Log it. Beat it. Track every rep." />
      <div className="mb-6 flex gap-2">
        <TabBtn active={tab === "today"} onClick={() => setTab("today")} icon={Dumbbell}>Today</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={History}>History & PRs</TabBtn>
        <TabBtn active={tab === "exercises"} onClick={() => setTab("exercises")} icon={Library}>Exercises</TabBtn>
      </div>
      {tab === "today" && <TodaySession />}
      {tab === "history" && <HistoryTab />}
      {tab === "exercises" && <ExerciseLibrary />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: any) {
  return (
    <button onClick={onClick} className={active ? "btn-primary" : "btn-ghost"}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

// ---------------- TODAY ----------------
function TodaySession() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const toast = useStore((s) => s.toast);
  const bundle = useDayBundle(today);

  const [session, setSession] = useState<Session | null>(null);
  const [picker, setPicker] = useState(false);

  const allHistory = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const template = useLiveQuery<Template | undefined>(
    () => (bundle ? db.templates.where("dayType").equals(bundle.dayType).first() : Promise.resolve(undefined)),
    [bundle?.dayType]
  );

  // Initialise working session from existing log or template.
  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    (async () => {
      const existing = (await db.sessions.where("date").equals(today).toArray())[0];
      if (existing) {
        if (!cancelled) setSession(existing);
        return;
      }
      if (bundle.dayType === "rest") {
        if (!cancelled) setSession(null);
        return;
      }
      const tpl = await db.templates.where("dayType").equals(bundle.dayType).first();
      const entries: SessionEntry[] = [];
      if (tpl) {
        for (const e of tpl.entries) {
          const ex = await db.exercises.get(e.exerciseId);
          entries.push({
            exerciseId: e.exerciseId,
            exerciseName: ex?.name ?? "Exercise",
            sets: Array.from({ length: e.targetSets }, () => ({ reps: 0, weight: 0 })),
          });
        }
      }
      if (!cancelled)
        setSession({
          date: today,
          dayType: bundle.dayType,
          templateId: tpl?.id,
          title: DAY_LABEL[bundle.dayType],
          entries,
          completed: false,
        });
    })();
    return () => { cancelled = true; };
  }, [bundle?.dayType, today]);

  if (!bundle) return null;
  if (bundle.dayType === "rest" && !session) {
    return <Empty title="Rest Day" hint="Recover hard today. You can still log an optional cardio or mobility session from the Exercises tab." />;
  }
  if (!session) return null;

  const update = (s: Session) => setSession({ ...s });

  const setEntrySet = (ei: number, si: number, patch: Partial<SetLog>) => {
    const entries = session.entries.map((e, i) =>
      i === ei ? { ...e, sets: e.sets.map((st, j) => (j === si ? { ...st, ...patch } : st)) } : e
    );
    update({ ...session, entries });
  };
  const addSet = (ei: number) => {
    const entries = session.entries.map((e, i) => {
      if (i !== ei) return e;
      const last = e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, last ? { ...last, done: false } : { reps: 0, weight: 0 }] };
    });
    update({ ...session, entries });
  };
  const delSet = (ei: number, si: number) => {
    const entries = session.entries.map((e, i) =>
      i === ei ? { ...e, sets: e.sets.filter((_, j) => j !== si) } : e
    );
    update({ ...session, entries });
  };
  const delEntry = (ei: number) =>
    update({ ...session, entries: session.entries.filter((_, i) => i !== ei) });

  const addExercise = async (ex: Exercise) => {
    update({
      ...session,
      entries: [...session.entries, { exerciseId: ex.id!, exerciseName: ex.name, sets: [{ reps: 0, weight: 0 }] }],
    });
    setPicker(false);
  };

  const save = async (complete: boolean) => {
    const clean: Session = {
      ...session,
      completed: complete,
      entries: session.entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps > 0) })),
    };
    const id = await db.sessions.put(clean);
    setSession({ ...clean, id });
    toast(complete ? "Workout completed 💪" : "Session saved", complete ? "ok" : "info");
  };

  const volume = Math.round(sessionVolume(session));
  const tplReps = (exerciseId: number) =>
    template?.entries.find((e) => e.exerciseId === exerciseId)?.targetReps ?? "8-12";

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="text-lg font-bold text-white">{session.title}</div>
          <div className="text-xs text-steel-500">{prettyDate(today)} · {session.entries.length} exercises · {volume.toLocaleString()} kg volume</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft" onClick={() => save(false)}>Save</button>
          <button className="btn-primary" onClick={() => save(true)}>
            <Check className="h-4 w-4" /> {session.completed ? "Update" : "Complete"}
          </button>
        </div>
      </Card>

      {session.entries.map((entry, ei) => (
        <ExerciseCard
          key={ei}
          entry={entry}
          history={allHistory}
          targetReps={tplReps(entry.exerciseId)}
          onSet={(si, patch) => setEntrySet(ei, si, patch)}
          onAddSet={() => addSet(ei)}
          onDelSet={(si) => delSet(ei, si)}
          onDelEntry={() => delEntry(ei)}
        />
      ))}

      <button className="btn-ghost w-full" onClick={() => setPicker(true)}>
        <Plus className="h-4 w-4" /> Add Exercise
      </button>

      {picker && <ExercisePicker onPick={addExercise} onClose={() => setPicker(false)} />}
    </div>
  );
}

function ExerciseCard({
  entry, history, targetReps, onSet, onAddSet, onDelSet, onDelEntry,
}: {
  entry: SessionEntry; history: Session[]; targetReps: string;
  onSet: (si: number, patch: Partial<SetLog>) => void;
  onAddSet: () => void; onDelSet: (si: number) => void; onDelEntry: () => void;
}) {
  const past = history.filter((s) => s.completed && s.date < new Date().toISOString().slice(0, 10));
  const last = findLastEntry(entry.exerciseId, past);
  const hint = suggestProgression(entry.exerciseId, past, targetReps);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="font-bold text-white">{entry.exerciseName}</div>
        <button onClick={onDelEntry} className="text-steel-500 hover:text-bad"><Trash2 className="h-4 w-4" /></button>
      </div>

      <div className="space-y-2 p-4">
        {/* progression hint */}
        <div className="rounded-lg border border-ember-500/25 bg-ember-500/10 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ember-400">
            <TrendingUp className="h-3.5 w-3.5" /> Suggested progression
          </div>
          <div className="mt-0.5 text-sm text-steel-300">{hint.text}</div>
          {last && (
            <div className="mt-1 text-[11px] text-steel-500">
              Last time: {last.sets.map((s) => `${s.weight}×${s.reps}`).join(", ")}
            </div>
          )}
        </div>

        {/* set rows */}
        <div className="grid grid-cols-[28px_1fr_1fr_1fr_28px] items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-wide text-steel-500">
          <span>#</span><span>Weight (kg)</span><span>Reps</span><span>RPE</span><span></span>
        </div>
        {entry.sets.map((st, si) => (
          <div key={si} className={`grid grid-cols-[28px_1fr_1fr_1fr_28px] items-center gap-2 rounded-lg px-1 py-1 ${st.done ? "bg-good/5" : ""}`}>
            <button
              onClick={() => onSet(si, { done: !st.done })}
              className={`grid h-6 w-6 place-items-center rounded-md border text-xs font-bold ${
                st.done ? "border-good bg-good text-ink-900" : "border-line text-steel-400"
              }`}
            >{st.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : si + 1}</button>
            <NumInput value={st.weight} onChange={(v) => onSet(si, { weight: v })} step={2.5} />
            <NumInput value={st.reps} onChange={(v) => onSet(si, { reps: v })} step={1} />
            <NumInput value={st.rpe ?? 0} onChange={(v) => onSet(si, { rpe: v })} step={0.5} placeholder="–" />
            <button onClick={() => onDelSet(si)} className="text-steel-600 hover:text-bad"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={onAddSet} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ember-400 hover:text-ember-300">
          <Plus className="h-3.5 w-3.5" /> Add set
        </button>
      </div>
    </Card>
  );
}

function NumInput({ value, onChange, step, placeholder }: { value: number; onChange: (v: number) => void; step: number; placeholder?: string }) {
  return (
    <input
      type="number"
      step={step}
      value={value || ""}
      placeholder={placeholder ?? "0"}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="input px-2 py-1.5 text-center text-sm"
    />
  );
}

function ExercisePicker({ onPick, onClose }: { onPick: (e: Exercise) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center" onClick={onClose}>
      <Card className="max-h-[70vh] w-full max-w-lg overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 text-steel-500" />
          <input autoFocus className="flex-1 bg-transparent text-sm text-white outline-none" placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={onClose}><X className="h-5 w-5 text-steel-500" /></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-ink-700">
              <span className="text-sm font-semibold text-white">{e.name}</span>
              <Pill>{e.muscleGroup}</Pill>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------- HISTORY ----------------
function HistoryTab() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? [];
  const completed = sessions.filter((s) => s.completed).sort((a, b) => (a.date < b.date ? 1 : -1));
  const [openId, setOpenId] = useState<number | null>(null);

  // Compute PRs (best e1RM per exercise).
  const prs = new Map<string, { e1rm: number; set: SetLog; date: string }>();
  for (const s of completed) {
    for (const e of s.entries) {
      const ts = topSet(e.sets);
      if (!ts) continue;
      const val = bestE1rm(e.sets);
      const cur = prs.get(e.exerciseName);
      if (!cur || val > cur.e1rm) prs.set(e.exerciseName, { e1rm: val, set: ts, date: s.date });
    }
  }

  const volumeData = completed
    .slice(0, 20).reverse()
    .map((s) => ({ date: shortDate(s.date), volume: Math.round(sessionVolume(s)) }));

  if (completed.length === 0)
    return <Empty icon={<History className="h-8 w-8" />} title="No completed workouts yet" hint="Log and complete a session to start building history, PRs and volume trends." />;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionTitle>Volume Trend</SectionTitle>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
              <XAxis dataKey="date" stroke="#5C6B82" fontSize={11} />
              <YAxis stroke="#5C6B82" fontSize={11} />
              <Tooltip contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} />
              <Line type="monotone" dataKey="volume" stroke="#FF6B2C" strokeWidth={2.5} dot={{ r: 3, fill: "#FF6B2C" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle><span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-warn" /> Personal Records</span></SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {[...prs.entries()].sort((a, b) => b[1].e1rm - a[1].e1rm).slice(0, 10).map(([name, pr]) => (
            <div key={name} className="flex items-center justify-between rounded-xl border border-line bg-ink-900/40 px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-white">{name}</div>
                <div className="text-[11px] text-steel-500">{pr.set.weight}kg × {pr.set.reps} · {shortDate(pr.date)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-ember-400">{Math.round(pr.e1rm)}kg</div>
                <div className="text-[10px] text-steel-500">est. 1RM</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Session Log</SectionTitle>
        <div className="space-y-2">
          {completed.map((s) => (
            <div key={s.id} className="rounded-xl border border-line bg-ink-900/40">
              <button onClick={() => setOpenId(openId === s.id ? null : s.id!)} className="flex w-full items-center justify-between px-4 py-3">
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{s.title}</div>
                  <div className="text-[11px] text-steel-500">{prettyDate(s.date)} · {s.entries.length} exercises</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ember-400">{Math.round(sessionVolume(s)).toLocaleString()} kg</span>
                  <ChevronDown className={`h-4 w-4 text-steel-500 transition ${openId === s.id ? "rotate-180" : ""}`} />
                </div>
              </button>
              {openId === s.id && (
                <div className="space-y-1.5 border-t border-line px-4 py-3">
                  {s.entries.map((e, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-steel-300">{e.exerciseName}</span>
                      <span className="text-steel-500">{e.sets.map((st) => `${st.weight}×${st.reps}`).join(", ")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------- EXERCISE LIBRARY ----------------
function ExerciseLibrary() {
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];
  const toast = useStore((s) => s.toast);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", muscleGroup: "chest", category: "compound", equipment: "barbell" });

  const groups = [...new Set(exercises.map((e) => e.muscleGroup))];
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  const add = async () => {
    if (!form.name.trim()) return;
    await db.exercises.add({ ...form, isCustom: true } as Exercise);
    toast("Exercise added");
    setForm({ ...form, name: "" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <SectionTitle>Add Custom Exercise</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input className="input" placeholder="Exercise name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })}>
            {["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves","core","cardio"].map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="compound">compound</option><option value="isolation">isolation</option>
          </select>
          <input className="input" placeholder="equipment" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          <button className="btn-primary" onClick={add}><Plus className="h-4 w-4" /></button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-ink-900/60 px-3 py-2">
          <Search className="h-4 w-4 text-steel-500" />
          <input className="flex-1 bg-transparent text-sm text-white outline-none" placeholder="Search library…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {groups.map((g) => {
          const items = filtered.filter((e) => e.muscleGroup === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mb-4">
              <div className="stat-label mb-2">{g}</div>
              <div className="flex flex-wrap gap-2">
                {items.map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/50 px-3 py-1.5 text-sm text-steel-300">
                    {e.name}
                    {e.isCustom && <Pill tone="info">custom</Pill>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

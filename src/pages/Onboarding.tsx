import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, ChevronRight, ChevronLeft, User, Target, Clock, Apple,
  Dumbbell, Wind, HeartPulse, Sparkles, Check,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { computeTargets, explainTargets } from "@/lib/targets";
import { DEFAULT_SPLIT } from "@/lib/split";
import type { Profile, Goal, ActivityLevel, Diet, Sex } from "@/types";
import { todayISO } from "@/lib/date";

// Pre-filled with the user's stated details so it feels personal immediately.
const INITIAL = {
  name: "",
  age: 21,
  sex: "male" as Sex,
  heightCm: 168,
  weightKg: 70,
  bodyFat: 25,
  experience: "intermediate" as Profile["experience"],
  goals: ["recomp", "fatloss"] as Goal[],
  activity: "moderate" as ActivityLevel,
  schedule: "",
  sleepSchedule: "",
  workoutTime: "60-75 min",
  daysPerWeek: 5,
  splitName: "Push / Pull / Rest / Push / Pull / Legs / Rest",
  splitDays: DEFAULT_SPLIT,
  diet: "veg" as Diet,
  likes: "",
  dislikes: "",
  allergies: "",
  budget: "moderate" as Profile["budget"],
  proteinAfford: "Whey, paneer, eggs, soya, curd",
  favExercises: "",
  dislikedExercises: "",
  weakParts: [] as string[],
  strongParts: [] as string[],
  injuries: "",
  mobility: "",
  cardioPrefs: ["walking"] as string[],
  waterHabit: 5,
  sleepQuality: 3,
  stress: 3,
};

type Form = typeof INITIAL;

const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "fatloss", label: "Fat Loss", desc: "Get leaner" },
  { id: "muscle", label: "Muscle Gain", desc: "Build size" },
  { id: "recomp", label: "Recomposition", desc: "Lose fat, keep muscle" },
  { id: "strength", label: "Strength", desc: "Get stronger" },
  { id: "performance", label: "Performance", desc: "Athleticism" },
];
const MUSCLES = ["chest", "back", "shoulders", "arms", "legs", "core"];
const CARDIO = ["walking", "running", "cycling", "sports", "swimming"];

function StepShell({
  icon: Icon, title, subtitle, children,
}: { icon: any; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-ink-700 text-ember-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">{title}</h2>
          <p className="text-sm text-steel-400">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="stat-label mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Chips<T extends string>({
  options, value, onToggle, multi = true,
}: { options: { id: T; label: string }[]; value: T[]; onToggle: (v: T) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" onClick={() => onToggle(o.id)} className={on ? "chip-on" : "chip-off"}>
            {on && <Check className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const saveProfile = useStore((s) => s.saveProfile);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(INITIAL);
  const set = (patch: Partial<Form>) => setF((p) => ({ ...p, ...patch }));

  const targets = useMemo(() => computeTargets(f as any), [f]);
  const STEPS = 9;

  const toggle = <T extends string>(key: keyof Form, v: T) => {
    const arr = (f[key] as unknown as T[]) ?? [];
    set({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as any);
  };

  const finish = async () => {
    const profile: Profile = {
      ...(f as any),
      id: 1,
      targets,
      onboarded: true,
      createdAt: new Date().toISOString(),
    };
    await saveProfile(profile);
  };

  const reasons = useMemo(
    () => explainTargets({ ...(f as any), targets } as Profile),
    [f, targets]
  );

  const steps: React.ReactNode[] = [
    // 0 — Welcome
    <div key="w" className="text-center">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-ember-400 to-ember-600 shadow-glow">
        <Flame className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-3xl font-black text-white">Welcome to FORGE</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-steel-400">
        I'm your personal fitness operating system. Before we begin, let's run a quick coaching
        interview so I can build a plan around <span className="text-white">you</span> — your body,
        your goals, your schedule. Takes about 2 minutes.
      </p>
      <Field label="What should I call you?">
        <input className="input mx-auto max-w-xs text-center" value={f.name}
          onChange={(e) => set({ name: e.target.value })} placeholder="Your name" />
      </Field>
    </div>,

    // 1 — Personal
    <StepShell key="p" icon={User} title="The basics" subtitle="Your starting point.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Age"><input type="number" className="input" value={f.age} onChange={(e) => set({ age: +e.target.value })} /></Field>
        <Field label="Sex">
          <select className="input" value={f.sex} onChange={(e) => set({ sex: e.target.value as Sex })}>
            <option value="male">Male</option><option value="female">Female</option>
          </select>
        </Field>
        <Field label="Height (cm)"><input type="number" className="input" value={f.heightCm} onChange={(e) => set({ heightCm: +e.target.value })} /></Field>
        <Field label="Weight (kg)"><input type="number" className="input" value={f.weightKg} onChange={(e) => set({ weightKg: +e.target.value })} /></Field>
        <Field label="Est. Body Fat (%)"><input type="number" className="input" value={f.bodyFat} onChange={(e) => set({ bodyFat: +e.target.value })} /></Field>
        <Field label="Experience">
          <select className="input" value={f.experience} onChange={(e) => set({ experience: e.target.value as any })}>
            <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
          </select>
        </Field>
      </div>
    </StepShell>,

    // 2 — Goals
    <StepShell key="g" icon={Target} title="Your goals" subtitle="What are we forging? Pick all that apply.">
      <Chips options={GOALS.map((g) => ({ id: g.id, label: g.label }))} value={f.goals} onToggle={(v) => toggle("goals", v)} />
      <div className="grid gap-2 sm:grid-cols-2">
        {GOALS.filter((g) => f.goals.includes(g.id)).map((g) => (
          <div key={g.id} className="rounded-xl border border-ember-500/30 bg-ember-500/10 px-3 py-2 text-xs text-steel-300">
            <span className="font-semibold text-ember-400">{g.label}:</span> {g.desc}
          </div>
        ))}
      </div>
    </StepShell>,

    // 3 — Lifestyle
    <StepShell key="l" icon={Clock} title="Lifestyle" subtitle="So your plan fits your real life.">
      <Field label="Work / College schedule">
        <input className="input" value={f.schedule} onChange={(e) => set({ schedule: e.target.value })} placeholder="e.g. College 9–4, evenings free" />
      </Field>
      <Field label="Sleep schedule">
        <input className="input" value={f.sleepSchedule} onChange={(e) => set({ sleepSchedule: e.target.value })} placeholder="e.g. 12am – 8am" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Daily activity level">
          <select className="input" value={f.activity} onChange={(e) => set({ activity: e.target.value as ActivityLevel })}>
            <option value="sedentary">Sedentary (desk)</option>
            <option value="light">Lightly active</option>
            <option value="moderate">Moderately active</option>
            <option value="active">Active</option>
            <option value="veryactive">Very active</option>
          </select>
        </Field>
        <Field label="Time per workout">
          <input className="input" value={f.workoutTime} onChange={(e) => set({ workoutTime: e.target.value })} />
        </Field>
      </div>
    </StepShell>,

    // 4 — Nutrition
    <StepShell key="n" icon={Apple} title="Nutrition" subtitle="I track your food — I never force a diet on you.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Diet type">
          <select className="input" value={f.diet} onChange={(e) => set({ diet: e.target.value as Diet })}>
            <option value="veg">Vegetarian</option>
            <option value="eggetarian">Eggetarian</option>
            <option value="nonveg">Non-vegetarian</option>
            <option value="vegan">Vegan</option>
          </select>
        </Field>
        <Field label="Budget">
          <select className="input" value={f.budget} onChange={(e) => set({ budget: e.target.value as any })}>
            <option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option>
          </select>
        </Field>
      </div>
      <Field label="Foods you love"><input className="input" value={f.likes} onChange={(e) => set({ likes: e.target.value })} placeholder="e.g. paneer, chicken, rice" /></Field>
      <Field label="Foods you dislike"><input className="input" value={f.dislikes} onChange={(e) => set({ dislikes: e.target.value })} /></Field>
      <Field label="Allergies"><input className="input" value={f.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="e.g. none" /></Field>
      <Field label="Protein sources you can afford"><input className="input" value={f.proteinAfford} onChange={(e) => set({ proteinAfford: e.target.value })} /></Field>
    </StepShell>,

    // 5 — Training
    <StepShell key="t" icon={Dumbbell} title="Training" subtitle="Your split is pre-set to Push/Pull/Rest/Push/Pull/Legs/Rest.">
      <Field label="Weekly split">
        <input className="input" value={f.splitName} onChange={(e) => set({ splitName: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Favorite exercises"><input className="input" value={f.favExercises} onChange={(e) => set({ favExercises: e.target.value })} /></Field>
        <Field label="Disliked exercises"><input className="input" value={f.dislikedExercises} onChange={(e) => set({ dislikedExercises: e.target.value })} /></Field>
      </div>
      <Field label="Weak body parts (prioritise)">
        <Chips options={MUSCLES.map((m) => ({ id: m, label: m }))} value={f.weakParts} onToggle={(v) => toggle("weakParts", v)} />
      </Field>
      <Field label="Strong body parts">
        <Chips options={MUSCLES.map((m) => ({ id: m, label: m }))} value={f.strongParts} onToggle={(v) => toggle("strongParts", v)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Injury history"><input className="input" value={f.injuries} onChange={(e) => set({ injuries: e.target.value })} placeholder="e.g. none" /></Field>
        <Field label="Mobility limitations"><input className="input" value={f.mobility} onChange={(e) => set({ mobility: e.target.value })} placeholder="e.g. none" /></Field>
      </div>
    </StepShell>,

    // 6 — Cardio
    <StepShell key="c" icon={Wind} title="Cardio & activity" subtitle="How do you like to move outside the gym?">
      <Chips options={CARDIO.map((c) => ({ id: c, label: c }))} value={f.cardioPrefs} onToggle={(v) => toggle("cardioPrefs", v)} />
      <p className="text-xs text-steel-500">Walking is the backbone of fat loss — we'll set a daily step goal regardless.</p>
    </StepShell>,

    // 7 — Habits
    <StepShell key="h" icon={HeartPulse} title="Habits & recovery" subtitle="Recovery is where results are built.">
      <Field label={`Daily water habit: ${f.waterHabit} L`}>
        <input type="range" min={1} max={8} step={0.5} value={f.waterHabit} onChange={(e) => set({ waterHabit: +e.target.value })} className="w-full accent-ember-500" />
      </Field>
      <Field label={`Typical sleep quality: ${["", "Poor", "Fair", "Okay", "Good", "Great"][f.sleepQuality]}`}>
        <input type="range" min={1} max={5} value={f.sleepQuality} onChange={(e) => set({ sleepQuality: +e.target.value })} className="w-full accent-ember-500" />
      </Field>
      <Field label={`Stress level: ${["", "Very low", "Low", "Moderate", "High", "Very high"][f.stress]}`}>
        <input type="range" min={1} max={5} value={f.stress} onChange={(e) => set({ stress: +e.target.value })} className="w-full accent-ember-500" />
      </Field>
    </StepShell>,

    // 8 — Plan
    <StepShell key="plan" icon={Sparkles} title="Your personalized plan" subtitle="Here's what I built for you — and why.">
      <div className="grid gap-3 sm:grid-cols-2">
        {reasons.map((r) => (
          <div key={r.key} className="rounded-xl border border-line bg-ink-800 p-4">
            <div className="flex items-baseline justify-between">
              <span className="stat-label">{r.label}</span>
              <span className="text-lg font-extrabold text-ember-400">{r.value}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-steel-400">{r.reason}</p>
          </div>
        ))}
      </div>
    </StepShell>,
  ];

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-ember-500" : "bg-ink-700"}`} />
          ))}
        </div>

        <div className="card p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <button
              className="btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {step < STEPS - 1 ? (
              <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button className="btn-primary" onClick={finish}>
                Enter FORGE <Flame className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-steel-500">
          Step {step + 1} of {STEPS} · All data stays on your device
        </p>
      </div>
    </div>
  );
}

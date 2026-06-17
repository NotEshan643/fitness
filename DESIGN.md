# FORGE — Personal Fitness Operating System

> A premium, fully-local fitness transformation system. No accounts. No cloud. No subscriptions.
> Built for a single user, designed to be opened every single day for years.

---

## 1. Product Vision

FORGE is an all-in-one fitness operating system that unifies **training, nutrition,
recovery, body composition, habits, analytics, and AI coaching** into one fast,
beautiful, dark, masculine desktop-class application that runs entirely on your local PC.

The defining design principle: **everything important lives on one Daily Dashboard.**
You should not have to hunt through pages. Open the app → see your day → act → close.

Design pillars:
- **Daily-first** — the app is built around the single day you are living right now.
- **Flexible, not prescriptive** — it tracks *your* meals and *your* training; it never forces a diet.
- **Coach in the loop** — a rules engine continuously analyzes your data and talks to you like a knowledgeable mentor.
- **Local & permanent** — all data is stored in IndexedDB on your machine; export/import for backups. Nothing ever leaves your computer.
- **Premium feel** — dark theme, progress rings, smooth motion, strong typographic hierarchy, zero clutter, no childish gamification.

---

## 2. The User (Personalization Inputs)

| Field | Value |
|---|---|
| Age | 21 |
| Gender | Male |
| Nationality | Indian |
| Height | 5'6" (167.6 cm) |
| Weight | 70 kg |
| Body fat | ~25% |
| Experience | Intermediate |
| Frequency | 5 days/week |
| Split | Push / Pull / Rest / Push / Pull / Legs / Rest |
| Goal | Cut to 65–66 kg, lose fat, keep muscle, get lean & athletic (not skinny) |
| Protein | ~140 g/day |
| Budget | Moderate |

---

## 3. Technical Architecture

```
Vite + React 18 + TypeScript          → fast SPA, instant HMR, builds to static files
Tailwind CSS                          → design system, dark premium theme
Zustand                               → global state (profile, today, live metrics)
Dexie.js (IndexedDB)                  → durable local database in the browser
Recharts                              → all charts (weight, volume, adherence, trends)
Framer Motion                         → smooth page/element animations
React Router                          → navigation
date-fns                              → date math
lucide-react                          → icon set
```

**Why a local web app:** zero install friction (`npm run dev`), runs on any OS, fully
offline, data stored locally in IndexedDB, trivially wrappable in Electron/Tauri later.
**Why a rules engine for the coach:** deterministic, instant, 100% offline, no API key,
encodes real strength & nutrition science.

### Data flow
`UI → Zustand actions → Dexie (IndexedDB) → reactive selectors → UI`.
Derived values (score, checklist, adherence, coach insights) are **computed**, never stored stale.

---

## 4. Database Schema (Dexie tables)

```ts
profile      { id=1, ...onboarding answers, targets{}, createdAt }        // singleton
exercises    { id, name, muscleGroup, category, equipment, isCustom }     // library, seeded
templates    { id, name, dayType, exerciseIds[], isDefault }              // Push/Pull/Legs
sessions     { id, date, templateId, dayType, entries[], durationMin,     // a workout
               notes }   entries: { exerciseId, sets:[{reps,weight,rpe,rest}] }
foods        { id, name, per, kcal, protein, carbs, fat, isCustom }       // food library, seeded (Indian)
foodLogs     { id, date, meal, name, qty, kcal, protein, carbs, fat }     // a logged food
metrics      { date(PK), water, steps, sleepHours, bedTime, wakeTime,     // one row per day
               sleepQuality, weight, waist, bodyFat, mood, recovery }
photos       { id, date, dataUrl, weight, note }                          // progress photos
achievements { id, key, unlockedAt }                                      // unlocked milestones
checkmarks   { date(PK), workout, protein, water, steps, sleep, calories, // manual overrides
               photo, recovery }
```

**Relationships:** `sessions.entries[].exerciseId → exercises.id`;
`templates.exerciseIds → exercises.id`; `foodLogs.date / metrics.date / checkmarks.date`
share the ISO date key, which is how the dashboard assembles "today".

---

## 5. Personalization Engine (post-onboarding target generation)

All targets are computed and shown **with a plain-English reason**.

- **BMR** (Mifflin-St Jeor) → **TDEE** = BMR × activity factor.
- **Calorie target** = TDEE − deficit. For a lean recomp cut we use a **moderate ~20% deficit**
  capped so weekly loss ≈ **0.5–0.75% of bodyweight** (≈0.4–0.55 kg/wk at 70 kg) — fast enough
  to see change, slow enough to keep muscle. Avoids the "skinny" outcome the user fears.
- **Protein** = max(user's 140 g, **1.8–2.2 g/kg target bodyweight**) to protect muscle in a deficit.
- **Fat** = ~0.8 g/kg (hormonal floor). **Carbs** = remaining calories (fuel training).
- **Water** = 5 L default (user preference; editable).
- **Steps** = 10,000 default (editable) — primary non-training fat-loss lever.
- **Sleep** = 7.5–9 h (recovery + appetite regulation).
- **Weight-loss rate** = target kg/week derived above, used by the coach to detect too-fast / stall.

Each target card on the "Your Plan" screen explains the *why*.

---

## 6. Screens & User Flows

### 6.1 Onboarding (first launch only)
A conversational, multi-step interview (one question group per step, progress bar, back/next):
1. Welcome → 2. Personal data → 3. Goals → 4. Lifestyle → 5. Nutrition prefs →
6. Training (split, favorite/disliked exercises, weak/strong parts, injuries) →
7. Cardio → 8. Habits (water/sleep/stress) → 9. **Your Plan** (computed targets + reasons) → Enter app.
Pre-filled with the user's known details so it feels personal from question one.

### 6.2 Daily Dashboard (home)
The heart of the app. Single screen, sections:
- **Header**: greeting, date, today's day-type (e.g. "PUSH DAY"), big **Daily Score** ring.
- **Today's Workout** card: the template for today, quick "Start Workout".
- **Daily Checklist**: auto-generated, each toggles & feeds the score.
- **Metric rings/bars**: Calories, Protein, Water, Steps, Sleep — live vs target.
- **Coach insight of the day**: top recommendation from the rules engine.
- **Streak + quick stats**.

### 6.3 Workout
Templates, exercise DB, start/log a session (sets/reps/weight/RPE/rest/notes), shows
**previous performance** + **suggested progression** per exercise, history, PRs, volume charts.

### 6.4 Diet
Flexible logging only. Search seeded foods (Indian staples) or add custom; pick meal
category; live totals vs calorie/macro targets with rings. No meal plans.

### 6.5 Water / Steps / Sleep
Quick-add water (+250/+500/+1L), step entry, sleep (bed/wake → hours, quality → sleep score),
each with weekly/monthly averages & trend charts.

### 6.6 Body
Log weight, waist, body fat, progress photos; trend charts with moving averages.

### 6.7 Analytics
Weekly / Monthly / Quarterly reviews: adherence % for every pillar, weight trend,
volume trend, summaries.

### 6.8 Coach
Full feed of prioritized insights + the logic behind each.

### 6.9 Settings
Edit all targets & split, manage exercise/food DB, **export/import JSON backup**, reset.

---

## 7. Daily Score & Gamification
Daily score = weighted completion of checklist pillars (workout, protein, calories, water,
steps, sleep, recovery, photo) → 0–100. Weekly/monthly = averages. **Streaks** for
consecutive ≥ target days. **Achievements** for milestones (first PR, 7-day streak, 5 kg lost,
100 workouts, etc.). Professional tone — no badges-for-kids.

## 8. AI Coach (rules engine)
Analyzes rolling windows and emits ranked insights, e.g.:
- weight dropping > target rate → "eat more, you're losing too fast / risking muscle"
- 14-day weight stall while adherent → "drop calories ~150 or add 1–2k steps"
- protein < 90% target over 5 days → warn
- sleep < 6.5 h trend → recovery guidance
- training volume/e1RM dropping → fatigue/under-eating flag
- progressive overload ready → "add weight/reps on X"
Each insight has severity, message, and reasoning.

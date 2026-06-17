# 🔥 FORGE — Personal Fitness Operating System

A premium, **fully-local** fitness transformation system. No accounts. No login.
No cloud. No subscriptions. Everything runs on your PC and all data stays on your
device (in the browser's IndexedDB). Built to be opened every single day.

> Designed around one principle: **everything important lives on a single Daily Dashboard.**

![dark](https://img.shields.io/badge/theme-dark%20%2F%20premium-FF6B2C) ![local](https://img.shields.io/badge/data-100%25%20local-34D399)

---

## What's inside

| Module | What it does |
|---|---|
| 🎯 **Onboarding** | A conversational coaching interview that builds a plan around *you* and explains every target. |
| 📊 **Daily Dashboard** | Today's workout, auto checklist, live metric rings (calories/protein/water/steps/sleep), daily score, streak & the coach's top focus — all on one screen. |
| 🏋️ **Workout** | Push/Pull/Legs templates, full exercise library, set/rep/weight/RPE logging, **progressive-overload suggestions**, PRs (est. 1RM), volume trends & history. |
| 🍱 **Diet** | Flexible food logging only — *no forced meal plans*. Indian food database, custom foods, live macros vs target. |
| 💧 **Water / 👟 Steps / 😴 Sleep** | Quick-add tracking, sleep score, weekly/monthly averages and trend charts. |
| 📉 **Body** | Weight, waist, body-fat, progress photos, trend charts with goal lines. |
| 📈 **Analytics** | Weekly / Monthly / Quarterly reviews: adherence radar, weight trend, volume trend. |
| 🧠 **AI Coach** | A local rules engine that analyzes your data and gives ranked, reasoned recommendations (too-fast loss, plateaus, low protein, poor sleep, dropping performance…). |
| 🏆 **Gamification** | Daily/weekly scores, streaks, milestones & achievements — professional, not childish. |
| ⚙️ **Settings** | Edit every target, manage the split, **export/import a JSON backup**, reset. |

---

## Run it

Requirements: **Node 18+**.

```bash
npm install
npm run dev
```

Then open the URL it prints (defaults to http://localhost:5180). The first launch
runs onboarding; after that you land on your Daily Dashboard.

### Build a static version
```bash
npm run build && npm run preview
```
The `dist/` folder is a fully static app you can host anywhere or open locally.

---

## Your data

- Stored locally in the browser's **IndexedDB** — it never leaves your machine.
- Back it up anytime via **Settings → Export** (downloads a JSON file).
- Restore via **Settings → Import**.

---

## Tech

Vite · React · TypeScript · Tailwind CSS · Dexie (IndexedDB) · Zustand · Recharts · Framer Motion.

See [`DESIGN.md`](./DESIGN.md) for the full product spec, schema, flows and the reasoning behind every decision.

---

*Forge the body. Own the data.*

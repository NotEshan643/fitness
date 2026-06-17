import type { Profile, CoachInsight } from "@/types";
import type { RangeData } from "./analytics";
import { adherence, weightTrend, volumeBySession } from "./analytics";
import { macroTotals } from "./score";

/**
 * The FORGE coach: a deterministic rules engine encoding strength & nutrition
 * heuristics. It analyses rolling windows and returns ranked insights.
 */
export function runCoach(p: Profile, last14: RangeData, last7: RangeData): CoachInsight[] {
  const out: CoachInsight[] = [];
  const t = p.targets;
  const targetWeekly = t.lossRatePerWeek; // negative when cutting
  const cutting = targetWeekly < 0;

  // ---- Weight rate analysis ----
  const trend = weightTrend(last14);
  if (trend.points.length >= 4) {
    const actual = trend.slopePerWeek;
    if (cutting) {
      if (actual <= targetWeekly * 1.6) {
        out.push({
          id: "weight-too-fast", severity: "warn", category: "nutrition",
          title: "You're losing weight too fast",
          message: `You're dropping ~${Math.abs(actual).toFixed(2)} kg/week vs a target of ${Math.abs(targetWeekly).toFixed(2)}. Add ~150–200 kcal/day (mostly carbs).`,
          reason: `Losing faster than ~0.75% bodyweight/week risks muscle loss and strength drops, the opposite of the lean-athletic goal.`,
        });
      } else if (actual >= -0.05 && trend.points.length >= 7) {
        out.push({
          id: "weight-stall", severity: "info", category: "nutrition",
          title: "Fat loss has stalled",
          message: `Weight has held flat for ~2 weeks. If adherence is high, cut ~150 kcal/day or add 1,500–2,000 steps.`,
          reason: `A true plateau (with good adherence) means TDEE has adapted; a small nudge restarts progress without crashing intake.`,
        });
      } else {
        out.push({
          id: "weight-ontrack", severity: "good", category: "bodycomp",
          title: "Fat loss is on track",
          message: `Trending ~${Math.abs(actual).toFixed(2)} kg/week — right in the muscle-sparing zone. Hold the course.`,
          reason: `Your loss rate matches the target window of 0.5–0.75% bodyweight/week.`,
        });
      }
    }
  }

  // ---- Protein adherence (7d) ----
  const ad7 = adherence(p, last7);
  if (ad7.protein > 0 && ad7.protein < 0.9) {
    out.push({
      id: "protein-low", severity: "warn", category: "nutrition",
      title: "Protein is running low",
      message: `You've averaged ${Math.round(ad7.protein * 100)}% of your ${t.protein}g target this week. Add a shake, curd, eggs or soya to close the gap.`,
      reason: `In a deficit, protein is the single biggest lever for keeping muscle. Consistently under-eating it erodes your physique.`,
    });
  } else if (ad7.protein >= 0.95) {
    out.push({
      id: "protein-good", severity: "good", category: "nutrition",
      title: "Protein dialed in",
      message: `Averaging ${Math.round(ad7.protein * 100)}% of target — excellent for holding muscle while cutting.`,
      reason: `High protein adherence is the strongest predictor of muscle retention in a cut.`,
    });
  }

  // ---- Sleep (7d) ----
  let sleepVals: number[] = [];
  last7.dates.forEach((d) => {
    const h = last7.metricsByDate.get(d)?.sleepHours;
    if (h) sleepVals.push(h);
  });
  if (sleepVals.length >= 3) {
    const avg = sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length;
    if (avg < 6.5) {
      out.push({
        id: "sleep-low", severity: "bad", category: "recovery",
        title: "You're under-sleeping",
        message: `~${avg.toFixed(1)} h/night average. Aim for ${t.sleepMin}h+. Try a fixed wind-down time and cut screens 30 min before bed.`,
        reason: `Short sleep raises hunger hormones, lowers training output and accelerates muscle loss in a deficit.`,
      });
    }
  }

  // ---- Steps (7d) ----
  if (ad7.steps > 0 && ad7.steps < 0.6) {
    out.push({
      id: "steps-low", severity: "info", category: "consistency",
      title: "Step count is low",
      message: `Only ~${Math.round(ad7.steps * 100)}% of your ${t.steps.toLocaleString()} goal. Steps burn fat without taxing recovery — a daily walk goes a long way.`,
      reason: `NEAT (non-exercise activity) is a major, easily-controlled component of daily energy expenditure.`,
    });
  }

  // ---- Training volume trend ----
  const vols = volumeBySession(last14.sessions);
  if (vols.length >= 4) {
    const half = Math.floor(vols.length / 2);
    const early = avg(vols.slice(0, half).map((v) => v.volume));
    const late = avg(vols.slice(half).map((v) => v.volume));
    if (late < early * 0.85) {
      out.push({
        id: "volume-drop", severity: "warn", category: "training",
        title: "Gym performance is dropping",
        message: `Training volume is down ~${Math.round((1 - late / early) * 100)}% recently. Likely under-recovery — check sleep, protein and whether your deficit is too aggressive.`,
        reason: `Falling volume/e1RM while cutting usually signals fatigue, under-eating or poor sleep rather than a need to train harder.`,
      });
    } else if (late > early * 1.05) {
      out.push({
        id: "volume-up", severity: "good", category: "training",
        title: "Strength is climbing",
        message: `Training volume is up ~${Math.round((late / early - 1) * 100)}% — you're getting stronger even while leaning out. Textbook recomposition.`,
        reason: `Rising performance in a deficit is the clearest sign you're keeping (or building) muscle.`,
      });
    }
  }

  // ---- Calorie adherence ----
  if (ad7.calories > 0 && ad7.calories < 0.5) {
    out.push({
      id: "cal-inconsistent", severity: "info", category: "nutrition",
      title: "Calories are inconsistent",
      message: `You've hit your calorie window on ${Math.round(ad7.calories * 100)}% of logged days. Consistency beats perfection — aim to land in range most days.`,
      reason: `Day-to-day adherence drives the weekly average that actually determines fat loss.`,
    });
  }

  // ---- Fallback motivator ----
  if (out.length === 0) {
    out.push({
      id: "keep-logging", severity: "info", category: "consistency",
      title: "Keep feeding the system",
      message: `Log a few more days of weight, food and training and your coach will start spotting trends and tuning your plan.`,
      reason: `The engine needs ~1–2 weeks of data to detect reliable trends.`,
    });
  }

  const rank = { bad: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export { macroTotals };

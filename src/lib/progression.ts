import type { Session, SetLog } from "@/types";

/** Epley estimated 1-rep max. */
export function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function bestE1rm(sets: SetLog[]): number {
  return sets.reduce((m, s) => Math.max(m, e1rm(s.weight, s.reps)), 0);
}

export function topSet(sets: SetLog[]): SetLog | undefined {
  return [...sets].sort((a, b) => e1rm(b.weight, b.reps) - e1rm(a.weight, a.reps))[0];
}

export function sessionVolume(s: Session): number {
  return s.entries.reduce(
    (a, e) => a + e.sets.reduce((sa, st) => sa + st.weight * st.reps, 0),
    0
  );
}

export interface ProgressionHint {
  text: string;
  prev?: string;
}

/**
 * Suggest the next progression for an exercise given its most recent
 * completed performance. Double-progression model.
 */
export function suggestProgression(
  exerciseId: number,
  history: Session[],
  targetReps: string
): ProgressionHint {
  const prev = findLastEntry(exerciseId, history);
  if (!prev || prev.sets.length === 0) {
    return { text: "First time — pick a weight you can control for all sets." };
  }
  const top = topSet(prev.sets);
  if (!top) return { text: "Log your working sets to get suggestions." };

  const [lo, hi] = parseRepRange(targetReps);
  const prevStr = `${top.weight}kg × ${top.reps}`;

  // If they hit the top of the rep range on the top set, add load.
  if (top.reps >= hi) {
    const inc = top.weight >= 60 ? 5 : 2.5;
    return {
      text: `Add weight: try ${top.weight + inc}kg for ${lo}–${hi} reps. You hit the top of the range last time.`,
      prev: prevStr,
    };
  }
  // Otherwise add a rep at the same load.
  if (top.reps < hi) {
    return {
      text: `Keep ${top.weight}kg and beat ${top.reps} reps (aim ${Math.min(top.reps + 1, hi)}). Add load once you reach ${hi}.`,
      prev: prevStr,
    };
  }
  return { text: `Match or beat ${prevStr}.`, prev: prevStr };
}

export function findLastEntry(exerciseId: number, history: Session[]) {
  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const s of sorted) {
    const e = s.entries.find((x) => x.exerciseId === exerciseId && x.sets.length);
    if (e) return e;
  }
  return undefined;
}

function parseRepRange(r: string): [number, number] {
  const m = r.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return [+m[1], +m[2]];
  const single = parseInt(r, 10);
  return Number.isFinite(single) ? [single, single] : [8, 12];
}

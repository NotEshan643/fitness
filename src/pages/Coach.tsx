import { Brain, Lightbulb, AlertTriangle, CheckCircle2, Info, Dumbbell, Apple, Moon, Activity, Scale } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader, Empty } from "@/components/ui";
import { runCoach } from "@/lib/coach";
import type { CoachInsight } from "@/types";

const SEV = {
  good: { icon: CheckCircle2, ring: "border-good/40 bg-good/10", text: "text-good", label: "On Track" },
  info: { icon: Info, ring: "border-info/40 bg-info/10", text: "text-info", label: "Note" },
  warn: { icon: Lightbulb, ring: "border-warn/40 bg-warn/10", text: "text-warn", label: "Adjust" },
  bad: { icon: AlertTriangle, ring: "border-bad/40 bg-bad/10", text: "text-bad", label: "Attention" },
};
const CAT_ICON: Record<CoachInsight["category"], any> = {
  nutrition: Apple, training: Dumbbell, recovery: Moon, bodycomp: Scale, consistency: Activity,
};

export default function Coach() {
  const profile = useStore((s) => s.profile)!;
  const range14 = useRangeData(14);
  const range7 = useRangeData(7);

  if (!range14 || !range7) return null;
  const insights = runCoach(profile, range14, range7);

  return (
    <div>
      <PageHeader title="AI Coach" subtitle="Your data, analyzed continuously — like a coach who never sleeps." />

      <Card className="mb-6 flex items-start gap-4 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 shadow-glow">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-white">Coach's Briefing</h2>
          <p className="mt-1 text-sm text-steel-400">
            I look at the last 1–2 weeks of your weight, nutrition, training, sleep and steps,
            then surface what matters most — ranked by urgency. Every call comes with the reasoning behind it.
          </p>
        </div>
      </Card>

      {insights.length === 0 ? (
        <Empty title="Not enough data yet" hint="Keep logging — insights appear once trends emerge." />
      ) : (
        <div className="space-y-3">
          {insights.map((ins) => {
            const sev = SEV[ins.severity];
            const Cat = CAT_ICON[ins.category];
            return (
              <Card key={ins.id} className={`border p-5 ${sev.ring}`}>
                <div className="flex items-start gap-4">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900/50 ${sev.text}`}>
                    <sev.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${sev.text}`}>{sev.label}</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-ink-900/60 px-2 py-0.5 text-[10px] font-semibold text-steel-400">
                        <Cat className="h-3 w-3" /> {ins.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-white">{ins.title}</h3>
                    <p className="mt-1 text-sm text-steel-300">{ins.message}</p>
                    <div className="mt-2 rounded-lg border border-line bg-ink-900/40 px-3 py-2 text-xs text-steel-500">
                      <span className="font-semibold text-steel-400">Why: </span>{ins.reason}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

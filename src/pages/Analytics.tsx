import { useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { Beef, Flame, Droplets, Footprints, Moon, Dumbbell } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader } from "@/components/ui";
import { Ring } from "@/components/ui/Ring";
import { adherence, weightTrend, volumeBySession, adherenceLabel } from "@/lib/analytics";
import { shortDate } from "@/lib/date";

const RANGES = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
];

const ICONS = [
  { key: "workout", label: "Workout", icon: Dumbbell, color: "#FF6B2C" },
  { key: "protein", label: "Protein", icon: Beef, color: "#34D399" },
  { key: "calories", label: "Calories", icon: Flame, color: "#FBBF24" },
  { key: "water", label: "Water", icon: Droplets, color: "#60A5FA" },
  { key: "steps", label: "Steps", icon: Footprints, color: "#A78BFA" },
  { key: "sleep", label: "Sleep", icon: Moon, color: "#F472B6" },
] as const;

export default function Analytics() {
  const profile = useStore((s) => s.profile)!;
  const [days, setDays] = useState(7);
  const range = useRangeData(days);

  if (!range) return null;
  const ad = adherence(profile, range);
  const trend = weightTrend(range);
  const vols = volumeBySession(range.sessions).map((v) => ({ date: shortDate(v.date), volume: v.volume }));
  const radarData = ICONS.map((i) => ({ metric: i.label, value: Math.round((ad as any)[i.key] * 100) }));
  const overall = Math.round((ICONS.reduce((a, i) => a + (ad as any)[i.key], 0) / ICONS.length) * 100);

  const weightSeries = range.dates
    .map((d) => ({ date: d, weight: range.metricsByDate.get(d)?.weight }))
    .filter((p) => p.weight) as { date: string; weight: number }[];

  return (
    <div>
      <PageHeader
        title="Analytics & Reviews"
        subtitle="Zoom out and see the patterns that drive results."
        action={
          <div className="flex gap-1 rounded-xl border border-line bg-ink-800 p-1">
            {RANGES.map((r) => (
              <button key={r.days} onClick={() => setDays(r.days)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${days === r.days ? "bg-ember-500 text-white" : "text-steel-400 hover:text-white"}`}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="flex flex-col items-center p-6">
          <Ring progress={overall / 100} size={150} stroke={12} color="#FF6B2C">
            <span className="text-4xl font-black text-white">{overall}%</span>
            <span className="stat-label">overall</span>
          </Ring>
          <div className="mt-2 text-sm font-semibold text-steel-300">{adherenceLabel(overall / 100)} adherence</div>
          <div className="mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#2E3848" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#7A8AA3", fontSize: 11 }} />
                <Radar dataKey="value" stroke="#FF6B2C" fill="#FF6B2C" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ICONS.map((i) => {
              const v = (ad as any)[i.key] as number;
              return (
                <Card key={i.key} className="p-4">
                  <div className="flex items-center justify-between">
                    <i.icon className="h-4 w-4" style={{ color: i.color }} />
                    <span className="text-lg font-extrabold text-white">{Math.round(v * 100)}%</span>
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-white">{i.label}</div>
                  <div className="text-[11px] text-steel-500">{adherenceLabel(v)}</div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-900">
                    <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: i.color }} />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 font-bold text-white">Weight Trend</h2>
          <p className="mb-3 text-xs text-steel-500">
            {trend.slopePerWeek >= 0 ? "Up" : "Down"} {Math.abs(trend.slopePerWeek).toFixed(2)} kg/week ·
            target {Math.abs(profile.targets.lossRatePerWeek).toFixed(2)} kg/week
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightSeries} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke="#5C6B82" fontSize={11} />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#5C6B82" fontSize={11} />
                <Tooltip contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#34D399" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-bold text-white">Training Volume</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vols} margin={{ left: -8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222A38" vertical={false} />
                <XAxis dataKey="date" stroke="#5C6B82" fontSize={11} />
                <YAxis stroke="#5C6B82" fontSize={11} />
                <Tooltip contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="volume" fill="#FF6B2C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

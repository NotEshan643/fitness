import { Droplets, Plus, Minus } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { useStore } from "@/store/useStore";
import { useDayBundle } from "@/hooks/useDayData";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader, Stat } from "@/components/ui";
import { Ring } from "@/components/ui/Ring";
import { weekday, shortDate } from "@/lib/date";

const QUICK = [0.25, 0.5, 1];

export default function Water() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const addWater = useStore((s) => s.addWater);
  const upsert = useStore((s) => s.upsertMetrics);
  const toast = useStore((s) => s.toast);
  const bundle = useDayBundle(today);
  const range = useRangeData(30);

  if (!bundle || !range) return null;
  const t = profile.targets.water;
  const cur = bundle.metrics?.water ?? 0;

  const series = range.dates.map((d) => ({ date: d, value: range.metricsByDate.get(d)?.water ?? 0 }));
  const last7 = series.slice(-7);
  const avg7 = avg(last7.map((s) => s.value));
  const avg30 = avg(series.filter((s) => s.value > 0).map((s) => s.value));

  const add = async (l: number) => { await addWater(today, l); };

  return (
    <div>
      <PageHeader title="Hydration" subtitle={`Target: ${t} L per day`} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center p-6">
          <Ring progress={cur / t} size={180} stroke={14} color="#60A5FA">
            <Droplets className="mb-1 h-6 w-6 text-info" />
            <span className="text-4xl font-black text-white">{cur.toFixed(2)}</span>
            <span className="stat-label">of {t} L</span>
          </Ring>
          <div className="mt-6 grid w-full grid-cols-3 gap-2">
            {QUICK.map((q) => (
              <button key={q} onClick={() => add(q)} className="btn-ghost flex-col gap-0.5 py-3">
                <Plus className="h-4 w-4 text-info" />
                <span>{q < 1 ? `${q * 1000}ml` : `${q}L`}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex w-full gap-2">
            <button onClick={() => add(-0.25)} className="btn-soft flex-1"><Minus className="h-4 w-4" /> 250ml</button>
            <button onClick={async () => { await upsert(today, { water: 0 }); toast("Reset", "info"); }} className="btn-soft flex-1">Reset</button>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4"><Stat label="Today" value={`${cur.toFixed(1)}L`} sub={`${Math.round((cur / t) * 100)}% of goal`} accent="text-info" /></Card>
            <Card className="p-4"><Stat label="7-Day Avg" value={`${avg7.toFixed(1)}L`} /></Card>
            <Card className="p-4"><Stat label="30-Day Avg" value={`${avg30.toFixed(1)}L`} /></Card>
          </div>
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-white">Last 7 Days</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
                  <XAxis dataKey="date" tickFormatter={weekday} stroke="#5C6B82" fontSize={11} />
                  <YAxis stroke="#5C6B82" fontSize={11} />
                  <Tooltip labelFormatter={shortDate} contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} />
                  <ReferenceLine y={t} stroke="#34D399" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="value" stroke="#60A5FA" strokeWidth={2.5} fill="url(#w)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

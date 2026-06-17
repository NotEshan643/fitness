import { useState } from "react";
import { Footprints, Plus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { useStore } from "@/store/useStore";
import { useDayBundle } from "@/hooks/useDayData";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader, Stat } from "@/components/ui";
import { Ring } from "@/components/ui/Ring";
import { weekday, shortDate } from "@/lib/date";

export default function Steps() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const upsert = useStore((s) => s.upsertMetrics);
  const toast = useStore((s) => s.toast);
  const bundle = useDayBundle(today);
  const range = useRangeData(30);
  const [input, setInput] = useState("");

  if (!bundle || !range) return null;
  const t = profile.targets.steps;
  const cur = bundle.metrics?.steps ?? 0;

  const series = range.dates.map((d) => ({ date: d, value: range.metricsByDate.get(d)?.steps ?? 0 }));
  const last7 = series.slice(-7);
  const avg7 = avg(last7.map((s) => s.value));
  const avg30 = avg(series.filter((s) => s.value > 0).map((s) => s.value));

  const save = async (v: number) => { await upsert(today, { steps: Math.max(0, v) }); };

  return (
    <div>
      <PageHeader title="Steps" subtitle={`Target: ${t.toLocaleString()} steps per day`} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center p-6">
          <Ring progress={cur / t} size={180} stroke={14} color="#FBBF24">
            <Footprints className="mb-1 h-6 w-6 text-warn" />
            <span className="text-3xl font-black text-white">{cur.toLocaleString()}</span>
            <span className="stat-label">of {t.toLocaleString()}</span>
          </Ring>
          <div className="mt-6 flex w-full gap-2">
            <input
              type="number" className="input text-center" placeholder="Enter steps"
              value={input} onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn-primary" onClick={async () => { if (input) { await save(+input); toast("Steps updated"); setInput(""); } }}>Set</button>
          </div>
          <div className="mt-2 grid w-full grid-cols-3 gap-2">
            {[1000, 2500, 5000].map((q) => (
              <button key={q} onClick={() => save(cur + q)} className="btn-ghost py-2 text-xs"><Plus className="h-3.5 w-3.5" />{q / 1000}k</button>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4"><Stat label="Today" value={cur.toLocaleString()} sub={`${Math.round((cur / t) * 100)}% of goal`} accent="text-warn" /></Card>
            <Card className="p-4"><Stat label="7-Day Avg" value={Math.round(avg7).toLocaleString()} /></Card>
            <Card className="p-4"><Stat label="30-Day Avg" value={Math.round(avg30).toLocaleString()} /></Card>
          </div>
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-white">Last 7 Days</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7} margin={{ left: -8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222A38" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={weekday} stroke="#5C6B82" fontSize={11} />
                  <YAxis stroke="#5C6B82" fontSize={11} />
                  <Tooltip labelFormatter={shortDate} contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <ReferenceLine y={t} stroke="#34D399" strokeDasharray="4 4" />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {last7.map((d, i) => <Cell key={i} fill={d.value >= t ? "#34D399" : "#FBBF24"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

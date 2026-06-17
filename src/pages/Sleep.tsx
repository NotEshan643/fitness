import { useState, useEffect } from "react";
import { Moon, Bed, Sunrise } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea,
} from "recharts";
import { useStore } from "@/store/useStore";
import { useDayBundle } from "@/hooks/useDayData";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader, Stat } from "@/components/ui";
import { Ring } from "@/components/ui/Ring";
import { sleepScore } from "@/lib/score";
import { weekday, shortDate } from "@/lib/date";

/** Hours between bed and wake (handles overnight). */
function hoursBetween(bed: string, wake: string): number {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return +(mins / 60).toFixed(1);
}

export default function Sleep() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const upsert = useStore((s) => s.upsertMetrics);
  const toast = useStore((s) => s.toast);
  const bundle = useDayBundle(today);
  const range = useRangeData(30);

  const [bed, setBed] = useState("23:30");
  const [wake, setWake] = useState("07:30");
  const [quality, setQuality] = useState(3);

  useEffect(() => {
    if (bundle?.metrics) {
      setBed(bundle.metrics.bedTime ?? "23:30");
      setWake(bundle.metrics.wakeTime ?? "07:30");
      setQuality(bundle.metrics.sleepQuality ?? 3);
    }
  }, [bundle?.date]);

  if (!bundle || !range) return null;
  const hours = hoursBetween(bed, wake);
  const score = sleepScore(profile, { date: today, sleepHours: hours, sleepQuality: quality });
  const { sleepMin, sleepMax } = profile.targets;

  const series = range.dates.map((d) => ({ date: d, value: range.metricsByDate.get(d)?.sleepHours ?? 0 }));
  const last7 = series.slice(-7);
  const avg7 = avg(last7.filter((s) => s.value > 0).map((s) => s.value));

  const save = async () => {
    await upsert(today, { bedTime: bed, wakeTime: wake, sleepHours: hours, sleepQuality: quality });
    toast("Sleep logged 😴");
  };

  return (
    <div>
      <PageHeader title="Sleep & Recovery" subtitle={`Target: ${sleepMin}–${sleepMax} hours`} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center p-6">
          <Ring progress={score / 100} size={180} stroke={14} color="#A78BFA">
            <Moon className="mb-1 h-6 w-6 text-violet-400" />
            <span className="text-4xl font-black text-white">{hours}</span>
            <span className="stat-label">hours · {score} score</span>
          </Ring>
          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            <label className="block">
              <span className="stat-label mb-1 flex items-center gap-1"><Bed className="h-3 w-3" /> Bed</span>
              <input type="time" className="input" value={bed} onChange={(e) => setBed(e.target.value)} />
            </label>
            <label className="block">
              <span className="stat-label mb-1 flex items-center gap-1"><Sunrise className="h-3 w-3" /> Wake</span>
              <input type="time" className="input" value={wake} onChange={(e) => setWake(e.target.value)} />
            </label>
          </div>
          <div className="mt-3 w-full">
            <span className="stat-label">Quality: {["", "Poor", "Fair", "Okay", "Good", "Great"][quality]}</span>
            <input type="range" min={1} max={5} value={quality} onChange={(e) => setQuality(+e.target.value)} className="mt-1 w-full accent-violet-500" />
          </div>
          <button className="btn-primary mt-4 w-full" onClick={save}>Log Sleep</button>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4"><Stat label="Last Night" value={`${hours}h`} accent="text-violet-400" /></Card>
            <Card className="p-4"><Stat label="7-Day Avg" value={`${avg7.toFixed(1)}h`} /></Card>
            <Card className="p-4"><Stat label="Sleep Score" value={score} sub="duration × quality" /></Card>
          </div>
          <Card className="p-5">
            <h2 className="mb-3 font-bold text-white">Last 7 Nights</h2>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="sl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
                  <XAxis dataKey="date" tickFormatter={weekday} stroke="#5C6B82" fontSize={11} />
                  <YAxis stroke="#5C6B82" fontSize={11} domain={[0, 10]} />
                  <Tooltip labelFormatter={shortDate} contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} />
                  <ReferenceArea y1={sleepMin} y2={sleepMax} fill="#34D399" fillOpacity={0.08} />
                  <Area type="monotone" dataKey="value" stroke="#A78BFA" strokeWidth={2.5} fill="url(#sl)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-center text-xs text-steel-500">Green band = your {sleepMin}–{sleepMax}h target window</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

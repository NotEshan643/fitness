import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Scale, Camera, Trash2, TrendingDown, Ruler, Percent } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { db } from "@/db/db";
import { useStore } from "@/store/useStore";
import { useDayBundle } from "@/hooks/useDayData";
import { useRangeData } from "@/hooks/useRangeData";
import { Card, PageHeader, Stat, Empty, SectionTitle } from "@/components/ui";
import { weightTrend } from "@/lib/analytics";
import { shortDate, prettyDate } from "@/lib/date";
import type { ProgressPhoto } from "@/types";

export default function Body() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const upsert = useStore((s) => s.upsertMetrics);
  const toast = useStore((s) => s.toast);
  const bundle = useDayBundle(today);
  const range = useRangeData(90);
  const fileRef = useRef<HTMLInputElement>(null);

  const photos = useLiveQuery(() => db.photos.orderBy("date").reverse().toArray(), []) ?? [];

  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bf, setBf] = useState("");

  if (!bundle || !range) return null;
  const t = profile.targets;
  const m = bundle.metrics;

  const wPoints = range.dates
    .map((d) => ({ date: d, weight: range.metricsByDate.get(d)?.weight }))
    .filter((p) => p.weight) as { date: string; weight: number }[];
  const trend = weightTrend(range);
  const latest = wPoints[wPoints.length - 1]?.weight ?? profile.weightKg;
  const start = wPoints[0]?.weight ?? profile.weightKg;
  const change = +(latest - start).toFixed(1);

  const waistPoints = range.dates
    .map((d) => ({ date: d, waist: range.metricsByDate.get(d)?.waist }))
    .filter((p) => p.waist) as { date: string; waist: number }[];

  const saveMetrics = async () => {
    const patch: any = {};
    if (weight) patch.weight = +weight;
    if (waist) patch.waist = +waist;
    if (bf) patch.bodyFat = +bf;
    if (Object.keys(patch).length === 0) return;
    await upsert(today, patch);
    toast("Body stats logged");
    setWeight(""); setWaist(""); setBf("");
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const photo: ProgressPhoto = { date: today, dataUrl: reader.result as string, weight: m?.weight };
      await db.photos.add(photo);
      toast("Photo saved 📸");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <PageHeader title="Body Transformation" subtitle={`Goal: ${t.weightGoal} kg · ${profile.weightKg} kg start`} />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4"><Stat label="Current Weight" value={`${latest} kg`} sub={`${change <= 0 ? "" : "+"}${change} kg total`} accent={change <= 0 ? "text-good" : "text-warn"} /></Card>
        <Card className="p-4"><Stat label="To Goal" value={`${Math.max(0, +(latest - t.weightGoal).toFixed(1))} kg`} sub={`target ${t.weightGoal} kg`} accent="text-ember-400" /></Card>
        <Card className="p-4"><Stat label="Weekly Trend" value={`${trend.slopePerWeek >= 0 ? "+" : ""}${trend.slopePerWeek.toFixed(2)}`} sub="kg / week" accent={trend.slopePerWeek <= 0 ? "text-good" : "text-warn"} /></Card>
        <Card className="p-4"><Stat label="Body Fat" value={m?.bodyFat ? `${m.bodyFat}%` : `~${profile.bodyFat}%`} sub="estimated" /></Card>
      </div>

      <Card className="my-6 p-4">
        <SectionTitle>Log Today's Measurements</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="block"><span className="stat-label flex items-center gap-1"><Scale className="h-3 w-3" /> Weight (kg)</span><input className="input mt-1" type="number" step={0.1} placeholder={`${latest}`} value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
          <label className="block"><span className="stat-label flex items-center gap-1"><Ruler className="h-3 w-3" /> Waist (cm)</span><input className="input mt-1" type="number" step={0.5} placeholder={m?.waist?.toString() ?? "—"} value={waist} onChange={(e) => setWaist(e.target.value)} /></label>
          <label className="block"><span className="stat-label flex items-center gap-1"><Percent className="h-3 w-3" /> Body Fat (%)</span><input className="input mt-1" type="number" step={0.1} placeholder={m?.bodyFat?.toString() ?? `${profile.bodyFat}`} value={bf} onChange={(e) => setBf(e.target.value)} /></label>
          <button className="btn-primary mt-auto" onClick={saveMetrics}>Save</button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle><span className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-good" /> Weight Trend</span></SectionTitle>
          {wPoints.length < 2 ? (
            <Empty title="Log a few weigh-ins" hint="Two or more entries unlock your trend line." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wPoints} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#5C6B82" fontSize={11} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#5C6B82" fontSize={11} />
                  <Tooltip labelFormatter={prettyDate} contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} />
                  <ReferenceLine y={t.weightGoal} stroke="#FF6B2C" strokeDasharray="4 4" label={{ value: "Goal", fill: "#FF6B2C", fontSize: 11, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="weight" stroke="#34D399" strokeWidth={2.5} dot={{ r: 3, fill: "#34D399" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle><span className="flex items-center gap-2"><Ruler className="h-4 w-4 text-info" /> Waist Trend</span></SectionTitle>
          {waistPoints.length < 2 ? (
            <Empty title="Track your waist" hint="Waist often moves even when the scale stalls — a great fat-loss signal." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waistPoints} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222A38" />
                  <XAxis dataKey="date" tickFormatter={shortDate} stroke="#5C6B82" fontSize={11} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#5C6B82" fontSize={11} />
                  <Tooltip labelFormatter={prettyDate} contentStyle={{ background: "#10141D", border: "1px solid #222A38", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="waist" stroke="#60A5FA" strokeWidth={2.5} dot={{ r: 3, fill: "#60A5FA" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <SectionTitle action={
          <button className="btn-soft px-3 py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
            <Camera className="h-3.5 w-3.5" /> Add Photo
          </button>
        }><span className="flex items-center gap-2"><Camera className="h-4 w-4 text-ember-400" /> Progress Photos</span></SectionTitle>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        {photos.length === 0 ? (
          <Empty icon={<Camera className="h-8 w-8" />} title="No photos yet" hint="Weekly photos in the same lighting are the most honest progress metric there is." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-line">
                <img src={p.dataUrl} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <div className="text-[11px] font-semibold text-white">{shortDate(p.date)}</div>
                  {p.weight && <div className="text-[10px] text-steel-300">{p.weight} kg</div>}
                </div>
                <button onClick={() => db.photos.delete(p.id!)} className="absolute right-1.5 top-1.5 hidden rounded-md bg-black/60 p-1 text-bad group-hover:block">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

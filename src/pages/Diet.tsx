import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Search, Plus, Trash2, UtensilsCrossed, Coffee, Sun, Moon, Cookie, X,
} from "lucide-react";
import { db } from "@/db/db";
import { useStore } from "@/store/useStore";
import { useDayBundle } from "@/hooks/useDayData";
import { Card, PageHeader, Empty, Pill } from "@/components/ui";
import { Ring } from "@/components/ui/Ring";
import { macroTotals } from "@/lib/score";
import type { Food, FoodLog, MealCategory } from "@/types";

const MEALS: { id: MealCategory; label: string; icon: any }[] = [
  { id: "breakfast", label: "Breakfast", icon: Coffee },
  { id: "lunch", label: "Lunch", icon: Sun },
  { id: "dinner", label: "Dinner", icon: Moon },
  { id: "snack", label: "Snacks", icon: Cookie },
];

export default function Diet() {
  const profile = useStore((s) => s.profile)!;
  const today = useStore((s) => s.today);
  const toast = useStore((s) => s.toast);
  const bundle = useDayBundle(today);
  const [pickerMeal, setPickerMeal] = useState<MealCategory | null>(null);

  if (!bundle) return null;
  const t = profile.targets;
  const totals = macroTotals(bundle.foodLogs);
  const logsByMeal = (m: MealCategory) => bundle.foodLogs.filter((l) => l.meal === m);

  const remove = async (id?: number) => { if (id) { await db.foodLogs.delete(id); toast("Removed", "info"); } };

  return (
    <div>
      <PageHeader title="Nutrition" subtitle="Track your own meals. Hit your targets. No forced diets." />

      {/* Macro summary */}
      <Card className="mb-6 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MacroRing label="Calories" value={totals.kcal} target={t.calories} color="#FF6B2C" unit="kcal" />
          <MacroRing label="Protein" value={totals.protein} target={t.protein} color="#34D399" unit="g" />
          <MacroRing label="Carbs" value={totals.carbs} target={t.carbs} color="#60A5FA" unit="g" />
          <MacroRing label="Fat" value={totals.fat} target={t.fat} color="#FBBF24" unit="g" />
        </div>
        <div className="mt-4 rounded-xl border border-line bg-ink-900/40 px-4 py-2.5 text-center text-sm">
          <span className="text-steel-400">Remaining today: </span>
          <span className="font-bold text-white">{Math.max(0, Math.round(t.calories - totals.kcal))} kcal</span>
          <span className="text-steel-500"> · </span>
          <span className="font-bold text-good">{Math.max(0, Math.round(t.protein - totals.protein))}g protein</span>
        </div>
      </Card>

      {/* Meals */}
      <div className="space-y-4">
        {MEALS.map((meal) => {
          const logs = logsByMeal(meal.id);
          const mt = macroTotals(logs);
          return (
            <Card key={meal.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <meal.icon className="h-4 w-4 text-ember-400" />
                  <span className="font-bold text-white">{meal.label}</span>
                  {logs.length > 0 && <Pill>{Math.round(mt.kcal)} kcal · {Math.round(mt.protein)}g P</Pill>}
                </div>
                <button className="btn-soft px-3 py-1.5 text-xs" onClick={() => setPickerMeal(meal.id)}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
              <div className="divide-y divide-line">
                {logs.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-steel-500">Nothing logged.</div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <div className="text-sm font-medium text-white">{l.name} {l.qty !== 1 && <span className="text-steel-500">×{l.qty}</span>}</div>
                        <div className="text-[11px] text-steel-500">
                          {Math.round(l.kcal * l.qty)} kcal · {Math.round(l.protein * l.qty)}P / {Math.round(l.carbs * l.qty)}C / {Math.round(l.fat * l.qty)}F
                        </div>
                      </div>
                      <button onClick={() => remove(l.id)} className="text-steel-600 hover:text-bad"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {pickerMeal && <FoodPicker meal={pickerMeal} date={today} onClose={() => setPickerMeal(null)} />}
    </div>
  );
}

function MacroRing({ label, value, target, color, unit }: { label: string; value: number; target: number; color: string; unit: string }) {
  return (
    <div className="flex flex-col items-center">
      <Ring progress={target ? value / target : 0} size={96} stroke={8} color={color}>
        <span className="text-lg font-extrabold text-white">{Math.round(value)}</span>
        <span className="text-[10px] text-steel-500">/ {target}{unit}</span>
      </Ring>
      <div className="mt-1.5 text-xs font-bold text-white">{label}</div>
    </div>
  );
}

function FoodPicker({ meal, date, onClose }: { meal: MealCategory; date: string; onClose: () => void }) {
  const toast = useStore((s) => s.toast);
  const foods = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [cf, setCf] = useState({ name: "", per: "1 serving", kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const filtered = foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  const logFood = async (food: Food, quantity: number) => {
    const log: FoodLog = {
      date, meal, name: food.name, qty: quantity,
      kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat,
    };
    await db.foodLogs.add(log);
    toast(`Added ${food.name}`);
  };

  const addCustom = async () => {
    if (!cf.name.trim()) return;
    const food: Food = { ...cf, isCustom: true };
    await db.foods.add(food);     // save to library for reuse
    await logFood(food, 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center" onClick={onClose}>
      <Card className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-bold text-white">Add to {meal}</span>
          <button onClick={onClose}><X className="h-5 w-5 text-steel-500" /></button>
        </div>

        {!custom ? (
          <>
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <Search className="h-4 w-4 text-steel-500" />
              <input autoFocus className="flex-1 bg-transparent text-sm text-white outline-none" placeholder="Search foods…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            {selected ? (
              <div className="space-y-3 p-4">
                <div className="rounded-xl border border-line bg-ink-900/50 p-3">
                  <div className="font-semibold text-white">{selected.name}</div>
                  <div className="text-xs text-steel-500">per {selected.per}: {selected.kcal} kcal · {selected.protein}P / {selected.carbs}C / {selected.fat}F</div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="stat-label">Servings</label>
                  <input type="number" step={0.5} min={0.5} value={qty} onChange={(e) => setQty(+e.target.value || 1)} className="input w-24 text-center" />
                  <div className="text-sm text-steel-300">= {Math.round(selected.kcal * qty)} kcal, {Math.round(selected.protein * qty)}g protein</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1" onClick={() => setSelected(null)}>Back</button>
                  <button className="btn-primary flex-1" onClick={async () => { await logFood(selected, qty); onClose(); }}>Add</button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                {filtered.map((f) => (
                  <button key={f.id ?? f.name} onClick={() => { setSelected(f); setQty(1); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-ink-700">
                    <div>
                      <div className="text-sm font-semibold text-white">{f.name}</div>
                      <div className="text-[11px] text-steel-500">per {f.per}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-ember-400">{f.kcal} kcal</div>
                      <div className="text-steel-500">{f.protein}g P</div>
                    </div>
                  </button>
                ))}
                <button onClick={() => setCustom(true)} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-ember-400 hover:bg-ink-700">
                  <Plus className="h-4 w-4" /> Create custom food
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 p-4">
            <input className="input" placeholder="Food name" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
            <input className="input" placeholder="Serving (e.g. 100g)" value={cf.per} onChange={(e) => setCf({ ...cf, per: e.target.value })} />
            <div className="grid grid-cols-4 gap-2">
              {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="stat-label">{k}</span>
                  <input type="number" className="input mt-1 px-2 text-center" value={(cf as any)[k] || ""} onChange={(e) => setCf({ ...cf, [k]: +e.target.value || 0 })} />
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn-ghost flex-1" onClick={() => setCustom(false)}>Back</button>
              <button className="btn-primary flex-1" onClick={addCustom}>Save & Add</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

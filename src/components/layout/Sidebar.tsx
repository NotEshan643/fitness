import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Droplets, Footprints,
  Moon, Scale, BarChart3, Brain, Settings, Flame,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/workout", label: "Workout", icon: Dumbbell },
  { to: "/diet", label: "Diet", icon: UtensilsCrossed },
  { to: "/water", label: "Water", icon: Droplets },
  { to: "/steps", label: "Steps", icon: Footprints },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/body", label: "Body", icon: Scale },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/coach", label: "Coach", icon: Brain },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ score }: { score: number }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-ink-850/80 px-4 py-6 backdrop-blur md:flex">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 shadow-glow">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-lg font-black leading-none tracking-tight text-white">FORGE</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-steel-500">Fitness OS</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
          >
            <n.icon className="h-[18px] w-[18px]" />
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 rounded-xl border border-line bg-ink-800 p-3">
        <div className="stat-label">Today's Score</div>
        <div className="mt-1 flex items-end gap-1">
          <span className="text-3xl font-black tabular-nums text-white">{score}</span>
          <span className="mb-1 text-sm text-steel-500">/ 100</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-ember-500 to-ember-400 transition-all duration-700"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

import { NavLink } from "react-router-dom";
import { LayoutDashboard, Dumbbell, UtensilsCrossed, BarChart3, Brain } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/workout", label: "Train", icon: Dumbbell },
  { to: "/diet", label: "Diet", icon: UtensilsCrossed },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/coach", label: "Coach", icon: Brain },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink-850/95 backdrop-blur md:hidden">
      {ITEMS.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
              isActive ? "text-ember-400" : "text-steel-500"
            }`
          }
        >
          <n.icon className="h-5 w-5" />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

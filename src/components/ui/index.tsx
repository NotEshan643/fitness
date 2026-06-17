import { motion } from "framer-motion";
import { type ReactNode } from "react";

export function Card({
  children, className = "", raised = false, ...rest
}: { children: ReactNode; className?: string; raised?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${raised ? "card-raised" : "card"} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-white">{children}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({
  value, color = "bg-ember-500", className = "",
}: { value: number; color?: string; className?: string }) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-ink-900/80 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${p * 100}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

export function Stat({
  label, value, sub, accent = "text-white",
}: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-steel-500">{sub}</div>}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-700 text-steel-300 border-line",
    good: "bg-good/15 text-good border-good/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    bad: "bg-bad/15 text-bad border-bad/30",
    info: "bg-info/15 text-info border-info/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-10 text-center">
      {icon && <div className="text-steel-500">{icon}</div>}
      <div className="text-sm font-semibold text-steel-300">{title}</div>
      {hint && <div className="max-w-xs text-xs text-steel-500">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-steel-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { useStore } from "@/store/useStore";

const ICON = { ok: CheckCircle2, info: Info, warn: AlertTriangle };
const TONE = { ok: "text-good", info: "text-info", warn: "text-warn" };

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="card-raised pointer-events-auto flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-white shadow-glow"
            >
              <Icon className={`h-4 w-4 ${TONE[t.kind]}`} />
              {t.text}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useChecklist } from "@/hooks/useDayData";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toasts } from "@/components/layout/Toasts";
import { Flame } from "lucide-react";

import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Workout from "@/pages/Workout";
import Diet from "@/pages/Diet";
import Water from "@/pages/Water";
import Steps from "@/pages/Steps";
import Sleep from "@/pages/Sleep";
import Body from "@/pages/Body";
import Analytics from "@/pages/Analytics";
import Coach from "@/pages/Coach";
import Settings from "@/pages/Settings";

function Splash() {
  return (
    <div className="grid h-screen place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-ember-400 to-ember-600 shadow-glow">
          <Flame className="h-7 w-7 text-white" />
        </div>
        <div className="text-sm font-semibold tracking-wide text-steel-400">Loading FORGE…</div>
      </div>
    </div>
  );
}

function Shell() {
  const location = useLocation();
  const today = useStore((s) => s.today);
  const { score } = useChecklist(today);

  return (
    <div className="flex min-h-screen">
      <Sidebar score={score} />
      <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workout" element={<Workout />} />
                <Route path="/diet" element={<Diet />} />
                <Route path="/water" element={<Water />} />
                <Route path="/steps" element={<Steps />} />
                <Route path="/sleep" element={<Sleep />} />
                <Route path="/body" element={<Body />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/coach" element={<Coach />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <MobileNav />
      <Toasts />
    </div>
  );
}

export default function App() {
  const { ready, profile, init } = useStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!ready) return <Splash />;
  if (!profile?.onboarded) return <><Onboarding /><Toasts /></>;
  return <Shell />;
}

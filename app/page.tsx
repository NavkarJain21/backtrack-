"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import LandingPage from "@/components/LandingPage";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default function Home() {
  const { roadmap } = useStore();
  const [hasHydrated, setHasHydrated] = useState(false);

  // Avoid hydration mismatch with localStorage persistence
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Loading Backtrack...</span>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return <LandingPage />;
  }

  return <DashboardShell />;
}

"use client";

import { useStore } from "@/lib/store";
import type { DashboardTab } from "@/lib/schemas";
import {
  LayoutDashboard,
  GitFork,
  Layers,
  FolderGit2,
  TrendingUp,
  User,
  Settings,
  Compass,
  Sparkles,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdjust: () => void;
}

const NAV_ITEMS: { id: DashboardTab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "roadmap", label: "Roadmap Graph", icon: GitFork, badge: "Interactive" },
  { id: "skills", label: "Skills Inventory", icon: Layers },
  { id: "projects", label: "Projects & Capstones", icon: FolderGit2 },
  { id: "progress", label: "Progress & Metrics", icon: TrendingUp },
  { id: "profile", label: "Career Profile", icon: User },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function DashboardSidebar({ isOpen, onClose, onOpenAdjust }: DashboardSidebarProps) {
  const { activeTab, setActiveTab, roadmap } = useStore();

  const handleSelectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900/95 lg:bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
              <Compass size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                  Backtrack
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Career Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Role Preview Card */}
        {roadmap && (
          <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Active Target Role
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate" title={roadmap.goal}>
              {roadmap.goal}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group",
                  isActive
                    ? "bg-blue-600/15 text-blue-300 border border-blue-500/30 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={16}
                    className={cn(
                      "transition-colors",
                      isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-300"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Adjustment Trigger */}
          <div className="pt-4 mt-4 border-t border-slate-800/80">
            <button
              onClick={() => {
                onOpenAdjust();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/60 text-purple-300 transition-all shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={15} className="text-purple-400" />
                <span>I already know...</span>
              </div>
              <ChevronRight size={14} className="text-purple-400/70" />
            </button>
          </div>
        </nav>

        {/* User Profile Footer (neutral until auth/profile exists) */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-slate-600 flex items-center justify-center text-slate-200">
              <User size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                Your Career Profile
              </div>
              <div className="text-[10px] text-slate-400 truncate">Local profile • No sign-in yet</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

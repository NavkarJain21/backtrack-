import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NodeStatus, RoadmapNode } from "./schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusColor(status: NodeStatus): string {
  switch (status) {
    case "locked":
      return "text-slate-500";
    case "available":
      return "text-blue-700";
    case "in_progress":
      return "text-amber-700";
    case "completed":
      return "text-emerald-700";
    case "known":
      return "text-violet-700";
    default:
      return "text-slate-500";
  }
}

export function getStatusBg(status: NodeStatus): string {
  switch (status) {
    case "locked":
      return "bg-slate-100 border-slate-300";
    case "available":
      return "bg-blue-50 border-blue-500";
    case "in_progress":
      return "bg-amber-50 border-amber-500";
    case "completed":
      return "bg-emerald-50 border-emerald-500";
    case "known":
      return "bg-violet-50 border-violet-500";
    default:
      return "bg-slate-100 border-slate-300";
  }
}

export function getStatusLabel(status: NodeStatus): string {
  switch (status) {
    case "locked":
      return "🔒 Locked";
    case "available":
      return "🎯 Available";
    case "in_progress":
      return "⚡ In Progress";
    case "completed":
      return "✅ Completed";
    case "known":
      return "💜 Already Known";
    default:
      return status;
  }
}

export function getPhaseColor(phase: number): string {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-cyan-500 to-cyan-600",
    "from-violet-500 to-violet-600",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
    "from-emerald-500 to-emerald-600",
  ];
  return colors[(phase - 1) % colors.length];
}

export function getPhaseBorderColor(phase: number): string {
  const colors = [
    "border-blue-300",
    "border-cyan-300",
    "border-violet-300",
    "border-amber-300",
    "border-rose-300",
    "border-emerald-300",
  ];
  return colors[(phase - 1) % colors.length];
}

export function computeProgress(nodes: RoadmapNode[]): {
  completed: number;
  known: number;
  total: number;
  percentage: number;
} {
  const completed = nodes.filter((n) => n.status === "completed").length;
  const known = nodes.filter((n) => n.status === "known").length;
  const total = nodes.length;
  const percentage = total > 0 ? Math.round(((completed + known) / total) * 100) : 0;
  return { completed, known, total, percentage };
}

export function formatHours(hours: number): string {
  if (hours < 60) return `${hours}h`;
  const d = Math.floor(hours / 8);
  return `~${d}d`;
}

export function isAllowedHost(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    const allowed = [
      "youtube.com",
      "youtu.be",
      "github.com",
      "docs.google.com",
      "coursera.org",
      "udemy.com",
      "edx.org",
      "medium.com",
      "dev.to",
      "stackoverflow.com",
      "developer.mozilla.org",
      "roadmap.sh",
      "freecodecamp.org",
      "w3schools.com",
      "npmjs.com",
      "pypi.org",
      "docs.python.org",
      "reactjs.org",
      "react.dev",
      "nextjs.org",
      "vercel.com",
      "typescriptlang.org",
      "typescript-lang.org",
    ];
    return allowed.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

export function getSafeResourceUrl(urlStr: string, title: string): string {
  if (isAllowedHost(urlStr)) {
    return urlStr;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(title + " tutorial guide")}`;
}


import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NodeStatus, RoadmapNode } from "./schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusColor(status: NodeStatus): string {
  switch (status) {
    case "locked":
      return "text-gray-400";
    case "available":
      return "text-blue-400";
    case "in_progress":
      return "text-amber-400";
    case "completed":
      return "text-emerald-400";
    case "known":
      return "text-purple-400";
    default:
      return "text-gray-400";
  }
}

export function getStatusBg(status: NodeStatus): string {
  switch (status) {
    case "locked":
      return "bg-gray-800 border-gray-700";
    case "available":
      return "bg-slate-800 border-blue-500";
    case "in_progress":
      return "bg-amber-950 border-amber-500";
    case "completed":
      return "bg-emerald-950 border-emerald-500";
    case "known":
      return "bg-purple-950 border-purple-500";
    default:
      return "bg-gray-800 border-gray-700";
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
    "from-blue-900 to-blue-800",
    "from-cyan-900 to-cyan-800",
    "from-violet-900 to-violet-800",
    "from-amber-900 to-amber-800",
    "from-rose-900 to-rose-800",
    "from-emerald-900 to-emerald-800",
  ];
  return colors[(phase - 1) % colors.length];
}

export function getPhaseBorderColor(phase: number): string {
  const colors = [
    "border-blue-700",
    "border-cyan-700",
    "border-violet-700",
    "border-amber-700",
    "border-rose-700",
    "border-emerald-700",
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


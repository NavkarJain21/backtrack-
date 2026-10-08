"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { RoadmapNode } from "@/lib/schemas";
import {
  deriveDifficulty,
  deriveDoneWhen,
  deriveEffort,
  deriveGithubGuidance,
  deriveInterviewQuestions,
  deriveMilestones,
  derivePortfolioDescription,
  derivePortfolioEvidence,
  deriveReadmeChecklist,
  deriveRequirementMapping,
  deriveSkillsDemonstrated,
  deriveTechStack,
  getChecklistProgress,
  getLockedPrerequisites,
  isEvidenceReady,
  isItemDone,
  type ItemSource,
} from "@/lib/project-evidence";
import { cn } from "@/lib/utils";
import {
  Award,
  ArrowDown,
  Check,
  FileText,
  Flag,
  GitBranch,
  Hammer,
  ListChecks,
  Lock,
  MessageSquare,
  Rocket,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";

interface ProjectWorkspaceProps {
  node: RoadmapNode;
  allNodes: RoadmapNode[];
  goal: string;
}

function SourceBadge({ source }: { source: ItemSource }) {
  if (source === "ai") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600">
        <Sparkles size={10} aria-hidden />
        AI-planned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
      Inferred from project
    </span>
  );
}

function Section({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          {icon}
          {title}
        </h3>
        {badge}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Checklist({
  nodeId,
  items,
  emptyText,
}: {
  nodeId: string;
  items: { id: string; text: string; completed?: boolean }[];
  emptyText: string;
}) {
  const { toggleDetailItem, actionItemProgress } = useStore();
  if (items.length === 0) {
    return <p className="text-xs text-slate-500 py-2 text-center">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const done = isItemDone(nodeId, item, actionItemProgress);
        return (
          <li key={item.id}>
            <label
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                done
                  ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm"
              )}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={() => toggleDetailItem(nodeId, item.id)}
                aria-label={item.text}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs leading-relaxed select-none break-words min-w-0">
                {item.text}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProjectWorkspace({ node, allNodes, goal }: ProjectWorkspaceProps) {
  const { nodeDetailCache } = useStore();
  const cached = nodeDetailCache[node.id];

  const d = useMemo(() => {
    const src = {
      ...node,
      ...(cached ?? {}),
    };
    const tech = deriveTechStack(node, src.techStack);
    return {
      why: src.why as string | undefined,
      tech,
      skills: deriveSkillsDemonstrated(node, allNodes, src.skillsDemonstrated),
      difficulty: deriveDifficulty(node, src.difficulty),
      effort: deriveEffort(node, src.estimatedEffort),
      outcome: (src.expectedOutcome as string | undefined) ?? node.description,
      milestones: deriveMilestones(node, src.milestones),
      doneWhen: deriveDoneWhen(node, src.doneWhen),
      github: deriveGithubGuidance(node, src.githubGuidance),
      readme: deriveReadmeChecklist(src.readmeChecklist),
      portfolio: derivePortfolioDescription(
        node,
        goal,
        tech.items,
        src.expectedOutcome as string | undefined,
        src.portfolioDescription as string | undefined
      ),
      evidence: derivePortfolioEvidence(node, src.portfolioEvidence),
      mapping: deriveRequirementMapping(node, goal, allNodes, src.requirementMapping),
      questions: deriveInterviewQuestions(node, tech.items, src.interviewQuestions),
    };
  }, [node, cached, allNodes, goal]);

  const { actionItemProgress } = useStore();
  const locked = node.status === "locked";
  const prereqs = useMemo(() => getLockedPrerequisites(node, allNodes), [node, allNodes]);
  const pending = prereqs.filter((p) => !p.done);
  const milestoneProgress = getChecklistProgress(node.id, d.milestones.items, actionItemProgress);
  const readmeProgress = getChecklistProgress(node.id, d.readme.items, actionItemProgress);
  const ready = isEvidenceReady(node.id, d.milestones.items, actionItemProgress);

  return (
    <div className="space-y-4">
      {/* Locked banner — info stays visible */}
      {locked && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Lock size={14} className="text-slate-400" aria-hidden />
            Complete these prerequisites first
          </div>
          <ul className="space-y-1">
            {prereqs.length === 0 ? (
              <li className="text-xs text-slate-500">No prerequisite data for this project.</li>
            ) : (
              prereqs.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      p.done ? "bg-emerald-500" : "bg-amber-500"
                    )}
                  />
                  <span className={cn(p.done ? "text-slate-400 line-through" : "text-slate-600")}>
                    {p.title}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {p.done ? "done" : "pending"}
                  </span>
                </li>
              ))
            )}
          </ul>
          {pending.length > 0 && (
            <p className="text-[11px] text-slate-500">
              {pending.length} of {prereqs.length} prerequisite{prereqs.length === 1 ? "" : "s"}{" "}
              remaining. You can still plan below — milestones unlock as you go.
            </p>
          )}
        </div>
      )}

      {/* Portfolio Evidence Ready */}
      {ready && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <Award size={16} aria-hidden />
            Portfolio Evidence Ready
          </div>
          <p className="text-xs text-emerald-800/80 leading-relaxed">{d.portfolio.text}</p>
          <ul className="text-[11px] text-emerald-700/80 space-y-0.5">
            <li>Skills demonstrated: {d.skills.items.length > 0 ? d.skills.items.slice(0, 5).join(", ") : "—"}</li>
            <li>Target-role requirements supported: {d.mapping.items.length}</li>
            <li>README checklist: {readmeProgress.done}/{readmeProgress.total} complete</li>
            <li>Interview preparation: {d.questions.items.length} project-specific questions below</li>
          </ul>
        </div>
      )}

      {/* Brief: difficulty / effort / outcome */}
      <Section icon={<Hammer size={14} className="text-emerald-600" aria-hidden />} title="Project Brief">
        <dl className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <dt className="text-slate-500 font-medium">Difficulty</dt>
            <dd className="font-bold text-slate-900">
              {d.difficulty.label}
              {d.difficulty.source === "inferred" && (
                <span className="ml-1.5 text-[10px] font-medium text-slate-500">(est.)</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <dt className="text-slate-500 font-medium">Estimated Effort</dt>
            <dd className="font-bold text-slate-900">{d.effort.label}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <dt className="text-slate-500 font-medium mb-1">Expected Outcome</dt>
            <dd className="text-slate-700 leading-relaxed">{d.outcome}</dd>
          </div>
        </dl>
      </Section>

      {/* Why this project matters */}
      <Section icon={<Rocket size={14} className="text-blue-600" aria-hidden />} title="Why This Project Matters">
        <p className="text-xs leading-relaxed text-slate-600">
          {d.why ??
            `“${node.title}” turns the skills in this roadmap into demonstrable proof for ${goal}: a finished artifact you can show, run, and defend in interviews.`}
        </p>
      </Section>

      {/* Skills + tech */}
      <Section icon={<Wrench size={14} className="text-cyan-600" aria-hidden />} title="Skills & Tech Stack" badge={<SourceBadge source={d.tech.source} />}>
        <div className="space-y-3">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Skills Demonstrated
            </h4>
            {d.skills.items.length === 0 ? (
              <p className="text-xs text-slate-500">No skill signals on this node yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {d.skills.items.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Suggested Tech Stack
            </h4>
            {d.tech.items.length === 0 ? (
              <p className="text-xs text-slate-500">Pick whatever stack matches your roadmap skills.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {d.tech.items.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Milestones */}
      <Section
        icon={<ListChecks size={14} className="text-emerald-600" aria-hidden />}
        title={`Milestones (${milestoneProgress.done}/${milestoneProgress.total})`}
        badge={<SourceBadge source={d.milestones.source} />}
      >
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200 mb-3"
          role="progressbar"
          aria-valuenow={milestoneProgress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Project milestones ${milestoneProgress.done} of ${milestoneProgress.total} complete`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
            style={{ width: `${milestoneProgress.percentage}%` }}
          />
        </div>
        <Checklist nodeId={node.id} items={d.milestones.items} emptyText="No milestones available." />
      </Section>

      {/* Done-when */}
      <Section
        icon={<Flag size={14} className="text-amber-600" aria-hidden />}
        title="Done When…"
        badge={<SourceBadge source={d.doneWhen.source} />}
      >
        <ul className="space-y-1.5">
          {d.doneWhen.items.map((c) => (
            <li key={c} className="flex items-start gap-2 text-xs text-slate-700">
              <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              <span className="break-words min-w-0">{c}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* GitHub */}
      <Section
        icon={<GitBranch size={14} className="text-slate-500" aria-hidden />}
        title="GitHub Guidance"
        badge={<SourceBadge source={d.github.source} />}
      >
        {d.github.items.map((g, i) => (
          <div key={i} className="space-y-3 text-xs">
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Repository setup</h4>
              <p className="text-slate-500 leading-relaxed">{g.repoSetup}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Recommended structure</h4>
              <ul className="space-y-1">
                {g.repoStructure.map((s) => (
                  <li key={s} className="font-mono text-[11px] text-blue-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 break-all">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-1">README requirements</h4>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                {g.readmeRequirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Commit guidance</h4>
              <p className="text-slate-500 leading-relaxed">{g.commitGuidance}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 mb-1">Suggested issues</h4>
              <ul className="space-y-1">
                {g.suggestedIssues.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-slate-500">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="break-words min-w-0">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </Section>

      {/* README checklist */}
      <Section
        icon={<FileText size={14} className="text-violet-600" aria-hidden />}
        title={`README Checklist (${readmeProgress.done}/${readmeProgress.total})`}
        badge={<SourceBadge source={d.readme.source} />}
      >
        <Checklist nodeId={node.id} items={d.readme.items} emptyText="No README items available." />
      </Section>

      {/* Portfolio description */}
      <Section
        icon={<Award size={14} className="text-amber-600" aria-hidden />}
        title="Portfolio Description"
        badge={<SourceBadge source={d.portfolio.source} />}
      >
        <p className="text-xs leading-relaxed text-slate-600">{d.portfolio.text}</p>
      </Section>

      {/* Portfolio evidence */}
      <Section
        icon={<Target size={14} className="text-rose-600" aria-hidden />}
        title="Portfolio Evidence"
        badge={<SourceBadge source={d.evidence.source} />}
      >
        <p className="text-[11px] text-slate-500 mb-2">
          What this project proves for <span className="text-slate-700 font-semibold">{goal}</span>:
        </p>
        <ul className="space-y-2">
          {d.evidence.items.map((e) => (
            <li key={e.category} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                {e.category}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{e.whatItProves}</div>
            </li>
          ))}
        </ul>
      </Section>

      {/* Requirement mapping */}
      <Section
        icon={<ArrowDown size={14} className="text-blue-600" aria-hidden />}
        title="Requirement Mapping"
        badge={<SourceBadge source={d.mapping.source} />}
      >
        <ol className="space-y-2.5">
          {d.mapping.items.map((m, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 break-words min-w-0">
                  {m.requirement}
                </span>
                {m.inferred && (
                  <span className="shrink-0 text-[10px] font-medium text-slate-500 border border-slate-200 bg-white rounded px-1.5 py-0.5">
                    inferred
                  </span>
                )}
              </div>
              <div aria-hidden className="flex justify-start my-1">
                <ArrowDown size={12} className="text-slate-400" />
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed break-words">{m.evidence}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Interview prep */}
      <Section
        icon={<MessageSquare size={14} className="text-violet-600" aria-hidden />}
        title="Interview Preparation"
        badge={<SourceBadge source={d.questions.source} />}
      >
        <ol className="space-y-2 list-decimal list-inside">
          {d.questions.items.map((q, i) => (
            <li key={i} className="text-xs text-slate-600 leading-relaxed break-words">
              {q}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

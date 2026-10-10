"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, LoaderCircle, Sparkles } from "lucide-react";
import type { LearningKind } from "@/lib/learning/catalog";
import type { LearningSessionView } from "@/lib/services/learning";

type ApiResponse<T> = { data?: T; error?: { message?: string } };
const labels: Record<LearningKind, { start: string; resume: string; path: string }> = {
  diagnostic: { start: "Start diagnostic", resume: "Resume diagnostic", path: "diagnostic" },
  practice: { start: "Start targeted practice", resume: "Resume practice", path: "practice" },
  reassessment: { start: "Start reassessment", resume: "Resume reassessment", path: "reassess" },
};

export function LearningLauncher({ kind }: { kind: LearningKind }) {
  const router = useRouter();
  const [active, setActive] = useState<LearningSessionView | null>(null);
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(`/api/learn/sessions?kind=${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as ApiResponse<LearningSessionView | null>;
        if (!response.ok) throw new Error(result.error?.message || "Could not check for an in-progress session.");
        if (mounted) setActive(result.data ?? null);
      })
      .catch((reason: unknown) => {
        if (mounted) setError(reason instanceof Error ? reason.message : "Could not check your session.");
      })
      .finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, [kind]);

  async function openSession() {
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/learn/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const result = await response.json() as ApiResponse<LearningSessionView>;
      if (!response.ok || !result.data) throw new Error(result.error?.message || "Could not start this session.");
      router.push(`/learn/${labels[kind].path}/${result.data.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start this session.");
    } finally {
      setStarting(false);
    }
  }

  const label = labels[kind];
  return (
    <div className="launch-panel card">
      <div className="learning-card-icon"><BookOpenCheck size={18} aria-hidden="true" /></div>
      <p className="eyebrow" style={{ marginTop: 20 }}><span className="eyebrow-mark" />PYTHON FUNDAMENTALS</p>
      <h1 className="page-title" style={{ fontSize: 28 }}>{kind === "diagnostic" ? "A quick check-in, not a final verdict." : kind === "practice" ? "Build confidence where it counts." : "See what changed with a fresh set."}</h1>
      <p className="page-subtitle" style={{ maxWidth: 590 }}>
        {kind === "diagnostic"
          ? "Six short questions map your current understanding across the core concepts. Use the result as a starting point, not a label."
          : kind === "practice"
            ? "Questions are chosen from concepts you missed in your latest diagnostic. Practice answers are saved in this local demo workspace."
            : "Reassessment uses questions you have not answered before and focuses on concepts from your latest diagnostic. Your comparison uses real saved attempts."}
      </p>
      <div className="launch-steps" aria-label="Session outline">
        <span className="launch-step"><span>01</span> Answer at your pace</span>
        <span className="launch-step"><span>02</span> Save automatically</span>
        <span className="launch-step"><span>03</span> Get a clear next step</span>
      </div>
      {error && <div className="launch-error" role="alert">{error}</div>}
      <div className="launch-actions">
        <button className="button button-primary" type="button" onClick={openSession} disabled={checking || starting}>
          {starting || checking ? <LoaderCircle size={15} className="spin" aria-hidden="true" /> : active ? <Clock3 size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {starting ? "Opening…" : checking ? "Checking…" : active ? label.resume : label.start}
          {!starting && !checking && <ArrowRight size={14} aria-hidden="true" />}
        </button>
        <span className="launch-note">{active ? `${active.answeredCount} of ${active.questions.length} answers saved` : "Your progress is saved to the local demo database."}</span>
      </div>
      <div className="disclaimer" style={{ marginTop: 20 }}><CheckCircle2 size={14} aria-hidden="true" /> This is a local demo with fictional data. The score helps guide practice; it is not a definitive measure of ability.</div>
    </div>
  );
}

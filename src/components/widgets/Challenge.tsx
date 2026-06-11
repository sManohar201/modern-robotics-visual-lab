import { useEffect, useRef, useState, type ReactNode } from "react";
import { Target, CheckCircle2 } from "lucide-react";
import { useProgress } from "../../store/progress";

/**
 * A "try it" goal attached to a widget. `met` is the live predicate computed by
 * the parent from widget state. To avoid rewarding accidental flickers, the
 * predicate must hold continuously for `holdMs` before the challenge completes.
 * Completion persists (localStorage) and feeds the sidebar checkmarks.
 */
export function Challenge({
  id,
  met,
  holdMs = 600,
  children,
}: {
  id: string;
  met: boolean;
  holdMs?: number;
  children: ReactNode;
}) {
  const done = useProgress(s => !!s.done[id]);
  const markDone = useProgress(s => s.markDone);
  const [justDone, setJustDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (done) return;
    if (met) {
      timer.current = setTimeout(() => {
        markDone(id);
        setJustDone(true);
      }, holdMs);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
  }, [met, done, id, holdMs, markDone]);

  return (
    <div
      className={`ui my-4 rounded-lg border px-4 py-3 transition-colors duration-500 ${
        done
          ? "border-[#bfdfc4] bg-[#f0f8f1]"
          : "border-[#e3d9b8] bg-[#fbf7e8]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {done ? (
          <CheckCircle2 size={17} className={`mt-0.5 shrink-0 text-[var(--good)] ${justDone ? "animate-bounce" : ""}`} />
        ) : (
          <Target size={17} className="mt-0.5 shrink-0 text-[#b08c1d]" />
        )}
        <div className="text-[13.5px] leading-relaxed">
          <span className={`font-bold tracking-wide text-[11px] uppercase mr-2 ${done ? "text-[var(--good)]" : "text-[#b08c1d]"}`}>
            {done ? "Done" : "Try it"}
          </span>
          <span className="text-[var(--ink-soft)]">{children}</span>
        </div>
      </div>
    </div>
  );
}

/** All challenge ids on a page, so the registry can compute per-page progress. */
export function challengeIds(...ids: string[]) {
  return ids;
}

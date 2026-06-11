import { useState, type ReactNode } from "react";
import { Challenge } from "./Challenge";

export interface QuizQuestion {
  prompt: ReactNode;
  options: { label: ReactNode; correct?: boolean }[];
  explain?: ReactNode;
}

/**
 * Inline multiple-choice check. Wrong picks shake out in red and can be
 * retried; the attached challenge completes when every question is correct.
 */
export function Quiz({
  challengeId,
  goal,
  questions,
}: {
  challengeId: string;
  goal: ReactNode;
  questions: QuizQuestion[];
}) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const allCorrect = questions.every((q, qi) => {
    const p = picked[qi];
    return p !== undefined && q.options[p]?.correct;
  });

  return (
    <div className="my-6">
      <Challenge id={challengeId} met={allCorrect} holdMs={200}>
        {goal}
      </Challenge>
      <div className="flex flex-col gap-5 rounded-xl border border-[var(--rule)] bg-[var(--paper-raised)] p-5">
        {questions.map((q, qi) => {
          const p = picked[qi];
          const isCorrect = p !== undefined && q.options[p]?.correct;
          const isWrong = p !== undefined && !q.options[p]?.correct;
          return (
            <div key={qi}>
              <div className="text-[15px] mb-2.5">{q.prompt}</div>
              <div className="ui flex flex-wrap gap-2">
                {q.options.map((o, oi) => {
                  const sel = p === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setPicked(s => ({ ...s, [qi]: oi }))}
                      className={`text-[13px] px-3 py-1.5 rounded-md border transition-colors ${
                        sel && o.correct
                          ? "border-[var(--good)] bg-[#eef7ef] text-[var(--good)] font-semibold"
                          : sel
                            ? "border-[#d9483f] bg-[#fbeeed] text-[#d9483f]"
                            : "border-[var(--rule)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink-faint)]"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              {isCorrect && q.explain && (
                <div className="ui text-[12.5px] text-[var(--good)] mt-2">{q.explain}</div>
              )}
              {isWrong && (
                <div className="ui text-[12.5px] text-[#d9483f] mt-2">Not quite — try again.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Building blocks for explorable-explanation pages.

import { useMemo, type ReactNode } from "react";
import katex from "katex";

/** Inline math. */
export function M({ children }: { children: string }) {
  const html = useMemo(
    () => katex.renderToString(children, { throwOnError: false }),
    [children],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Display (block) math. */
export function Eq({ children }: { children: string }) {
  const html = useMemo(
    () => katex.renderToString(children, { throwOnError: false, displayMode: true }),
    [children],
  );
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function PageHeader({
  chapter,
  section,
  title,
  lede,
}: {
  chapter: string;
  section: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="mb-10">
      <div className="ui text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--ink-faint)] mb-3">
        {chapter} · {section}
      </div>
      <h1>{title}</h1>
      <p className="text-[1.12rem] leading-relaxed text-[var(--ink-soft)] italic">{lede}</p>
      <hr className="border-0 border-t border-[var(--rule)] mt-6" />
    </header>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2>{children}</h2>;
}

/** A boxed takeaway — the one sentence to remember. */
export function KeyIdea({ children }: { children: ReactNode }) {
  return (
    <div className="my-7 border-l-[3px] border-[var(--accent)] bg-[#f4f1fb] rounded-r-lg px-5 py-4">
      <div className="ui text-[10.5px] font-bold tracking-[0.16em] uppercase text-[var(--accent)] mb-1.5">
        Key idea
      </div>
      <div className="text-[1.02rem]">{children}</div>
    </div>
  );
}

/** Margin-note style aside for caveats and pointers back to the book. */
export function Aside({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 text-[0.92rem] leading-relaxed text-[var(--ink-soft)] border-l-2 border-[var(--rule)] pl-4">
      {children}
    </div>
  );
}

/** A fully worked numeric example: given → set up → solve → sanity-check. */
export function Worked({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="my-7 rounded-lg border border-[#e6d9b8] bg-[#fdf9ee] px-5 py-4">
      <div className="ui text-[10.5px] font-bold tracking-[0.16em] uppercase text-[#b08c1d] mb-1">
        Worked example
      </div>
      <div className="text-[0.98rem] font-semibold mb-2">{title}</div>
      <div className="text-[0.96rem] leading-relaxed">{children}</div>
    </div>
  );
}

/** Footer nav between pages. */
export function BookRef({ children }: { children: ReactNode }) {
  return (
    <div className="ui mt-14 pt-5 border-t border-[var(--rule)] text-[12.5px] text-[var(--ink-faint)]">
      {children}
    </div>
  );
}

/** Master reference banner for all College Physics & Dynamics pages. */
export function PhysicsRef() {
  return (
    <div className="ui mt-4 px-4 py-3 rounded-lg bg-[#f4f1fb] border border-[#ddd8f5] text-[12.5px] text-[var(--ink-soft)]">
      <span className="font-semibold text-[var(--accent)]">Master reference</span>
      {" — "}
      <a
        href="https://physics.info/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] underline underline-offset-2 hover:opacity-75"
      >
        The Physics Hypertextbook (physics.info)
      </a>
      {" — for a deeper treatment of any topic in this chapter, that site is the place to go."}
    </div>
  );
}

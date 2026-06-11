import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronRight, ChevronLeft } from "lucide-react";
import { chapters, allPages, findPage, type PageDef } from "./content/registry";
import { useProgress } from "./store/progress";

const DEFAULT_PAGE = "ch2-config-dof";

function usePageId(): [string, (id: string) => void] {
  const [id, setId] = useState(() => window.location.hash.replace(/^#\/?/, "") || DEFAULT_PAGE);
  useEffect(() => {
    const onHash = () => setId(window.location.hash.replace(/^#\/?/, "") || DEFAULT_PAGE);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const nav = (next: string) => {
    window.location.hash = `/${next}`;
  };
  return [id, nav];
}

export default function App() {
  const [pageId, nav] = usePageId();
  const found = findPage(pageId) ?? findPage(DEFAULT_PAGE)!;
  const { chapter, page } = found;

  useEffect(() => {
    document.title = `${page.title} — MR Visual Lab`;
    document.querySelector("main")?.scrollTo(0, 0);
  }, [page]);

  const idx = allPages.findIndex(p => p.id === page.id);
  const prev = idx > 0 ? allPages[idx - 1] : null;
  const next = idx < allPages.length - 1 ? allPages[idx + 1] : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--paper)]">
      <Sidebar activeId={page.id} onNav={nav} />
      <main className="flex-1 overflow-y-auto thin-scroll">
        <div className="px-8 lg:px-0 lg:ml-[max(60px,calc(50%-410px))] py-14 max-w-[820px]">
          <article className="prose-mr">
            <Suspense fallback={<div className="ui text-sm text-[var(--ink-faint)]">Loading…</div>}>
              {page.status === "ready" && page.component ? (
                <page.component />
              ) : (
                <StubPage chapterTitle={`Chapter ${chapter.number} · ${chapter.title}`} page={page} />
              )}
            </Suspense>
          </article>

          <nav className="ui flex justify-between gap-4 mt-16 pb-10 max-w-[700px]">
            {prev ? (
              <button
                onClick={() => nav(prev.id)}
                className="flex items-center gap-1.5 text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              >
                <ChevronLeft size={15} /> {prev.title}
              </button>
            ) : (
              <span />
            )}
            {next && (
              <button
                onClick={() => nav(next.id)}
                className="flex items-center gap-1.5 text-[13px] text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors text-right"
              >
                {next.title} <ChevronRight size={15} />
              </button>
            )}
          </nav>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ activeId, onNav }: { activeId: string; onNav: (id: string) => void }) {
  const done = useProgress(s => s.done);
  return (
    <aside className="ui w-[280px] shrink-0 h-full overflow-y-auto thin-scroll border-r border-[var(--rule)] bg-[#f6f4ee] px-5 py-8">
      <div className="mb-8">
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-[var(--accent)] mb-1">
          Explorable
        </div>
        <div className="text-[17px] font-bold leading-tight text-[var(--ink)]">Modern Robotics</div>
        <div className="text-[11.5px] text-[var(--ink-faint)] mt-0.5">Lynch &amp; Park · visual lab</div>
      </div>

      {chapters.map(ch => (
        <div key={ch.id} className="mb-6">
          <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-[var(--ink-faint)] mb-2">
            Chapter {ch.number} — {ch.title}
          </div>
          <div className="flex flex-col">
            {ch.pages.map(p => {
              const active = p.id === activeId;
              const total = p.challenges.length;
              const completed = p.challenges.filter(c => done[c]).length;
              const allDone = total > 0 && completed === total;
              return (
                <button
                  key={p.id}
                  onClick={() => onNav(p.id)}
                  className={`group flex items-center gap-2 text-left rounded-md px-2.5 py-[7px] text-[13px] leading-snug transition-colors ${
                    active
                      ? "bg-[#ece7f9] text-[var(--accent)] font-semibold"
                      : "text-[var(--ink-soft)] hover:bg-[#eeebe2]"
                  }`}
                >
                  {p.status === "soon" ? (
                    <Circle size={13} className="shrink-0 text-[#d6d2c6]" />
                  ) : allDone ? (
                    <CheckCircle2 size={13} className="shrink-0 text-[var(--good)]" />
                  ) : (
                    <Circle size={13} className={`shrink-0 ${completed > 0 ? "text-[#caa53d]" : "text-[#b9b5a8]"}`} />
                  )}
                  <span className={p.status === "soon" ? "opacity-50" : ""}>{p.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}

function StubPage({ chapterTitle, page }: { chapterTitle: string; page: PageDef }) {
  return (
    <div>
      <div className="ui text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--ink-faint)] mb-3">
        {chapterTitle}
      </div>
      <h1>{page.title}</h1>
      <p className="text-[var(--ink-soft)]">
        This page hasn't been built yet — it's next on the roadmap. Planned interactives:
      </p>
      <ul className="list-disc pl-6 text-[var(--ink-soft)]">
        {page.planned?.map((p, i) => (
          <li key={i} className="mb-1.5">
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

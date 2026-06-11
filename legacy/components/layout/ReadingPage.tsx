import { BlockMath } from "react-katex";
import type { Chapter, Topic } from "../../data/chapters";
import { FlaskConical, BookOpen, Lightbulb } from "lucide-react";

interface ReadingPageProps {
  chapter: Chapter;
  topic: Topic;
  onLaunchLab: () => void;
}

export function ReadingPage({ chapter, topic, onLaunchLab }: ReadingPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#090a0f]">
      <div className="max-w-3xl mx-auto px-10 py-14">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#5f6b8d] syne mb-8">
          <BookOpen size={11} />
          <span>Chapter {chapter.number}</span>
          <span>/</span>
          <span className="text-[#00e5ff]">{topic.title}</span>
        </div>

        {/* Title block */}
        <div className="mb-10 pb-8 border-b border-[#20263f]">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#b5ff4b] syne mb-3">
            {chapter.title}
          </p>
          <h1 className="text-4xl font-black syne uppercase tracking-tight text-white leading-tight mb-3">
            {topic.title}
          </h1>
          <p className="text-[#5f6b8d] text-sm">{topic.theory.subtitle}</p>
        </div>

        {/* Overview paragraphs */}
        <section className="mb-12">
          <div className="flex flex-col gap-5">
            {topic.theory.overview.map((para, i) => (
              <p key={i} className="text-[#d2d9ef]/80 leading-[1.85] text-[14px]">
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Core formula */}
        {topic.theory.formula && (
          <section className="mb-12">
            <div className="p-6 rounded-2xl bg-[#111422] border border-[#20263f] hover:border-[#00e5ff]/20 transition-colors">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#00e5ff] mb-5 syne opacity-60">
                Core Definition
              </p>
              <div className="text-[#00e5ff] overflow-x-auto">
                <BlockMath math={topic.theory.formula} />
              </div>
            </div>
          </section>
        )}

        {/* Insights */}
        <section className="mb-14">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#b5ff4b] syne mb-6">
            <Lightbulb size={12} />
            <span>Key Insights</span>
          </div>
          <div className="flex flex-col gap-3">
            {topic.theory.insights.map((insight, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-xl bg-[#111422]/60 border border-[#20263f] hover:border-[#b5ff4b]/20 transition-colors"
              >
                <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#b5ff4b] shadow-[0_0_8px_#b5ff4b]" />
                <p className="text-[12px] text-[#d2d9ef]/70 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Launch lab CTA */}
        {topic.hasScene ? (
          <section>
            <div className="rounded-2xl bg-[#111422] border border-[#00e5ff]/20 p-8 flex flex-col items-center text-center">
              <FlaskConical size={28} className="text-[#00e5ff] mb-4" />
              <h3 className="text-lg font-black syne uppercase text-white mb-2">Interactive Lab Available</h3>
              <p className="text-[12px] text-[#5f6b8d] mb-6 max-w-sm leading-relaxed">
                Explore <span className="text-[#00e5ff]">{topic.title}</span> with a live 3D simulation.
                Adjust parameters, observe the math update in real time, and develop intuition through interaction.
              </p>
              <button
                onClick={onLaunchLab}
                className="px-8 py-3 bg-[#00e5ff]/10 border border-[#00e5ff] text-[#00e5ff] text-[11px] font-bold uppercase tracking-[0.15em] syne rounded-lg hover:bg-[#00e5ff]/20 hover:shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all"
              >
                Launch Interactive Lab →
              </button>
            </div>
          </section>
        ) : (
          <section>
            <div className="rounded-2xl bg-[#111422]/40 border border-dashed border-[#20263f] p-6 flex flex-col items-center text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5f6b8d] syne mb-2">Lab Coming Soon</p>
              <p className="text-[11px] text-[#5f6b8d]/60">
                An interactive visualization for this topic is in development.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

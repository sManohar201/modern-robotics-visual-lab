import { useState } from "react";
import { chapters } from "./data/chapters";
import { Sidebar } from "./components/layout/Sidebar";
import { ReadingPage } from "./components/layout/ReadingPage";
import { LabPage } from "./components/layout/LabPage";
import "katex/dist/katex.min.css";

type View = "dashboard" | "reading" | "lab";

interface Selection {
  chapterId: string;
  topicId: string;
}

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selection, setSelection] = useState<Selection>({ chapterId: "", topicId: "" });

  const activeChapter = chapters.find(c => c.id === selection.chapterId);
  const activeTopic = activeChapter?.topics.find(t => t.id === selection.topicId);

  const handleSelectTopic = (chapterId: string, topicId: string) => {
    setSelection({ chapterId, topicId });
    setView("reading");
  };

  const handleLaunchLab = () => setView("lab");
  const handleBackToReading = () => setView("reading");

  if (view === "lab" && activeTopic) {
    return (
      <LabPage
        chapter={selection.chapterId}
        topic={selection.topicId}
        topicTitle={activeTopic.title}
        onBack={handleBackToReading}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#090a0f] text-[#d2d9ef] overflow-hidden">
      <Sidebar
        chapters={chapters}
        selectedChapterId={selection.chapterId}
        selectedTopicId={selection.topicId}
        onSelectTopic={handleSelectTopic}
        onGoToDashboard={() => setView("dashboard")}
      />

      <main className="flex-1 overflow-hidden">
        {view === "dashboard" || !activeTopic ? (
          <Dashboard onSelectTopic={handleSelectTopic} />
        ) : (
          <ReadingPage
            chapter={activeChapter!}
            topic={activeTopic}
            onLaunchLab={handleLaunchLab}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({ onSelectTopic }: { onSelectTopic: (c: string, t: string) => void }) {
  return (
    <div className="h-full overflow-y-auto px-12 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#b5ff4b] syne mb-3">
            Interactive Visual Lab
          </p>
          <h1 className="text-5xl font-black syne uppercase tracking-tight text-white leading-none mb-4">
            Modern<br />
            <span className="text-[#00e5ff]">Robotics</span>
          </h1>
          <p className="text-[#5f6b8d] text-sm max-w-xl leading-relaxed">
            Lynch & Park — Mechanics, Planning, and Control. Select a topic from the sidebar
            or click any card to start reading. Topics marked <span className="text-[#b5ff4b] font-bold">LAB</span> include an interactive 3D simulator.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map(ch => (
            <div key={ch.id} className="border border-[#20263f] rounded-xl p-5 bg-[#111422]/40 hover:border-[#00e5ff]/30 transition-all">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5f6b8d] syne mb-1">
                Chapter {ch.number}
              </div>
              <h3 className="text-sm font-bold syne uppercase text-white mb-4">{ch.title}</h3>
              <div className="flex flex-col gap-1.5">
                {ch.topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTopic(ch.id, t.id)}
                    className="flex items-center justify-between text-left p-2.5 rounded-lg bg-black/30 border border-[#20263f]/60 hover:border-[#00e5ff]/40 hover:bg-[#00e5ff]/5 transition-all group"
                  >
                    <span className="text-[11px] text-[#d2d9ef]/80 group-hover:text-white transition-colors">{t.title}</span>
                    {t.hasScene && (
                      <span className="text-[8px] font-bold text-[#b5ff4b] border border-[#b5ff4b]/30 px-1.5 py-0.5 rounded tracking-wider">LAB</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import type { Chapter } from "../../data/chapters";
import { ChevronDown, ChevronRight, Cpu } from "lucide-react";

interface SidebarProps {
  chapters: Chapter[];
  selectedChapterId: string;
  selectedTopicId: string;
  onSelectTopic: (chapterId: string, topicId: string) => void;
  onGoToDashboard: () => void;
}

export function Sidebar({
  chapters,
  selectedChapterId,
  selectedTopicId,
  onSelectTopic,
  onGoToDashboard,
}: SidebarProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    () => new Set(selectedChapterId ? [selectedChapterId] : [chapters[0]?.id ?? ""])
  );

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="w-56 shrink-0 h-full flex flex-col border-r border-[#20263f] bg-[#0d0f18] overflow-hidden">
      {/* Logo */}
      <button
        onClick={onGoToDashboard}
        className="flex items-center gap-2.5 px-4 py-4 border-b border-[#20263f] hover:bg-[#111422] transition-colors shrink-0"
      >
        <div className="w-7 h-7 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center">
          <Cpu size={14} className="text-[#00e5ff]" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-black syne uppercase tracking-wider text-white leading-none">MR Lab</span>
          <span className="text-[8px] text-[#5f6b8d] uppercase tracking-wider">Visual</span>
        </div>
      </button>

      {/* Chapter tree */}
      <nav className="flex-1 overflow-y-auto py-2">
        {chapters.map(ch => {
          const isExpanded = expandedChapters.has(ch.id);
          const isActiveChapter = ch.id === selectedChapterId;

          return (
            <div key={ch.id}>
              <button
                onClick={() => toggleChapter(ch.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#111422] transition-colors ${
                  isActiveChapter ? "bg-[#111422]" : ""
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-bold text-[#5f6b8d] uppercase tracking-[0.15em] syne">
                    Ch {ch.number}
                  </span>
                  <span
                    className={`text-[11px] font-bold syne uppercase truncate leading-tight mt-0.5 ${
                      isActiveChapter ? "text-[#00e5ff]" : "text-[#d2d9ef]/70"
                    }`}
                  >
                    {ch.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={12} className="text-[#5f6b8d] shrink-0 ml-1" />
                ) : (
                  <ChevronRight size={12} className="text-[#5f6b8d] shrink-0 ml-1" />
                )}
              </button>

              {isExpanded && (
                <div className="border-l border-[#20263f] ml-4">
                  {ch.topics.map(topic => {
                    const isActive = ch.id === selectedChapterId && topic.id === selectedTopicId;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => onSelectTopic(ch.id, topic.id)}
                        className={`w-full flex items-center gap-2 pl-3 pr-2 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-[#00e5ff]/10 border-l-2 border-[#00e5ff] -ml-px"
                            : "hover:bg-[#111422] border-l-2 border-transparent -ml-px"
                        }`}
                      >
                        <span
                          className={`text-[10px] leading-tight ${
                            isActive ? "text-[#00e5ff] font-semibold" : "text-[#d2d9ef]/60"
                          }`}
                        >
                          {topic.title}
                        </span>
                        {topic.hasScene && (
                          <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-[#b5ff4b]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer legend */}
      <div className="px-4 py-3 border-t border-[#20263f] shrink-0">
        <p className="text-[8px] text-[#5f6b8d] leading-relaxed">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#b5ff4b] mr-1.5 mb-px" />
          Green dot = interactive lab available
        </p>
      </div>
    </aside>
  );
}

import { chapters } from "../../data/chapters";
import { Book, ChevronRight, Activity, Terminal } from "lucide-react";

interface DashboardProps {
  onSelectTopic: (chapterId: string, topicId: string) => void;
}

export function Dashboard({ onSelectTopic }: DashboardProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-2 text-accent-joint mb-2 syne tracking-[0.2em] uppercase text-[10px] font-bold">
              <Activity size={14} />
              <span>Modern Robotics - Mechanics, Planning and Control</span>
            </div>
            <h1 className="text-4xl font-black syne uppercase tracking-tighter text-white italic">
              Lab <span className="text-accent-body">Curriculum</span>
            </h1>
          </div>
         
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="group flex flex-col border border-white/5 bg-panel/30 rounded-xl p-5 hover:bg-white/5 transition-all duration-300 hover:border-accent-body/20 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-accent-joint uppercase tracking-[0.15em] syne opacity-70">Module</span>
                   <h2 className="text-sm font-bold syne uppercase text-white tracking-wide">{chapter.title}</h2>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-muted group-hover:text-accent-body transition-colors">
                   <Book size={16} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {chapter.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onSelectTopic(chapter.id, topic.id)}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 hover:border-accent-body/40 hover:bg-accent-body/5 transition-all group/btn"
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-[11px] font-bold text-white/90 group-hover/btn:text-accent-body transition-colors">{topic.title}</span>
                      <span className="text-[9px] text-muted text-left line-clamp-1 italic">{topic.description}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted group-hover/btn:text-accent-body" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {/* Status Card for Density */}
          <div className="border border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-center bg-black/10">
             <Terminal size={20} className="text-muted mb-3 opacity-30" />
             <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50 mb-1 syne">System Status</span>
             <span className="text-[10px] text-muted/40 jetbrains italic leading-tight">
                Additional modules pending analytical verification.
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}

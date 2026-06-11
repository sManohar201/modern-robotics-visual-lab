import { ArrowLeft } from "lucide-react";
import { SceneRouter } from "../../SceneRouter";

interface LabPageProps {
  chapter: string;
  topic: string;
  topicTitle: string;
  onBack: () => void;
}

export function LabPage({ chapter, topic, topicTitle, onBack }: LabPageProps) {
  return (
    <div className="fixed inset-0 bg-[#090a0f] z-50">
      {/* Floating back button */}
      <div className="absolute top-5 left-5 z-20 flex items-center gap-3 pointer-events-none">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-[#111422]/90 border border-[#20263f] rounded-lg text-[10px] font-bold uppercase tracking-wider text-[#5f6b8d] hover:text-[#00e5ff] hover:border-[#00e5ff]/30 transition-all backdrop-blur-md"
        >
          <ArrowLeft size={13} />
          <span>Reading</span>
        </button>
        <div className="pointer-events-none">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#5f6b8d]">Interactive Lab</p>
          <p className="text-[13px] font-bold syne uppercase text-white">{topicTitle}</p>
        </div>
      </div>

      {/* Full-screen scene */}
      <SceneRouter chapter={chapter} topic={topic} />
    </div>
  );
}

import { FlaskConical } from "lucide-react";

interface PlaceholderSceneProps {
  chapter: string;
  topic: string;
}

export function PlaceholderScene({ chapter, topic }: PlaceholderSceneProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#090a0f] text-center px-8">
      <FlaskConical size={32} className="text-[#20263f] mb-4" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5f6b8d] syne mb-2">
        Lab Under Construction
      </p>
      <p className="text-[12px] text-[#5f6b8d]/50 max-w-xs">
        {chapter}/{topic}
      </p>
    </div>
  );
}

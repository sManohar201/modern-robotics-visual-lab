import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProgressState {
  /** challenge id -> completed */
  done: Record<string, boolean>;
  markDone: (id: string) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    set => ({
      done: {},
      markDone: id => set(s => (s.done[id] ? s : { done: { ...s.done, [id]: true } })),
      reset: () => set({ done: {} }),
    }),
    { name: "mr-visual-lab-progress" },
  ),
);

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Frame around every inline interactive. Slightly wider than the prose column
 * so widgets read as "figures" embedded in the article.
 */
export function WidgetShell({
  title,
  onReset,
  children,
  caption,
}: {
  title: string;
  onReset?: () => void;
  children: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <figure className="my-8 mx-0 w-full lg:w-[820px] lg:ml-[-60px]">
      <div className="rounded-xl border border-[var(--rule)] bg-[var(--paper-raised)] shadow-[0_1px_4px_rgba(40,35,20,0.06)] overflow-hidden">
        <div className="ui flex items-center justify-between px-4 py-2 border-b border-[var(--rule)] bg-[#f6f4ee]">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--ink-soft)]">
            {title}
          </span>
          {onReset && (
            <button
              onClick={onReset}
              title="Reset widget"
              className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
            >
              <RotateCcw size={12} /> reset
            </button>
          )}
        </div>
        <div className="p-4">{children}</div>
      </div>
      {caption && (
        <figcaption className="ui text-[12.5px] leading-relaxed text-[var(--ink-faint)] mt-2 px-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Consistent row of controls under a widget canvas. */
export function ControlBar({ children }: { children: ReactNode }) {
  return <div className="ui flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">{children}</div>;
}

export function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  fmt,
  width = 160,
  color,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
  width?: number;
  color?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-[13px]">
      <span className="font-medium min-w-[20px]" style={color ? { color } : undefined}>
        {label}
      </span>
      <input
        type="range"
        className="slider"
        style={{ width }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <span className="mono text-[12px] text-[var(--ink-soft)] min-w-[52px] text-right">
        {fmt ? fmt(value) : value.toFixed(2)}
      </span>
    </label>
  );
}

export function WidgetButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`ui text-[12.5px] font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 ${
        active
          ? "border-[var(--accent)] bg-[#efe9fb] text-[var(--accent)]"
          : "border-[var(--rule)] bg-white text-[var(--ink-soft)] hover:border-[var(--ink-faint)]"
      }`}
    >
      {children}
    </button>
  );
}

/** Small live numeric readout chip. */
export function Readout({ label, value, color }: { label: ReactNode; value: string; color?: string }) {
  return (
    <span className="ui inline-flex items-center gap-1.5 text-[12.5px]">
      <span className="text-[var(--ink-faint)]" style={color ? { color } : undefined}>
        {label}
      </span>
      <span className="mono text-[12.5px] bg-[#f3f1ea] rounded px-1.5 py-0.5">{value}</span>
    </span>
  );
}

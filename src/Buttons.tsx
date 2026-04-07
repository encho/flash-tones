import { onsetDots } from "./signals";

interface OnsetDotsProps {
  count: number;
  activeColor?: string;
  inactiveColor?: string;
}

export function OnsetDots({
  count,
  activeColor = "#fde68a",
  inactiveColor = "#ccc",
}: OnsetDotsProps) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        color: count > 0 ? activeColor : inactiveColor,
        letterSpacing: "0.05em",
      }}
    >
      {onsetDots(count)}
    </span>
  );
}

interface Button3NotesSignalProps {
  label: string;
  onsetCount: number;
  onClick: () => void;
  fontSize?: string;
  padding?: string;
}

export function Button3NotesSignal({
  label,
  onsetCount,
  onClick,
  fontSize = "1rem",
  padding = "10px 28px",
}: Button3NotesSignalProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding,
        fontSize,
        borderRadius: "10px",
        border: "none",
        backgroundColor: "#6366f1",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <OnsetDots count={onsetCount} />
      <span>{label}</span>
    </button>
  );
}

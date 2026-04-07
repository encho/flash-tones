import { onsetDots } from "./signals";

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
      <span
        style={{
          fontSize: "0.75rem",
          opacity: onsetCount > 0 ? 1 : 0.45,
          color: onsetCount > 0 ? "#fde68a" : "#fff",
          letterSpacing: "0.05em",
          minWidth: "2.2ch",
        }}
      >
        {onsetDots(onsetCount)}
      </span>
      <span>{label}</span>
    </button>
  );
}

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
  width?: string;
}

export interface UIButtonGroupItem {
  label: string;
  onClick: () => void;
  active?: boolean;
}

export function UIButtonGroup({ items }: { items: UIButtonGroupItem[] }) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }}>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          style={{
            fontSize: "0.95rem",
            padding: "6px 16px",
            borderRadius: "8px",
            border: `2px solid ${item.active ? "#6366f1" : "#d1d5db"}`,
            background: item.active ? "#6366f1" : "#fff",
            color: item.active ? "#fff" : "#444",
            cursor: "pointer",
            fontWeight: item.active ? 700 : 400,
            transition: "all 0.15s",
            flex: "1 1 0",
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Button3NotesSignal({
  label,
  onsetCount,
  onClick,
  fontSize = "1rem",
  padding = "10px 28px",
  width,
}: Button3NotesSignalProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding,
        fontSize,
        width,
        borderRadius: "10px",
        border: "none",
        backgroundColor: "#6366f1",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <OnsetDots count={onsetCount} />
      <span>{label}</span>
    </button>
  );
}

import { useState, useEffect } from "react";

type Breakpoint = "small" | "medium" | "large";

function useBreakpoint(): Breakpoint {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  if (width < 480) return "small";
  if (width < 768) return "medium";
  return "large";
}

interface Button3NotesSignalProps {
  label: string;
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

export interface ButtonsPerRow {
  small?: number;
  medium?: number;
  large?: number;
}

export function UIButtonGroup({
  items,
  buttonsPerRow,
}: {
  items: UIButtonGroupItem[];
  buttonsPerRow?: number | ButtonsPerRow;
}) {
  const breakpoint = useBreakpoint();

  let n: number | undefined;
  if (typeof buttonsPerRow === "number") {
    n = buttonsPerRow;
  } else if (buttonsPerRow) {
    n =
      buttonsPerRow[breakpoint] ??
      buttonsPerRow.large ??
      buttonsPerRow.medium ??
      buttonsPerRow.small;
  }

  return (
    <div
      style={
        n
          ? {
              display: "grid",
              gridTemplateColumns: `repeat(${n}, 1fr)`,
              gap: "8px",
              width: "100%",
            }
          : { display: "flex", gap: "8px", flexWrap: "wrap", width: "100%" }
      }
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          style={{
            fontSize: "0.95rem",
            padding: "6px 16px",
            borderRadius: "8px",
            border: `2px solid ${item.active ? "#111" : "#d1d5db"}`,
            background: item.active ? "#fff" : "#f0f0f0",
            color: item.active ? "#111" : "#666",
            cursor: "pointer",
            fontWeight: item.active ? 700 : 400,
            transition: "all 0.15s",
            ...(n ? {} : { flex: "1 1 0" }),
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
        backgroundColor: "#111",
        color: "#fff",
        cursor: "pointer",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span>{label}</span>
    </button>
  );
}

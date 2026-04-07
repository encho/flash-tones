import { useState } from "react";
import NoteFlashCard from "./NoteFlashCard";

interface NoteEntry {
  note: string;
  type: "INDEX" | "NOTE";
}

interface HitResult {
  note: string;
  totalTime: number;
  effectiveTime: number;
}

interface NoteFlashCardGameProps {
  notes: NoteEntry[];
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
}

export default function NoteFlashCardGame({
  notes,
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
}: NoteFlashCardGameProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [results, setResults] = useState<HitResult[]>([]);

  const isFinished = activeIndex >= notes.length;
  const currentNote = notes[activeIndex];

  function handleNoteHit(result: HitResult) {
    setHits((h) => h + 1);
    setResults((prev) => [...prev, result]);
    setActiveIndex((i) => i + 1);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "24px",
      }}
    >
      {/* Game state header */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          alignItems: "center",
          padding: "12px 24px",
          backgroundColor: "#f8f8f8",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          fontSize: "0.9rem",
          color: "#444",
          width: "100%",
          maxWidth: "600px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <span style={{ color: "#888" }}>Note </span>
          <strong>
            {isFinished ? notes.length : activeIndex + 1} / {notes.length}
          </strong>
        </div>
        <div>
          <span style={{ color: "#888" }}>Hit </span>
          <strong style={{ color: "#22c55e" }}>{hits}</strong>
        </div>
        <div>
          <span style={{ color: "#888" }}>Remaining </span>
          <strong>{Math.max(0, notes.length - activeIndex)}</strong>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {isFinished ? (
            <span style={{ color: "#22c55e", fontWeight: 700 }}>✅ Done!</span>
          ) : (
            <span>
              <span style={{ color: "#888" }}>Sing </span>
              <strong style={{ color: "#6366f1" }}>{currentNote.note}</strong>
              {pitch === "Bb" && (
                <span style={{ color: "#888", fontSize: "0.78rem" }}>
                  {" "}
                  (concert: Bb)
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {notes.map((n, i) => (
          <NoteFlashCard
            key={n.note}
            note={n.note}
            type={n.type}
            isActive={activeIndex === i}
            matchCents={matchCents}
            displayRange={displayRange}
            holdDuration={holdDuration}
            pitch={pitch}
            onNoteHit={handleNoteHit}
          />
        ))}
      </div>

      {/* Restart */}
      {isFinished && (
        <button
          onClick={() => {
            setActiveIndex(0);
            setHits(0);
            setResults([]);
          }}
          style={{
            marginTop: "8px",
            padding: "10px 28px",
            fontSize: "1rem",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#6366f1",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Restart
        </button>
      )}
      {/* Results table */}
      {results.length > 0 && (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "600px",
            fontSize: "0.85rem",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Note</th>
              <th style={thStyle}>Total time (s)</th>
              <th style={thStyle}>Effective time (s)</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr
                key={i}
                style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}
              >
                <td style={tdStyle}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: "#6366f1" }}>
                  {r.note}
                </td>
                <td style={tdStyle}>{(r.totalTime / 1000).toFixed(2)}</td>
                <td style={tdStyle}>{(r.effectiveTime / 1000).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  color: "#555",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#333",
};

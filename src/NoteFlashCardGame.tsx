import { useMemo, useState } from "react";
import NoteFlashCard from "./NoteFlashCard";
import { useThreeNoteSignal } from "./signals";
import { Button3NotesSignal } from "./Buttons";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// All chromatic notes from F#3 (MIDI 54) to C5 (MIDI 72)
const ALL_NOTES: string[] = [];
for (let octave = 3; octave <= 5; octave++) {
  for (let si = 0; si < NOTE_NAMES.length; si++) {
    const midi = (octave + 1) * 12 + si;
    if (midi >= 54 && midi <= 72) {
      ALL_NOTES.push(`${NOTE_NAMES[si]}${octave}`);
    }
  }
}

function generateRandomNotes(count = 5): NoteEntry[] {
  const shuffled = [...ALL_NOTES].sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, count)
    .map((note) => ({ note, type: "NOTE" as const }));
}

export interface NoteEntry {
  note: string;
  type: "INDEX" | "NOTE";
}

export { generateRandomNotes };

interface HitResult {
  note: string;
  totalTime: number;
  effectiveTime: number;
  timedOut?: boolean;
}

interface NoteFlashCardGameProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
  onExit?: () => void;
  timeLimitMs?: number;
  initialStarted?: boolean;
  onStart?: () => void;
}

export default function NoteFlashCardGame({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
  onExit,
  timeLimitMs = 5000,
  initialStarted = false,
  onStart,
}: NoteFlashCardGameProps) {
  const [noteCount, setNoteCount] = useState(5);
  const activeNotes = useMemo(
    () => generateRandomNotes(noteCount),
    [noteCount],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [results, setResults] = useState<HitResult[]>([]);
  const [started, setStarted] = useState(initialStarted);
  const [failed, setFailed] = useState(false);

  function startGame() {
    setStarted(true);
    onStart?.();
  }

  const isFinished = activeIndex >= activeNotes.length || failed;

  const startOnsetCount = useThreeNoteSignal(!started, startGame);
  const closeOnsetCount = useThreeNoteSignal(isFinished, () => onExit?.());

  const currentNote = activeNotes[activeIndex];

  function handleNoteHit(result: HitResult) {
    setHits((h) => h + 1);
    setResults((prev) => [...prev, result]);
    setActiveIndex((i) => i + 1);
  }

  function handleTimeLimit() {
    const note = activeNotes[activeIndex]?.note ?? "?";
    setResults((prev) => [
      ...prev,
      {
        note,
        totalTime: timeLimitMs,
        effectiveTime: timeLimitMs,
        timedOut: true,
      },
    ]);
    setFailed(true);
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
      {/* Game state header — only while game is running */}
      {started && !isFinished && (
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
              {isFinished ? activeNotes.length : activeIndex + 1} /{" "}
              {activeNotes.length}
            </strong>
          </div>
          <div>
            <span style={{ color: "#888" }}>Hit </span>
            <strong style={{ color: "#22c55e" }}>{hits}</strong>
          </div>
          <div>
            <span style={{ color: "#888" }}>Remaining </span>
            <strong>{Math.max(0, activeNotes.length - activeIndex)}</strong>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              onClick={() => onExit?.()}
              style={{
                fontSize: "0.8rem",
                padding: "4px 14px",
                borderRadius: "8px",
                border: "1px solid #fca5a5",
                background: "#fff",
                cursor: "pointer",
                color: "#ef4444",
              }}
            >
              Abort
            </button>
            <div>
              {isFinished ? (
                <span style={{ color: "#22c55e", fontWeight: 700 }}>
                  ✅ Done!
                </span>
              ) : (
                <span>
                  <span style={{ color: "#888" }}>Sing </span>
                  <strong style={{ color: "#6366f1" }}>
                    {currentNote.note}
                  </strong>
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
        </div>
      )}

      {/* Cards */}
      {started && !isFinished && (
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {activeNotes.map((n, i) => (
            <NoteFlashCard
              key={n.note}
              note={n.note}
              type={n.type}
              isActive={started && activeIndex === i}
              matchCents={matchCents}
              displayRange={displayRange}
              holdDuration={holdDuration}
              pitch={pitch}
              onNoteHit={handleNoteHit}
              timeLimitMs={timeLimitMs}
              onTimeLimit={handleTimeLimit}
              autoPlayMs={500}
            />
          ))}
        </div>
      )}

      {/* Start Game + Settings */}
      {!started && !isFinished && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <Button3NotesSignal
            label="Start Game"
            onsetCount={startOnsetCount}
            onClick={startGame}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "flex-start",
              backgroundColor: "#f8f8f8",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px 24px",
              minWidth: "220px",
            }}
          >
            <label
              style={{
                fontSize: "0.9rem",
                color: "#444",
                fontWeight: 600,
              }}
            >
              Notes per game
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setNoteCount(n)}
                  style={{
                    fontSize: "0.95rem",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: `2px solid ${noteCount === n ? "#6366f1" : "#d1d5db"}`,
                    background: noteCount === n ? "#6366f1" : "#fff",
                    color: noteCount === n ? "#fff" : "#444",
                    cursor: "pointer",
                    fontWeight: noteCount === n ? 700 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {n} Notes
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Close */}
      {isFinished && (
        <Button3NotesSignal
          label="Close"
          onsetCount={closeOnsetCount}
          onClick={() => onExit?.()}
          padding="10px 28px"
        />
      )}
      {/* Game status banner */}
      {isFinished && (
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            padding: "14px 20px",
            borderRadius: "12px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "1.1rem",
            ...(failed
              ? {
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                }
              : {
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #86efac",
                  color: "#16a34a",
                }),
          }}
        >
          {failed
            ? `❌ Failed — time limit reached on ${results.find((r) => r.timedOut)?.note ?? "a note"}`
            : `🎉 Success! All ${hits} notes hit!`}
        </div>
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
              <th style={thStyle}>Result</th>
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
                <td style={tdStyle}>
                  {r.timedOut ? (
                    <span style={{ color: "#ef4444", fontWeight: 600 }}>
                      ⏱ Time limit
                    </span>
                  ) : (
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>
                      ✅ Hit
                    </span>
                  )}
                </td>
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

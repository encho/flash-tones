import { useEffect, useMemo, useRef, useState } from "react";
import NoteFlashCard from "./NoteFlashCard";
import { useThreeNoteSignal } from "./signals";
import { Button3NotesSignal, UIButtonGroup } from "./Buttons";

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

// Scale semitone patterns (intervals from root)
const SCALE_SEMITONES: Record<string, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  cMajor: [0, 2, 4, 5, 7, 9, 11], // C D E F G A B
  dMajor: [2, 4, 6, 7, 9, 11, 1], // D E F# G A B C#
};

export type ScaleKey = keyof typeof SCALE_SEMITONES;

const SCALE_LABELS: Record<ScaleKey, string> = {
  chromatic: "Chrom.",
  cMajor: "C Maj.",
  dMajor: "D Maj.",
};

function getNotesForScale(scale: ScaleKey): string[] {
  const allowed = new Set(SCALE_SEMITONES[scale]);
  return ALL_NOTES.filter((note) => {
    const match = note.match(/^([A-G][#b]?)\d$/);
    if (!match) return false;
    const name = match[1];
    const si = NOTE_NAMES.indexOf(name);
    return si !== -1 && allowed.has(si % 12);
  });
}

function generateRandomNotes(
  count = 5,
  scale: ScaleKey = "chromatic",
): NoteEntry[] {
  const pool = getNotesForScale(scale);
  if (pool.length === 0) return [];
  const result: NoteEntry[] = [];
  let lastNote: string | null = null;
  for (let i = 0; i < count; i++) {
    const candidates =
      pool.length > 1 ? pool.filter((n) => n !== lastNote) : pool;
    const note = candidates[Math.floor(Math.random() * candidates.length)];
    result.push({ note });
    lastNote = note;
  }
  return result;
}

export interface NoteEntry {
  note: string;
}

export { generateRandomNotes };

interface HitResult {
  note: string;
  totalTime: number;
  effectiveTime: number;
  timedOut?: boolean;
}

const NOTE_SEMITONES_GAME: Record<string, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};
function noteToIndexGame(note: string): number | null {
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;
  const semitone = NOTE_SEMITONES_GAME[match[1]];
  if (semitone === undefined) return null;
  const midi = (parseInt(match[2], 10) + 1) * 12 + semitone;
  return midi - 53;
}

interface NoteFlashCardGameProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
  onPitchChange?: (p: "CONCERT" | "Bb") => void;
  onExit?: () => void;
  timeLimitMs?: number;
  initialStarted?: boolean;
  onStart?: () => void;
  noteCount?: number;
  onNoteCountChange?: (n: number) => void;
  scale?: ScaleKey;
  onScaleChange?: (s: ScaleKey) => void;
  displayType?: "note" | "index" | "visual_note";
  onDisplayTypeChange?: (d: "note" | "index" | "visual_note") => void;
  prehear?: boolean;
  onPrehearChange?: (v: boolean) => void;
  precision?: "easy" | "medium" | "hard";
  onPrecisionChange?: (v: "easy" | "medium" | "hard") => void;
}

export default function NoteFlashCardGame({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
  onPitchChange,
  onExit,
  timeLimitMs = 10000,
  initialStarted = false,
  onStart,
  noteCount = 20,
  onNoteCountChange,
  scale = "chromatic",
  onScaleChange,
  displayType = "note",
  onDisplayTypeChange,
  prehear = true,
  onPrehearChange,
  precision = "easy",
  onPrecisionChange,
}: NoteFlashCardGameProps) {
  const activeNotes = useMemo(
    () => generateRandomNotes(noteCount, scale),
    [noteCount, scale],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [results, setResults] = useState<HitResult[]>([]);
  const [started, setStarted] = useState(initialStarted);
  // Slide animation: track exiting card separately
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  function startGame() {
    setStarted(true);
    onStart?.();
  }

  const isFinished = activeIndex >= activeNotes.length;

  const startOnsetCount = useThreeNoteSignal(!started, startGame);
  const closeOnsetCount = useThreeNoteSignal(isFinished, () => onExit?.());

  const currentNote = activeNotes[activeIndex];

  function handleNoteHit(result: HitResult) {
    const leaving = activeIndex;
    setExitingIndex(leaving);
    setHits((h) => h + 1);
    setResults((prev) => [...prev, result]);
    exitTimerRef.current = setTimeout(() => {
      setExitingIndex(null);
      setActiveIndex((i) => i + 1);
    }, 400);
  }

  function handleTimeLimit() {
    const note = activeNotes[activeIndex]?.note ?? "?";
    const leaving = activeIndex;
    setExitingIndex(leaving);
    setResults((prev) => [
      ...prev,
      {
        note,
        totalTime: timeLimitMs,
        effectiveTime: timeLimitMs,
        timedOut: true,
      },
    ]);
    exitTimerRef.current = setTimeout(() => {
      setExitingIndex(null);
      setActiveIndex((i) => i + 1);
    }, 400);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "16px",
        paddingBottom: isFinished || (started && !isFinished) ? "90px" : "16px",
        height: "100%",
        boxSizing: "border-box",
        overflowY: started && !isFinished ? "hidden" : "auto",
        backgroundColor: "#f3f4f6",
      }}
    >
      {/* Game state header — only while game is running */}
      {/* Fixed game footer bar */}
      {started && !isFinished && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "12px 16px",
            backgroundColor: "#fff",
            borderTop: "1px solid #c9cbd0",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "0.9rem",
            color: "#444",
            zIndex: 50,
            boxSizing: "border-box",
          }}
        >
          <style>{`
            @media (max-width: 480px) {
              .game-header-extra { display: none !important; }
            }
          `}</style>
          <div>
            <span style={{ color: "#888" }}>Note </span>
            <strong>
              {activeIndex + 1} / {activeNotes.length}
            </strong>
          </div>
          <div className="game-header-extra">
            <span style={{ color: "#888" }}>Hit </span>
            <strong style={{ color: "#222" }}>{hits}</strong>
          </div>
          <div className="game-header-extra">
            <span style={{ color: "#888" }}>Remaining </span>
            <strong>{Math.max(0, activeNotes.length - activeIndex)}</strong>
          </div>
          <div
            className="game-header-extra"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <span style={{ color: "#888" }}>Play </span>
            <strong style={{ color: "#111" }}>{currentNote.note}</strong>
          </div>
          <button
            onClick={() => onExit?.()}
            style={{
              marginLeft: "auto",
              fontSize: "0.8rem",
              padding: "4px 14px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              color: "#333",
            }}
          >
            Abort
          </button>
        </div>
      )}

      {/* Cards */}
      {started && !isFinished && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            maxWidth: "600px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          {/* Clip wrapper: padding gives shadow room; App-level overflow:hidden catches flying cards */}
          <div
            className="card-clip-wrapper"
            style={{
              position: "relative",
              padding: "16px",
              boxSizing: "border-box",
              width: "clamp(200px, 75vw, 364px)",
            }}
          >
            <div
              className="card-height-wrapper"
              style={{
                position: "relative",
                width: "100%",
              }}
            >
              <style>{`
            @keyframes slideInRight {
              from { transform: translateX(60%); opacity: 0; }
              to   { transform: translateX(0);   opacity: 1; }
            }
            @keyframes slideOutLeft {
              from { transform: translateX(0);    opacity: 1; }
              to   { transform: translateX(-60%); opacity: 0; }
            }
            .card-clip-wrapper { height: 100%; }
            .card-height-wrapper { height: 100%; }
            @media (min-width: 768px) {
              .card-clip-wrapper { height: auto; }
              .card-height-wrapper { height: clamp(248px, 68vh, 560px); }
            }
          `}</style>
              {/* Exiting card */}
              {exitingIndex !== null && activeNotes[exitingIndex] && (
                <div
                  key={`exit-${exitingIndex}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "slideOutLeft 0.4s ease forwards",
                  }}
                >
                  <NoteFlashCard
                    note={activeNotes[exitingIndex].note}
                    displayType={displayType}
                    isActive={false}
                    matchCents={matchCents}
                    displayRange={displayRange}
                    holdDuration={holdDuration}
                    pitch={pitch}
                    timeLimitMs={timeLimitMs}
                  />
                </div>
              )}
              {/* Active card */}
              {exitingIndex === null && activeNotes[activeIndex] && (
                <div
                  key={`card-${activeIndex}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation:
                      activeIndex > 0
                        ? "slideInRight 0.4s ease forwards"
                        : "none",
                  }}
                >
                  <NoteFlashCard
                    note={activeNotes[activeIndex].note}
                    displayType={displayType}
                    isActive={true}
                    matchCents={matchCents}
                    displayRange={displayRange}
                    holdDuration={holdDuration}
                    pitch={pitch}
                    onNoteHit={handleNoteHit}
                    timeLimitMs={timeLimitMs}
                    onTimeLimit={handleTimeLimit}
                    autoPlayMs={prehear ? 500 : 0}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Game + Settings */}
      {!started && !isFinished && (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
              width: "100%",
              paddingTop: "8px",
              paddingBottom: "90px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "32px",
                width: "min(420px, 92vw)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.8rem",
                  fontWeight: 700,
                  color: "#222",
                  textAlign: "center",
                }}
              >
                Note Flash Cards
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    color: "#444",
                    fontWeight: 600,
                  }}
                >
                  Notes per game
                </label>
                <UIButtonGroup
                  items={[20, 50, 100].map((n) => ({
                    label: `${n}`,
                    onClick: () => onNoteCountChange?.(n),
                    active: noteCount === n,
                  }))}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    color: "#444",
                    fontWeight: 600,
                  }}
                >
                  Scale
                </label>
                <UIButtonGroup
                  items={(Object.keys(SCALE_LABELS) as ScaleKey[]).map((s) => ({
                    label: SCALE_LABELS[s],
                    onClick: () => onScaleChange?.(s),
                    active: scale === s,
                  }))}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    color: "#444",
                    fontWeight: 600,
                  }}
                >
                  Pitch
                </label>
                <UIButtonGroup
                  items={[
                    {
                      label: "Bb",
                      onClick: () => onPitchChange?.("Bb"),
                      active: pitch === "Bb",
                    },
                    {
                      label: "Concert",
                      onClick: () => onPitchChange?.("CONCERT"),
                      active: pitch === "CONCERT",
                    },
                  ]}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    color: "#444",
                    fontWeight: 600,
                  }}
                >
                  Note Display
                </label>
                <UIButtonGroup
                  items={[
                    {
                      label: "Name",
                      onClick: () => onDisplayTypeChange?.("note"),
                      active: displayType === "note",
                    },
                    {
                      label: "Index",
                      onClick: () => onDisplayTypeChange?.("index"),
                      active: displayType === "index",
                    },
                    {
                      label: "Staff",
                      onClick: () => onDisplayTypeChange?.("visual_note"),
                      active: displayType === "visual_note",
                    },
                  ]}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    color: "#444",
                    fontWeight: 600,
                  }}
                >
                  Precision
                </label>
                <UIButtonGroup
                  items={[
                    { label: "Easy", onClick: () => onPrecisionChange?.("easy"), active: precision === "easy" },
                    { label: "Medium", onClick: () => onPrecisionChange?.("medium"), active: precision === "medium" },
                    { label: "Hard", onClick: () => onPrecisionChange?.("hard"), active: precision === "hard" },
                  ]}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <label
                  htmlFor="prehear-checkbox"
                  style={{
                    fontSize: "1rem",
                    color: "#444",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Prehear Note
                </label>
                <input
                  id="prehear-checkbox"
                  type="checkbox"
                  checked={prehear}
                  onChange={(e) => onPrehearChange?.(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    cursor: "pointer",
                    accentColor: "#111",
                  }}
                />
              </div>
            </div>
          </div>
          {/* Fixed Start Game button */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "16px",
              backgroundColor: "#fff",
              borderTop: "1px solid #c9cbd0",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Button3NotesSignal
              label="Start Challenge"
              onsetCount={startOnsetCount}
              onClick={startGame}
              width="min(420px, calc(92vw))"
              padding="18px 28px"
              fontSize="1.1rem"
            />
          </div>
        </>
      )}

      {/* Back */}
      {isFinished && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px",
            backgroundColor: "#fff",
            borderTop: "1px solid #c9cbd0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Button3NotesSignal
            label="Back"
            onsetCount={closeOnsetCount}
            onClick={() => onExit?.()}
            width="min(420px, calc(92vw))"
            padding="18px 28px"
            fontSize="1.1rem"
          />
        </div>
      )}
      {/* Game status banner */}
      {isFinished && (
        <div
          style={{
            width: "min(420px, 92vw)",
            padding: "14px 20px",
            borderRadius: "12px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "1.1rem",
            boxSizing: "border-box",
            ...(results.some((r) => r.timedOut)
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
          {results.some((r) => r.timedOut)
            ? `⏱ ${results.filter((r) => r.timedOut).length} note${results.filter((r) => r.timedOut).length === 1 ? "" : "s"} timed out`
            : `🎉 Success! All ${hits} notes hit!`}
        </div>
      )}
      {/* Summary stats */}
      {isFinished &&
        results.length > 0 &&
        (() => {
          const hit = results.filter((r) => !r.timedOut);
          const timedOut = results.filter((r) => r.timedOut);
          const avg =
            hit.length > 0
              ? hit.reduce((s, r) => s + r.effectiveTime, 0) / hit.length / 1000
              : null;
          return (
            <div
              style={{
                width: "min(420px, 92vw)",
                fontSize: "0.95rem",
                color: "#333",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <p style={{ margin: 0 }}>
                You <strong style={{ color: "#22c55e" }}>hit</strong>{" "}
                <strong style={{ color: "#22c55e" }}>{hit.length}</strong> out
                of <strong>{results.length}</strong>{" "}
                {results.length === 1 ? "note" : "notes"}.
              </p>
              {timedOut.length > 0 ? (
                <p style={{ margin: 0 }}>
                  You <strong style={{ color: "#ef4444" }}>exceeded</strong> the
                  timer on{" "}
                  <strong style={{ color: "#ef4444" }}>
                    {timedOut.length}
                  </strong>{" "}
                  {timedOut.length === 1 ? "note" : "notes"}.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  You <strong style={{ color: "#22c55e" }}>beat</strong> the
                  timer on all{" "}
                  <strong style={{ color: "#22c55e" }}>{results.length}</strong>{" "}
                  notes.
                </p>
              )}
              {avg !== null && (
                <p style={{ margin: 0 }}>
                  Your average time is <strong>{avg.toFixed(2)}s</strong> per
                  note.
                </p>
              )}
            </div>
          );
        })()}
      {/* Results table */}
      {isFinished && results.length > 0 && (
        <div
          style={{
            width: "min(420px, 92vw)",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
          }}
        >
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#fff" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Note</th>
                <th style={thStyle}>Time (s)</th>
                <th style={thStyle}>Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ backgroundColor: "#fff" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: "#111" }}>
                    {r.note}
                    {displayType === "index" && pitch === "Bb" && (
                      <span
                        style={{
                          fontWeight: 400,
                          color: "#888",
                          marginLeft: "4px",
                        }}
                      >
                        [{noteToIndexGame(r.note)}]
                      </span>
                    )}
                  </td>
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
        </div>
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

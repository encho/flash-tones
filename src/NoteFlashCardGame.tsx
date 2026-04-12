import { useEffect, useMemo, useRef, useState } from "react";
import NoteFlashCard from "./NoteFlashCard";
import { useThreeNoteSignal } from "./signals";
import { NAVBAR_HEIGHT } from "./Navbar";
import { Button3NotesSignal, UIButtonGroup } from "./Buttons";
import { SettingLabel } from "./InfoModal";

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

// Major scale intervals (semitones from root)
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

export type ScaleType = "chromatic" | "major";

// Root note semitone index (0=C … 11=B) → display label
const ROOT_NOTE_LABELS: Record<number, string> = {
  0: "C",
  1: "Db",
  2: "D",
  3: "Eb",
  4: "E",
  5: "F",
  6: "F#",
  7: "G",
  8: "Ab",
  9: "A",
  10: "Bb",
  11: "B",
};

export type SequenceType = "random" | "sequential" | "triads";

function getNotesForScale(scaleType: ScaleType, rootNote: number): string[] {
  if (scaleType === "chromatic") return ALL_NOTES;
  const allowed = new Set(MAJOR_INTERVALS.map((i) => (rootNote + i) % 12));
  return ALL_NOTES.filter((note) => {
    const match = note.match(/^([A-G][#b]?)\d$/);
    if (!match) return false;
    const si = NOTE_NAMES.indexOf(match[1]);
    return si !== -1 && allowed.has(si % 12);
  });
}

function randomFromPool(count: number, pool: string[]): NoteEntry[] {
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

function notePC(note: string): number {
  const m = note.match(/^([A-G][#b]?)\d$/);
  return m ? NOTE_NAMES.indexOf(m[1]) : -1;
}

function cycleStartOffset(cycle: string[], rootNote: number): number {
  const idx = cycle.findIndex((n) => notePC(n) === rootNote);
  return idx < 0 ? 0 : idx;
}

function sequentialFromPool(
  count: number,
  pool: string[],
  rootNote: number,
  scaleType: ScaleType,
): NoteEntry[] {
  const L = pool.length;
  if (L === 0) return [];
  if (L === 1) return Array.from({ length: count }, () => ({ note: pool[0] }));
  // up then down, shared endpoints: [0..L-1, L-2..1]
  const cycle = [...pool, ...pool.slice(1, -1).reverse()];
  const offset =
    scaleType === "chromatic" ? 0 : cycleStartOffset(cycle, rootNote);
  return Array.from({ length: count }, (_, i) => ({
    note: cycle[(offset + i) % cycle.length],
  }));
}

function triadsFromPool(
  count: number,
  pool: string[],
  rootNote: number,
  scaleType: ScaleType,
): NoteEntry[] {
  // Chromatic: major-chord intervals (+4 semitones then +3); diatonic: every other scale degree (+2 then +2)
  const steps: [number, number] = scaleType === "chromatic" ? [4, 3] : [2, 2];
  const [s1, s2] = steps;
  const totalStep = s1 + s2;
  const L = pool.length;
  if (L === 0) return [];
  if (L <= totalStep)
    return Array.from({ length: count }, (_, i) => ({ note: pool[i % L] }));

  // For chromatic always start at the lowest note (gStart=0); for major find the root
  let gStart = 0;
  if (scaleType !== "chromatic") {
    for (let g = 0; g + totalStep <= L - 1; g++) {
      if (notePC(pool[g]) === rootNote) {
        gStart = g;
        break;
      }
    }
  }

  const push = (seq: string[], g: number, up: boolean) => {
    const idxs = up ? [g, g + s1, g + totalStep] : [g, g - s1, g - totalStep];
    for (const idx of idxs) if (idx >= 0 && idx < L) seq.push(pool[idx]);
  };

  const seq: string[] = [];
  // Ascending from gStart to top
  for (let g = gStart; g + totalStep <= L - 1; g++) push(seq, g, true);
  // Descending from L-1 to 0
  for (let g = L - 1; g - totalStep >= 0; g--) push(seq, g, false);
  // Wrap-around ascending from 0 to gStart (exclusive)
  for (let g = 0; g < gStart && g + totalStep <= L - 1; g++) push(seq, g, true);

  if (seq.length === 0) return [];
  return Array.from({ length: count }, (_, i) => ({
    note: seq[i % seq.length],
  }));
}

function generateRandomNotes(
  count = 5,
  scaleType: ScaleType = "chromatic",
  rootNote = 0,
  sequenceType: SequenceType = "random",
): NoteEntry[] {
  const pool = getNotesForScale(scaleType, rootNote);
  if (pool.length === 0) return [];
  if (sequenceType === "sequential")
    return sequentialFromPool(count, pool, rootNote, scaleType);
  if (sequenceType === "triads")
    return triadsFromPool(count, pool, rootNote, scaleType);
  return randomFromPool(count, pool);
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
  onTimeLimitChange?: (v: number) => void;
  initialStarted?: boolean;
  onStart?: () => void;
  noteCount?: number;
  onNoteCountChange?: (n: number) => void;
  sequenceType?: SequenceType;
  onSequenceTypeChange?: (s: SequenceType) => void;
  scaleType?: ScaleType;
  onScaleTypeChange?: (s: ScaleType) => void;
  rootNote?: number;
  onRootNoteChange?: (n: number) => void;
  displayType?: "note" | "index" | "visual_note";
  onDisplayTypeChange?: (d: "note" | "index" | "visual_note") => void;
  prehear?: boolean;
  onPrehearChange?: (v: boolean) => void;
  precision?: "easy" | "medium" | "hard";
  onPrecisionChange?: (v: "easy" | "medium" | "hard") => void;
  holdTime?: "low" | "medium" | "high";
  onHoldTimeChange?: (v: "low" | "medium" | "high") => void;
}

export default function NoteFlashCardGame({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
  onPitchChange,
  onExit,
  timeLimitMs = 10000,
  onTimeLimitChange,
  initialStarted = false,
  onStart,
  noteCount = 20,
  onNoteCountChange,
  sequenceType = "random" as SequenceType,
  onSequenceTypeChange,
  scaleType = "chromatic" as ScaleType,
  onScaleTypeChange,
  rootNote = 0,
  onRootNoteChange,
  displayType = "note",
  onDisplayTypeChange,
  prehear = true,
  onPrehearChange,
  precision = "easy",
  onPrecisionChange,
  holdTime = "low",
  onHoldTimeChange,
}: NoteFlashCardGameProps) {
  const activeNotes = useMemo(
    () => generateRandomNotes(noteCount, scaleType, rootNote, sequenceType),
    [noteCount, scaleType, rootNote, sequenceType],
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
      style={
        started && !isFinished
          ? {
              position: "fixed",
              top: NAVBAR_HEIGHT,
              bottom: 0,
              left: 0,
              right: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              paddingBottom: "90px",
              boxSizing: "border-box",
              backgroundColor: "#f3f4f6",
            }
          : {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "16px",
              paddingBottom: "114px",
              boxSizing: "border-box",
              backgroundColor: "#f3f4f6",
            }
      }
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
                <SettingLabel
                  text="Notes Sequence"
                  info="Controls the order in which notes are presented. Random picks notes unpredictably. Sequential moves up then down through the scale range. Triads groups every other note into chord-like sets, ascending then descending."
                />
                <UIButtonGroup
                  items={(
                    [
                      ["random", "Random"],
                      ["sequential", "Sequential"],
                      ["triads", "Triads"],
                    ] as [SequenceType, string][]
                  ).map(([v, label]) => ({
                    label,
                    onClick: () => onSequenceTypeChange?.(v),
                    active: sequenceType === v,
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
                <SettingLabel
                  text="Notes per game"
                  info="How many notes you will be asked to play on trumpet before the results are shown."
                />
                <UIButtonGroup
                  items={[5, 10, 20, 50, 100].map((n) => ({
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
                <SettingLabel
                  text="Scale Type"
                  info="Chromatic uses all 19 available notes. Major restricts notes to the 7 notes of the selected major key."
                />
                <UIButtonGroup
                  items={[
                    {
                      label: "Chromatic",
                      onClick: () => onScaleTypeChange?.("chromatic"),
                      active: scaleType === "chromatic",
                    },
                    {
                      label: "Major",
                      onClick: () => onScaleTypeChange?.("major"),
                      active: scaleType === "major",
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
                  opacity: scaleType === "chromatic" ? 0.35 : 1,
                  transition: "opacity 0.2s",
                  pointerEvents: scaleType === "chromatic" ? "none" : "auto",
                }}
              >
                <SettingLabel
                  text="Root Note"
                  info="The tonic of the major scale. Only active when Scale Type is Major. Sequential and Triads sequences start from this note."
                />
                <UIButtonGroup
                  buttonsPerRow={{ small: 3, medium: 4, large: 4 }}
                  items={Object.entries(ROOT_NOTE_LABELS).map(([k, label]) => ({
                    label,
                    onClick: () => onRootNoteChange?.(Number(k)),
                    active: rootNote === Number(k),
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
                <SettingLabel
                  text="Pitch"
                  info="Bb transposes all displayed note names up a whole tone for Bb instruments (e.g. trumpet, clarinet). Concert shows concert-pitch note names."
                />
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
                <SettingLabel
                  text="Note Display"
                  info="Name shows the note letter (e.g. C#4). Index shows the fingering number for Bb instruments. Staff shows the note on a treble clef staff."
                />
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
                <SettingLabel
                  text="Precision"
                  info="How closely your pitch must match the target. Loose: ±50 cents. Tight: ±35 cents. Strict: ±20 cents. (100 cents = 1 semitone)"
                />
                <UIButtonGroup
                  items={[
                    {
                      label: "Loose",
                      onClick: () => onPrecisionChange?.("easy"),
                      active: precision === "easy",
                    },
                    {
                      label: "Tight",
                      onClick: () => onPrecisionChange?.("medium"),
                      active: precision === "medium",
                    },
                    {
                      label: "Strict",
                      onClick: () => onPrecisionChange?.("hard"),
                      active: precision === "hard",
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
                <SettingLabel
                  text="Hold Time"
                  info="How long you must hold the correct pitch before it registers as a hit. Short: 300ms. Medium: 500ms. Long: 1000ms."
                />
                <UIButtonGroup
                  items={[
                    {
                      label: "Short",
                      onClick: () => onHoldTimeChange?.("low"),
                      active: holdTime === "low",
                    },
                    {
                      label: "Medium",
                      onClick: () => onHoldTimeChange?.("medium"),
                      active: holdTime === "medium",
                    },
                    {
                      label: "Long",
                      onClick: () => onHoldTimeChange?.("high"),
                      active: holdTime === "high",
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
                <SettingLabel
                  text="Time Limit"
                  info="Maximum time allowed per note. If you don't hit the note within this window it is marked as timed out and the next note appears."
                />
                <UIButtonGroup
                  items={[2000, 5000, 10000].map((ms) => ({
                    label: `${ms / 1000}s`,
                    onClick: () => onTimeLimitChange?.(ms),
                    active: timeLimitMs === ms,
                  }))}
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
                <SettingLabel
                  text="Prehear Note"
                  info="When enabled, the target note is played automatically a short moment after the card appears, so you can hear the pitch before playing it on trumpet."
                />
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
                  <td style={tdStyle}>
                    {r.timedOut ? "—" : (r.effectiveTime / 1000).toFixed(2)}
                  </td>
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

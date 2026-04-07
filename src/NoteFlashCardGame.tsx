import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import NoteFlashCard from "./NoteFlashCard";

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

// All chromatic notes from F#3 (MIDI 54) to G5 (MIDI 79)
const ALL_NOTES: string[] = [];
for (let octave = 3; octave <= 5; octave++) {
  for (let si = 0; si < NOTE_NAMES.length; si++) {
    const midi = (octave + 1) * 12 + si;
    if (midi >= 54 && midi <= 79) {
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
}

interface NoteFlashCardGameProps {
  notes: NoteEntry[];
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
  onExit?: () => void;
}

export default function NoteFlashCardGame({
  notes,
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
  onExit,
}: NoteFlashCardGameProps) {
  const activeNotes = notes;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [results, setResults] = useState<HitResult[]>([]);
  const [started, setStarted] = useState(false);
  const [onsetCount, setOnsetCount] = useState(0);
  const onsetTimesRef = useRef<number[]>([]);
  const [abortOnsetCount, setAbortOnsetCount] = useState(0);
  const abortOnsetTimesRef = useRef<number[]>([]);

  // ── Auto-start tuning constants ──────────────────────────────────────────
  // All 3 onsets must fall within this window (ms)
  const ONSET_WINDOW_MS = 500;
  // RMS loudness threshold (0–1); notes quieter than this are ignored
  const ONSET_LOUDNESS_THRESHOLD = 0.08;

  // Listen for 3 quick note onsets to auto-start (so the user keeps hands on instrument)
  useEffect(() => {
    if (started) return;

    let stopped = false;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let prevClarityHigh = false;
    onsetTimesRef.current = [];
    setOnsetCount(0);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch {
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);

      function rms(buf: Float32Array) {
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        return Math.sqrt(sum / buf.length);
      }

      function tick() {
        if (stopped) return;
        analyser.getFloatTimeDomainData(buffer);
        const [, clarity] = detector.findPitch(buffer, audioCtx!.sampleRate);
        const loud = rms(buffer) >= ONSET_LOUDNESS_THRESHOLD;
        const isHigh = clarity > 0.9 && loud;

        if (isHigh && !prevClarityHigh) {
          // Rising edge = new note onset
          const now = performance.now();
          const times = onsetTimesRef.current;
          times.push(now);
          // Keep only onsets within the window
          const cutoff = now - ONSET_WINDOW_MS;
          while (times.length > 0 && times[0] < cutoff) times.shift();
          setOnsetCount(times.length);
          if (times.length >= 3) {
            setStarted(true);
            stopped = true;
            return;
          }
        }

        prevClarityHigh = isHigh;
        raf = requestAnimationFrame(tick);
      }
      tick();
    })();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    };
  }, [started]);

  // Listen for 3 quick onsets while in-game to abort
  const isFinished = activeIndex >= activeNotes.length;
  useEffect(() => {
    if (!started || isFinished) return;

    let stopped = false;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let prevClarityHigh = false;
    abortOnsetTimesRef.current = [];
    setAbortOnsetCount(0);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch {
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);

      function rms(buf: Float32Array) {
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        return Math.sqrt(sum / buf.length);
      }

      function tick() {
        if (stopped) return;
        analyser.getFloatTimeDomainData(buffer);
        const [, clarity] = detector.findPitch(buffer, audioCtx!.sampleRate);
        const loud = rms(buffer) >= ONSET_LOUDNESS_THRESHOLD;
        const isHigh = clarity > 0.9 && loud;

        if (isHigh && !prevClarityHigh) {
          const now = performance.now();
          const times = abortOnsetTimesRef.current;
          times.push(now);
          const cutoff = now - ONSET_WINDOW_MS;
          while (times.length > 0 && times[0] < cutoff) times.shift();
          setAbortOnsetCount(times.length);
          if (times.length >= 3) {
            onExit?.();
            stopped = true;
            return;
          }
        }

        prevClarityHigh = isHigh;
        raf = requestAnimationFrame(tick);
      }
      tick();
    })();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      setAbortOnsetCount(0);
    };
  }, [started, isFinished]);

  const currentNote = activeNotes[activeIndex];

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
          {started && !isFinished && (
            <span
              style={{
                fontSize: "0.75rem",
                color: abortOnsetCount > 0 ? "#ef4444" : "#ccc",
              }}
            >
              {"●".repeat(abortOnsetCount) +
                "○".repeat(Math.max(0, 3 - abortOnsetCount))}
            </span>
          )}
          <div>
            {isFinished ? (
              <span style={{ color: "#22c55e", fontWeight: 700 }}>
                ✅ Done!
              </span>
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
      </div>

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
            />
          ))}
        </div>
      )}

      {/* Start Game */}
      {!started && !isFinished && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            onClick={() => setStarted(true)}
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
            Start Game
          </button>
          <div style={{ fontSize: "0.78rem", color: "#888" }}>
            or play 3 notes on your instrument{" "}
            <span style={{ color: "#6366f1", fontWeight: 700 }}>
              {onsetCount > 0
                ? "●".repeat(onsetCount) +
                  "○".repeat(Math.max(0, 3 - onsetCount))
                : "○○○"}
            </span>
          </div>
        </div>
      )}

      {/* Exit */}
      {isFinished && (
        <button
          onClick={() => {
            onExit?.();
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
          Exit
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

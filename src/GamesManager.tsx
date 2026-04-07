import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import NoteFlashCardGame, { generateRandomNotes } from "./NoteFlashCardGame";
import type { NoteEntry } from "./NoteFlashCardGame";

// ── Onset tuning (same constants as in-game) ──────────────────────────────
const ONSET_WINDOW_MS = 500;
const ONSET_LOUDNESS_THRESHOLD = 0.08;

interface GamesManagerProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
}

export default function GamesManager({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
}: GamesManagerProps) {
  const [currentNotes, setCurrentNotes] = useState<NoteEntry[] | null>(null);
  const [gameKey, setGameKey] = useState(0);
  const [onsetCount, setOnsetCount] = useState(0);
  const onsetTimesRef = useRef<number[]>([]);

  function startNewGame() {
    setCurrentNotes(generateRandomNotes());
    setGameKey((k) => k + 1);
    setOnsetCount(0);
    onsetTimesRef.current = [];
  }

  function exitGame() {
    setCurrentNotes(null);
    setOnsetCount(0);
    onsetTimesRef.current = [];
  }

  // Listen for 3 quick onsets in the menu to auto-start a new game
  useEffect(() => {
    if (currentNotes !== null) return;

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
          const now = performance.now();
          const times = onsetTimesRef.current;
          times.push(now);
          const cutoff = now - ONSET_WINDOW_MS;
          while (times.length > 0 && times[0] < cutoff) times.shift();
          setOnsetCount(times.length);
          if (times.length >= 3) {
            stopped = true;
            startNewGame();
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
  }, [currentNotes]);

  // ── Playing state ──────────────────────────────────────────────────────
  if (currentNotes !== null) {
    return (
      <NoteFlashCardGame
        key={gameKey}
        notes={currentNotes}
        matchCents={matchCents}
        displayRange={displayRange}
        holdDuration={holdDuration}
        pitch={pitch}
        onExit={exitGame}
      />
    );
  }

  // ── Menu ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        padding: "48px 24px",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#222" }}>
        🎵 Flash Tones
      </h2>
      <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
        Sing the displayed notes to complete each round.
      </p>

      <button
        onClick={startNewGame}
        style={{
          padding: "12px 36px",
          fontSize: "1.1rem",
          borderRadius: "12px",
          border: "none",
          backgroundColor: "#6366f1",
          color: "#fff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        New Game
      </button>

      <div style={{ fontSize: "0.78rem", color: "#888", textAlign: "center" }}>
        or play 3 notes on your instrument{" "}
        <span style={{ color: "#6366f1", fontWeight: 700 }}>
          {onsetCount > 0
            ? "●".repeat(onsetCount) + "○".repeat(Math.max(0, 3 - onsetCount))
            : "○○○"}
        </span>
      </div>
    </div>
  );
}

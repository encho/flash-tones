import { useEffect, useRef, useState } from "react";

interface NoteFlashCardProps {
  note: string;
  type: "INDEX" | "NOTE";
  isActive?: boolean;
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  onNoteHit?: () => void;
}

const NOTE_SEMITONES: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

function noteToFrequency(note: string): number | null {
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;
  const [, name, octaveStr] = match;
  const semitone = NOTE_SEMITONES[name];
  if (semitone === undefined) return null;
  const octave = parseInt(octaveStr, 10);
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playNote(note: string) {
  const freq = noteToFrequency(note);
  if (!freq) return;
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 1.5);
}

// ── Pitch detection ────────────────────────────────────────────────────────

function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);

  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // too quiet

  let bestOffset = -1;
  let bestCorrelation = 0;
  let foundGoodCorrelation = false;
  let lastCorrelation = 1;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      break;
    }
    lastCorrelation = correlation;
  }

  if (bestOffset === -1) return -1;
  return sampleRate / bestOffset;
}

// ── Constants ───────────────────────────────────────────────────────────────

// ── Component ───────────────────────────────────────────────────────────────

function NoteFlashCard({
  note,
  type,
  isActive = false,
  matchCents = 50,
  displayRange = 400,
  holdDuration = 800,
  onNoteHit,
}: NoteFlashCardProps) {
  const [cents, setCents] = useState<number | null>(null);
  const [matched, setMatched] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const firedRef = useRef(false);
  const inRangeSinceRef = useRef<number | null>(null);
  const hitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNoteHitRef = useRef(onNoteHit);
  useEffect(() => {
    onNoteHitRef.current = onNoteHit;
  }, [onNoteHit]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const targetFreq = noteToFrequency(note);

  useEffect(() => {
    if (!isActive || !targetFreq) return;

    let stopped = false;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch {
        return; // mic denied
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);

      function tick() {
        if (stopped) return;
        analyser.getFloatTimeDomainData(buffer);
        const freq = autoCorrelate(buffer, ctx.sampleRate);
        if (freq > 0) {
          const c = 1200 * Math.log2(freq / targetFreq!);
          setCents(c);
          if (Math.abs(c) < matchCents) {
            const now = performance.now();
            if (inRangeSinceRef.current === null) {
              inRangeSinceRef.current = now;
            }
            const elapsed = now - inRangeSinceRef.current;
            const progress = Math.min(elapsed / holdDuration, 1);
            setHoldProgress(progress);
            if (progress >= 1 && !firedRef.current) {
              firedRef.current = true;
              // Render bar at 100% first, then show ✅ and fire callback
              hitTimeoutRef.current = setTimeout(() => {
                setMatched(true);
                onNoteHitRef.current?.();
              }, 120);
            }
          } else {
            inRangeSinceRef.current = null;
            setHoldProgress(0);
          }
        } else {
          setCents(null);
          inRangeSinceRef.current = null;
          setHoldProgress(0);
        }
        rafRef.current = requestAnimationFrame(tick);
      }
      tick();
    })();

    return () => {
      stopped = true;
      firedRef.current = false;
      inRangeSinceRef.current = null;
      if (hitTimeoutRef.current) clearTimeout(hitTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      setCents(null);
      setMatched(false);
      setHoldProgress(0);
    };
  }, [isActive, targetFreq]);

  // Needle position: −1 (flat) … 0 (in tune) … +1 (sharp)
  const clamped =
    cents !== null ? Math.max(-displayRange, Math.min(displayRange, cents)) : 0;
  const position = clamped / displayRange;

  const needleColor =
    cents === null
      ? "#9ca3af"
      : Math.abs(cents) < matchCents
        ? "#22c55e"
        : Math.abs(cents) < matchCents * 1.5
          ? "#eab308"
          : "#ef4444";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "160px",
        minHeight: "220px",
        padding: "20px 0",
        border: `2px solid ${isActive ? "#6366f1" : "#ccc"}`,
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: isActive
          ? "0 0 14px rgba(99,102,241,0.35)"
          : "0 2px 8px rgba(0,0,0,0.15)",
        gap: "8px",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#222" }}>
        {note}
      </span>
      <span
        style={{ fontSize: "0.85rem", color: "#888", letterSpacing: "0.1em" }}
      >
        {type}
      </span>
      <button
        onClick={() => playNote(note)}
        style={{
          marginTop: "4px",
          padding: "6px 18px",
          fontSize: "0.85rem",
          borderRadius: "8px",
          border: "1px solid #aaa",
          backgroundColor: "#f0f0f0",
          cursor: "pointer",
        }}
      >
        ▶ Play
      </button>

      {isActive && (
        <div style={{ width: "120px", marginTop: "8px", textAlign: "center" }}>
          {matched ? (
            <div style={{ fontSize: "2rem" }}>✅</div>
          ) : (
            <>
              {/* Tuner bar */}
              <div
                style={{
                  position: "relative",
                  height: "10px",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "5px",
                }}
              >
                {/* Tolerance zone */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    height: "100%",
                    width: `${(matchCents / displayRange) * 100}%`,
                    left: `${50 - (matchCents / displayRange) * 50}%`,
                    backgroundColor: "rgba(34,197,94,0.25)",
                    borderRadius: "3px",
                  }}
                />
                {/* Centre tick */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    height: "100%",
                    width: "2px",
                    backgroundColor: "#9ca3af",
                    transform: "translateX(-50%)",
                  }}
                />
                {/* Moving needle */}
                <div
                  style={{
                    position: "absolute",
                    top: "-5px",
                    left: `calc(50% + ${position * 50}%)`,
                    transform: "translateX(-50%)",
                    width: "6px",
                    height: "20px",
                    backgroundColor: needleColor,
                    borderRadius: "3px",
                    transition: "left 0.08s linear, background-color 0.15s",
                  }}
                />
              </div>
              {/* Cents label */}
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: needleColor,
                }}
              >
                {cents !== null
                  ? `${cents > 0 ? "+" : ""}${Math.round(cents)}¢`
                  : "🎤 listening…"}
              </div>
              {/* Hold progress bar */}
              <div
                style={{
                  marginTop: "8px",
                  height: "6px",
                  width: "100%",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${holdProgress * 100}%`,
                    backgroundColor: holdProgress > 0 ? "#22c55e" : "#d1d5db",
                    borderRadius: "3px",
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NoteFlashCard;

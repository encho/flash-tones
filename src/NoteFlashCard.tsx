import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import * as Tone from "tone";

interface NoteFlashCardProps {
  note: string;
  type: "INDEX" | "NOTE";
  isActive?: boolean;
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
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

const TRANSPOSE_SEMITONES: Record<string, number> = {
  CONCERT: 0,
  Bb: -2, // Bb instrument: written note sounds a major 2nd lower
};

function noteToFrequency(note: string, transposeSemitones = 0): number | null {
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;
  const [, name, octaveStr] = match;
  const semitone = NOTE_SEMITONES[name];
  if (semitone === undefined) return null;
  const octave = parseInt(octaveStr, 10);
  const midi = (octave + 1) * 12 + semitone + transposeSemitones;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

async function playNote(note: string, transposeSemitones = 0): Promise<void> {
  await Tone.start();
  const transposedNote = Tone.Frequency(note)
    .transpose(transposeSemitones)
    .toNote();
  const durationSec = Tone.Time("2n").toSeconds();
  const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 1.2 },
  }).toDestination();
  synth.triggerAttackRelease(transposedNote, "2n");
  return new Promise((resolve) =>
    setTimeout(resolve, (durationSec + 1.2) * 1000),
  );
}

// ── TunerBar ────────────────────────────────────────────────────────────────

interface TunerBarProps {
  cents: number | null;
  matchCents: number;
  displayRange: number;
}

function TunerBar({ cents, matchCents, displayRange }: TunerBarProps) {
  const clamped =
    cents !== null ? Math.max(-displayRange, Math.min(displayRange, cents)) : 0;
  // 0% = far left, 50% = centre, 100% = far right
  const needlePct = ((clamped + displayRange) / (2 * displayRange)) * 100;
  const toleranceHalfPct = (matchCents / displayRange) * 50;

  const inTolerance = cents !== null && Math.abs(cents) < matchCents;
  const nearTolerance = cents !== null && Math.abs(cents) < matchCents * 1.5;
  const color =
    cents === null
      ? "#9ca3af"
      : inTolerance
        ? "#22c55e"
        : nearTolerance
          ? "#eab308"
          : "#ef4444";

  return (
    <>
      {/* Track */}
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
            bottom: 0,
            left: `${50 - toleranceHalfPct}%`,
            width: `${toleranceHalfPct * 2}%`,
            backgroundColor: "rgba(34,197,94,0.3)",
          }}
        />
        {/* Centre tick */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "calc(50% - 1px)",
            width: "2px",
            backgroundColor: "#9ca3af",
          }}
        />
        {/* Needle */}
        <div
          style={{
            position: "absolute",
            top: "-5px",
            bottom: "-5px",
            left: `${needlePct}%`,
            width: "4px",
            marginLeft: "-2px",
            backgroundColor: color,
            borderRadius: "2px",
          }}
        />
      </div>
      {/* Cents label */}
      <div
        style={{
          marginTop: "8px",
          fontSize: "0.72rem",
          fontWeight: 600,
          color,
        }}
      >
        {cents !== null
          ? `${cents > 0 ? "+" : ""}${Math.round(cents)}¢`
          : "🎤 listening…"}
      </div>
    </>
  );
}

// ── HoldProgressBar ─────────────────────────────────────────────────────────

interface HoldProgressBarProps {
  progress: number;
}

function HoldProgressBar({ progress }: HoldProgressBarProps) {
  return (
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
          width: `${progress * 100}%`,
          backgroundColor: progress > 0 ? "#22c55e" : "#d1d5db",
          borderRadius: "3px",
        }}
      />
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

function NoteFlashCard({
  note,
  type,
  isActive = false,
  matchCents = 50,
  displayRange = 400,
  holdDuration = 800,
  pitch = "CONCERT",
  onNoteHit,
}: NoteFlashCardProps) {
  const [cents, setCents] = useState<number | null>(null);
  const [matched, setMatched] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const firedRef = useRef(false);
  const matchCentsRef = useRef(matchCents);
  const holdDurationRef = useRef(holdDuration);
  useEffect(() => {
    matchCentsRef.current = matchCents;
  }, [matchCents]);
  useEffect(() => {
    holdDurationRef.current = holdDuration;
  }, [holdDuration]);
  const inRangeSinceRef = useRef<number | null>(null);
  const hitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const smoothedCentsRef = useRef<number | null>(null);
  const onNoteHitRef = useRef(onNoteHit);
  useEffect(() => {
    onNoteHitRef.current = onNoteHit;
  }, [onNoteHit]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const targetFreq = noteToFrequency(note, TRANSPOSE_SEMITONES[pitch] ?? 0);

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
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);

      function tick() {
        if (stopped) return;
        analyser.getFloatTimeDomainData(buffer);
        const [rawFreq, clarity] = detector.findPitch(buffer, ctx.sampleRate);
        if (clarity > 0.9 && rawFreq > 0 && !isPlayingRef.current) {
          // Octave correction: shift detected frequency by octaves until it is
          // within ±600¢ (half an octave) of the target. Pitchy can return the
          // sub-octave or super-octave of a singing voice.
          let freq = rawFreq;
          const target = targetFreq!;
          while (freq < target / Math.SQRT2) freq *= 2;
          while (freq > target * Math.SQRT2) freq /= 2;

          const c = 1200 * Math.log2(freq / target);
          // EMA smoothing for display only (α=0.25 → ~4 frame lag at 60fps)
          // Matching uses raw c so responsiveness is not affected.
          const prev = smoothedCentsRef.current;
          const smoothed = prev === null ? c : 0.25 * c + 0.75 * prev;
          smoothedCentsRef.current = smoothed;
          setCents(smoothed);
          if (Math.abs(c) < matchCentsRef.current) {
            const now = performance.now();
            if (inRangeSinceRef.current === null) {
              inRangeSinceRef.current = now;
            }
            const elapsed = now - inRangeSinceRef.current;
            const progress = Math.min(elapsed / holdDurationRef.current, 1);
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
          smoothedCentsRef.current = null;
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
        onClick={async () => {
          isPlayingRef.current = true;
          inRangeSinceRef.current = null;
          setHoldProgress(0);
          await playNote(note, TRANSPOSE_SEMITONES[pitch] ?? 0);
          isPlayingRef.current = false;
        }}
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
              <TunerBar
                cents={cents}
                matchCents={matchCents}
                displayRange={displayRange}
              />
              <HoldProgressBar progress={holdProgress} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NoteFlashCard;

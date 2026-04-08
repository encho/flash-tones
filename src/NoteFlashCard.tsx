import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import * as Tone from "tone";
import { Renderer, Stave, StaveNote, Formatter, Voice, Accidental } from "vexflow";

interface NoteFlashCardProps {
  note: string;
  displayType?: "note" | "index" | "visual_note";
  isActive?: boolean;
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
  onNoteHit?: (result: {
    totalTime: number;
    effectiveTime: number;
    note: string;
  }) => void;
  timeLimitMs?: number;
  onTimeLimit?: () => void;
  autoPlayMs?: number;
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

// F#3 (MIDI 54) = index 1, G3 (MIDI 55) = index 2, …
function noteToIndex(note: string): number | null {
  const match = note.match(/^([A-G][#b]?)(\d)$/);
  if (!match) return null;
  const semitone = NOTE_SEMITONES[match[1]];
  if (semitone === undefined) return null;
  const midi = (parseInt(match[2], 10) + 1) * 12 + semitone;
  return midi - 53;
}

// ── NoteStaff ───────────────────────────────────────────────────────────────

/** Convert a note string like "F#3", "G3", "Bb4" to VexFlow key format: "f#/3", "g/3", "bb/4" */
function toVexKey(note: string): string {
  const m = note.match(/^([A-G][#b]?)(\.?\d)$/);
  if (!m) return "c/4";
  const name = m[1].toLowerCase().replace("#", "#");
  return `${name}/${m[2]}`;
}

function NoteStaff({ note }: { note: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";

    const W = container.clientWidth || 280;
    const H = container.clientHeight || 160;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(W, H);
    const context = renderer.getContext();

    // Centre the stave horizontally; leave room for clef
    const staveX = 10;
    const staveWidth = W - 20;
    const staveY = H / 2 - 40;

    const stave = new Stave(staveX, staveY, staveWidth);
    stave.addClef("treble");
    stave.setContext(context).draw();

    const vexKey = toVexKey(note);
    const accidental = note.match(/([#b])/);
    const staveNote = new StaveNote({
      keys: [vexKey],
      duration: "w",
    });
    if (accidental) {
      staveNote.addModifier(new Accidental(accidental[1]));
    }

    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.setStrict(false);
    voice.addTickable(staveNote);

    new Formatter().joinVoices([voice]).format([voice], staveWidth - 80);
    voice.draw(context, stave);

    // Style: thinner lines, no fill on note head
    const svg = container.querySelector("svg");
    if (svg) {
      svg.style.overflow = "visible";
    }
  }, [note]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    />
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

  return (
    <>
      {/* Track */}
      <div
        style={{
          position: "relative",
          height: "20px",
          background:
            "linear-gradient(to right, #ef4444, #f97316 25%, #22c55e 50%, #f97316 75%, #ef4444)",
          borderRadius: "3px",
        }}
      >
        {/* Centre tick */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "calc(50% - 1px)",
            width: "1px",
            backgroundColor: "rgba(0,0,0,0.65)",
          }}
        />
        {/* Left match boundary */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${50 - toleranceHalfPct}%`,
            width: "1px",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        />
        {/* Right match boundary */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${50 + toleranceHalfPct}%`,
            width: "1px",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        />
        {/* Needle — hidden when idle */}
        {cents !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${needlePct}%`,
              width: "4px",
              marginLeft: "-2px",
              backgroundColor: "#111",
              borderRadius: 0,
              opacity: 1,
            }}
          />
        )}
      </div>
    </>
  );
}

// ── TimerDonut ─────────────────────────────────────────────────────────────

function TimerDonut({ progress }: { progress: number }) {
  const r = 13;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(progress, 1));
  const color =
    progress < 0.6 ? "#22c55e" : progress < 0.85 ? "#eab308" : "#ef4444";

  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      style={{ display: "block" }}
    >
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="4"
      />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 16 16)"
        style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s" }}
      />
    </svg>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

function NoteFlashCard({
  note,
  displayType = "note",
  isActive = false,
  matchCents = 50,
  displayRange = 400,
  holdDuration = 800,
  pitch = "CONCERT",
  onNoteHit,
  timeLimitMs = 5000,
  onTimeLimit,
  autoPlayMs = 0,
}: NoteFlashCardProps) {
  const [cents, setCents] = useState<number | null>(null);
  const [matched, setMatched] = useState(false);
  const [, setHoldProgress] = useState(0);
  const [displayTimes, setDisplayTimes] = useState<{
    total: number;
    effective: number;
  } | null>(null);
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
  const onTimeLimitRef = useRef(onTimeLimit);
  useEffect(() => {
    onTimeLimitRef.current = onTimeLimit;
  }, [onTimeLimit]);
  const timeLimitMsRef = useRef(timeLimitMs);
  useEffect(() => {
    timeLimitMsRef.current = timeLimitMs;
  }, [timeLimitMs]);
  const timeLimitFiredRef = useRef(false);
  const timeLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Timing: when this card became active, and total time spent playing the example
  const activatedAtRef = useRef<number | null>(null);
  const totalPlayTimeRef = useRef(0);
  const playStartRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  // Live elapsed time display (100 ms tick)
  useEffect(() => {
    if (!isActive) {
      setDisplayTimes(null);
      return;
    }
    const id = setInterval(() => {
      if (activatedAtRef.current === null) return;
      const total = performance.now() - activatedAtRef.current;
      const playingNow =
        playStartRef.current !== null
          ? performance.now() - playStartRef.current
          : 0;
      const effective = Math.max(
        0,
        total - totalPlayTimeRef.current - playingNow,
      );
      setDisplayTimes({
        total: Math.round(total),
        effective: Math.round(effective),
      });
    }, 100);
    return () => clearInterval(id);
  }, [isActive]);

  const targetFreq = noteToFrequency(note, TRANSPOSE_SEMITONES[pitch] ?? 0);

  useEffect(() => {
    if (!isActive || !targetFreq) return;

    activatedAtRef.current = performance.now();
    totalPlayTimeRef.current = 0;
    timeLimitFiredRef.current = false;
    let stopped = false;

    // Auto-play the note on activation
    if (autoPlayMs > 0) {
      isPlayingRef.current = true;
      playStartRef.current = performance.now();
      Tone.start().then(() => {
        const transposedNote = Tone.Frequency(note)
          .transpose(TRANSPOSE_SEMITONES[pitch] ?? 0)
          .toNote();
        const synth = new Tone.Synth({
          oscillator: { type: "triangle" },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.01 },
        }).toDestination();
        synth.triggerAttackRelease(transposedNote, autoPlayMs / 1000);
        setTimeout(() => {
          if (playStartRef.current !== null) {
            totalPlayTimeRef.current +=
              performance.now() - playStartRef.current;
            playStartRef.current = null;
          }
          isPlayingRef.current = false;
        }, autoPlayMs);
      });
    }

    // Time-limit countdown
    if (timeLimitMsRef.current != null) {
      timeLimitTimeoutRef.current = setTimeout(() => {
        if (!timeLimitFiredRef.current && !firedRef.current) {
          timeLimitFiredRef.current = true;
          onTimeLimitRef.current?.();
        }
      }, timeLimitMsRef.current);
    }

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
          const freq = rawFreq;
          const target = targetFreq!;

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
              const totalTime =
                performance.now() -
                (activatedAtRef.current ?? performance.now());
              const effectiveTime = totalTime - totalPlayTimeRef.current;
              // Render bar at 100% first, then show ✅ and fire callback
              hitTimeoutRef.current = setTimeout(() => {
                setMatched(true);
                onNoteHitRef.current?.({
                  totalTime: Math.round(totalTime),
                  effectiveTime: Math.round(effectiveTime),
                  note,
                });
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
      timeLimitFiredRef.current = false;
      activatedAtRef.current = null;
      totalPlayTimeRef.current = 0;
      inRangeSinceRef.current = null;
      if (hitTimeoutRef.current) clearTimeout(hitTimeoutRef.current);
      if (timeLimitTimeoutRef.current)
        clearTimeout(timeLimitTimeoutRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      setCents(null);
      setMatched(false);
      setHoldProgress(0);
      setDisplayTimes(null);
    };
  }, [isActive, targetFreq]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: "100%",
        height: "100%",
        padding: "clamp(16px, 3vh, 28px) 12px",
        border: `2px solid ${isActive ? "#111" : "#ccc"}`,
        borderRadius: "12px",
        backgroundColor: "#fff",
        boxShadow: isActive
          ? "0 8px 32px rgba(0,0,0,0.22)"
          : "0 2px 12px rgba(0,0,0,0.10)",
        gap: "1rem",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxSizing: "border-box",
      }}
    >
      {displayType === "visual_note" ? (
        <NoteStaff note={note} />
      ) : (
        <span
          style={{
            fontSize: "clamp(4rem, 16vh, 10rem)",
            lineHeight: "1",
            fontWeight: "bold",
            color: "#222",
          }}
        >
          {displayType === "index" ? (noteToIndex(note) ?? note) : note}
        </span>
      )}

      {isActive && !matched && displayTimes && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
          }}
        >
          <TimerDonut progress={displayTimes.total / timeLimitMs} />
        </div>
      )}

      {isActive && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            right: "12px",
            textAlign: "center",
          }}
        >
          {matched ? (
            <div style={{ fontSize: "2rem" }}>✅</div>
          ) : (
            <TunerBar
              cents={cents}
              matchCents={matchCents}
              displayRange={displayRange}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default NoteFlashCard;

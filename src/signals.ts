import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";

// ── Tuning constants ─────────────────────────────────────────────────────────
/** All 3 onsets must arrive within this window (ms) to fire the signal. */
export const ONSET_WINDOW_MS = 350;
/** RMS loudness gate (0–1). Onsets quieter than this are ignored. */
export const ONSET_LOUDNESS_THRESHOLD = 0.15;

/**
 * Detects 3 loud note onsets within ONSET_WINDOW_MS and calls `onSignal`.
 *
 * @param enabled - Turn detection on/off (e.g. pass a boolean condition).
 * @param onSignal - Stable callback invoked once when the signal fires.
 * @returns Current onset count (0–3) for UI feedback.
 */
export function useThreeNoteSignal(
  enabled: boolean,
  onSignal: () => void,
): number {
  const [count, setCount] = useState(0);
  const onSignalRef = useRef(onSignal);
  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let stopped = false;
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let prevClarityHigh = false;
    const onsetTimes: number[] = [];
    setCount(0);

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
          onsetTimes.push(now);
          const cutoff = now - ONSET_WINDOW_MS;
          while (onsetTimes.length > 0 && onsetTimes[0] < cutoff)
            onsetTimes.shift();
          setCount(onsetTimes.length);
          if (onsetTimes.length >= 3) {
            stopped = true;
            onSignalRef.current();
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
      setCount(0);
    };
  }, [enabled]);

  return count;
}

/** Renders ●/○ circles for a 3-note signal indicator. */
export function onsetDots(count: number): string {
  return "●".repeat(count) + "○".repeat(Math.max(0, 3 - count));
}

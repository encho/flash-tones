import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import NoteFlashCardGame, {
  type ScaleType,
  type SequenceType,
} from "./NoteFlashCardGame";
import NoteFlashCardSettings from "./NoteFlashCardSettings";

const LS_KEY = "flashtones_settings";

type StoredSettings = {
  noteCount?: number;
  sequenceType?: SequenceType;
  scaleType?: ScaleType;
  rootNote?: number;
  displayType?: "note" | "index" | "visual_note";
  pitch?: "CONCERT" | "Bb";
  prehear?: boolean;
  precision?: "easy" | "medium" | "hard";
  holdTime?: "low" | "medium" | "high";
  timeLimit?: number;
};

const NOTE_COUNT_OPTIONS = [5, 10, 20, 50, 100];
const TIME_LIMIT_OPTIONS = [2000, 5000, 10000];

const LEGACY_MAJOR_ROOTS: Record<string, number> = {
  cMajor: 0,
  gMajor: 7,
  dMajor: 2,
  aMajor: 9,
  eMajor: 4,
  bMajor: 11,
  fsMajor: 6,
  dbMajor: 1,
  abMajor: 8,
  ebMajor: 3,
  bbMajor: 10,
  fMajor: 5,
};

function normalizeSettings(raw: unknown): StoredSettings {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: StoredSettings = {};

  if (
    typeof src.noteCount === "number" &&
    NOTE_COUNT_OPTIONS.includes(src.noteCount)
  ) {
    out.noteCount = src.noteCount;
  }

  if (
    src.sequenceType === "random" ||
    src.sequenceType === "sequential" ||
    src.sequenceType === "triads"
  ) {
    out.sequenceType = src.sequenceType;
  }

  if (src.scaleType === "chromatic" || src.scaleType === "major") {
    out.scaleType = src.scaleType;
  }

  if (
    typeof src.rootNote === "number" &&
    Number.isInteger(src.rootNote) &&
    src.rootNote >= 0 &&
    src.rootNote <= 11
  ) {
    out.rootNote = src.rootNote;
  }

  if (
    src.displayType === "note" ||
    src.displayType === "index" ||
    src.displayType === "visual_note"
  ) {
    out.displayType = src.displayType;
  }

  if (src.pitch === "CONCERT" || src.pitch === "Bb") {
    out.pitch = src.pitch;
  }

  if (typeof src.prehear === "boolean") {
    out.prehear = src.prehear;
  }

  if (
    src.precision === "easy" ||
    src.precision === "medium" ||
    src.precision === "hard"
  ) {
    out.precision = src.precision;
  }

  if (
    src.holdTime === "low" ||
    src.holdTime === "medium" ||
    src.holdTime === "high"
  ) {
    out.holdTime = src.holdTime;
  }

  if (
    typeof src.timeLimit === "number" &&
    TIME_LIMIT_OPTIONS.includes(src.timeLimit)
  ) {
    out.timeLimit = src.timeLimit;
  } else if (
    typeof src.timeLimitMs === "number" &&
    TIME_LIMIT_OPTIONS.includes(src.timeLimitMs)
  ) {
    // Legacy key migration support
    out.timeLimit = src.timeLimitMs;
  }

  // Legacy scale migration support (older deployments used a single "scale" key)
  if (!out.scaleType && typeof src.scale === "string") {
    if (src.scale === "chromatic") {
      out.scaleType = "chromatic";
    } else if (src.scale in LEGACY_MAJOR_ROOTS) {
      out.scaleType = "major";
      if (out.rootNote === undefined)
        out.rootNote = LEGACY_MAJOR_ROOTS[src.scale];
    }
  }

  return out;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalizeSettings(JSON.parse(raw));
  } catch {}
  return {};
}

function saveSettings(patch: Record<string, unknown>) {
  try {
    const current = loadSettings();
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {}
}

interface FlashGamePageProps {
  displayRange?: number;
}

type Precision = "easy" | "medium" | "hard";
const PRECISION_CENTS: Record<Precision, number> = {
  easy: 50,
  medium: 35,
  hard: 20,
};

type HoldTime = "low" | "medium" | "high";
const HOLD_TIME_MS: Record<HoldTime, number> = {
  low: 300,
  medium: 500,
  high: 1000,
};

export default function FlashGamePage({
  displayRange = 300,
}: FlashGamePageProps) {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();

  const saved = loadSettings();

  const [noteCount, setNoteCountState] = useState<number>(saved.noteCount ?? 5);
  const [sequenceType, setSequenceTypeState] = useState<SequenceType>(
    saved.sequenceType ?? "random",
  );
  const [scaleType, setScaleTypeState] = useState<ScaleType>(
    saved.scaleType ?? "chromatic",
  );
  const [rootNote, setRootNoteState] = useState<number>(saved.rootNote ?? 0);
  const [displayType, setDisplayTypeState] = useState<
    "note" | "index" | "visual_note"
  >(saved.displayType ?? "note");
  const [pitch, setPitchState] = useState<"CONCERT" | "Bb">(
    saved.pitch ?? "Bb",
  );
  const [prehear, setPrehearState] = useState<boolean>(saved.prehear ?? true);
  const [precision, setPrecisionState] = useState<Precision>(
    saved.precision ?? "easy",
  );
  const [holdTime, setHoldTimeState] = useState<HoldTime>(
    saved.holdTime ?? "low",
  );
  const [timeLimit, setTimeLimitState] = useState<number>(
    saved.timeLimit ?? 10000,
  );

  const matchCents = PRECISION_CENTS[precision];
  const holdDuration = HOLD_TIME_MS[holdTime];

  function setNoteCount(v: number) {
    setNoteCountState(v);
    saveSettings({ noteCount: v });
  }
  function setSequenceType(v: SequenceType) {
    setSequenceTypeState(v);
    saveSettings({ sequenceType: v });
  }
  function setScaleType(v: ScaleType) {
    setScaleTypeState(v);
    saveSettings({ scaleType: v });
  }
  function setRootNote(v: number) {
    setRootNoteState(v);
    saveSettings({ rootNote: v });
  }
  function setDisplayType(v: "note" | "index" | "visual_note") {
    setDisplayTypeState(v);
    saveSettings({ displayType: v });
  }
  function setPitch(v: "CONCERT" | "Bb") {
    setPitchState(v);
    saveSettings({ pitch: v });
  }
  function setPrehear(v: boolean) {
    setPrehearState(v);
    saveSettings({ prehear: v });
  }
  function setPrecision(v: Precision) {
    setPrecisionState(v);
    saveSettings({ precision: v });
  }
  function setHoldTime(v: HoldTime) {
    setHoldTimeState(v);
    saveSettings({ holdTime: v });
  }
  function setTimeLimit(v: number) {
    setTimeLimitState(v);
    saveSettings({ timeLimit: v });
  }

  function handleStart() {
    const id = crypto.randomUUID();
    navigate(`/flash-game/${id}`);
  }

  function handleExit() {
    navigate("/flash-game");
  }

  return (
    <>
      {!gameId && (
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            paddingTop: "24px",
          }}
        >
          <NoteFlashCardSettings
            noteCount={noteCount}
            onNoteCountChange={setNoteCount}
            sequenceType={sequenceType}
            onSequenceTypeChange={setSequenceType}
            scaleType={scaleType}
            onScaleTypeChange={setScaleType}
            rootNote={rootNote}
            onRootNoteChange={setRootNote}
            pitch={pitch}
            onPitchChange={setPitch}
            displayType={displayType}
            onDisplayTypeChange={setDisplayType}
            precision={precision}
            onPrecisionChange={setPrecision}
            holdTime={holdTime}
            onHoldTimeChange={setHoldTime}
            timeLimitMs={timeLimit}
            onTimeLimitChange={setTimeLimit}
            prehear={prehear}
            onPrehearChange={setPrehear}
          />
        </div>
      )}
      <NoteFlashCardGame
        key={location.key}
        matchCents={matchCents}
        displayRange={displayRange}
        holdDuration={holdDuration}
        pitch={pitch}
        onExit={handleExit}
        initialStarted={!!gameId}
        onStart={handleStart}
        noteCount={noteCount}
        sequenceType={sequenceType}
        scaleType={scaleType}
        rootNote={rootNote}
        displayType={displayType}
        prehear={prehear}
        timeLimitMs={timeLimit}
      />
    </>
  );
}

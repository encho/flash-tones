import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import NoteFlashCardGame, {
  type ScaleType,
  type SequenceType,
} from "./NoteFlashCardGame";
import NoteFlashCardSettings from "./NoteFlashCardSettings";

const LS_KEY = "flashtones_settings";
const SETTINGS_VERSION = 1 as const;

type Precision = "easy" | "medium" | "hard";
type HoldTime = "low" | "medium" | "high";

type NoteFlashCardsSettings = {
  noteCount: number;
  sequenceType: SequenceType;
  scaleType: ScaleType;
  rootNote: number;
  displayType: "note" | "index" | "visual_note";
  pitch: "CONCERT" | "Bb";
  prehear: boolean;
  precision: Precision;
  holdTime: HoldTime;
  timeLimit: number;
};

type SettingsV1 = {
  version: typeof SETTINGS_VERSION;
  noteFlashCards: NoteFlashCardsSettings;
};

const NOTE_COUNT_OPTIONS = [5, 10, 20, 50, 100];
const TIME_LIMIT_OPTIONS = [2000, 5000, 10000];

const DEFAULT_NOTE_FLASH_CARDS_SETTINGS: NoteFlashCardsSettings = {
  noteCount: 5,
  sequenceType: "random",
  scaleType: "chromatic",
  rootNote: 0,
  displayType: "note",
  pitch: "Bb",
  prehear: true,
  precision: "easy",
  holdTime: "low",
  timeLimit: 10000,
};

const DEFAULT_SETTINGS_V1: SettingsV1 = {
  version: SETTINGS_VERSION,
  noteFlashCards: DEFAULT_NOTE_FLASH_CARDS_SETTINGS,
};

function isNoteFlashCardsSettings(raw: unknown): raw is NoteFlashCardsSettings {
  if (!raw || typeof raw !== "object") return false;
  const src = raw as Record<string, unknown>;
  return (
    typeof src.noteCount === "number" &&
    NOTE_COUNT_OPTIONS.includes(src.noteCount) &&
    (src.sequenceType === "random" ||
      src.sequenceType === "sequential" ||
      src.sequenceType === "triads") &&
    (src.scaleType === "chromatic" || src.scaleType === "major") &&
    typeof src.rootNote === "number" &&
    Number.isInteger(src.rootNote) &&
    src.rootNote >= 0 &&
    src.rootNote <= 11 &&
    (src.displayType === "note" ||
      src.displayType === "index" ||
      src.displayType === "visual_note") &&
    (src.pitch === "CONCERT" || src.pitch === "Bb") &&
    typeof src.prehear === "boolean" &&
    (src.precision === "easy" ||
      src.precision === "medium" ||
      src.precision === "hard") &&
    (src.holdTime === "low" ||
      src.holdTime === "medium" ||
      src.holdTime === "high") &&
    typeof src.timeLimit === "number" &&
    TIME_LIMIT_OPTIONS.includes(src.timeLimit)
  );
}

function isSettingsV1(raw: unknown): raw is SettingsV1 {
  if (!raw || typeof raw !== "object") return false;
  const src = raw as Record<string, unknown>;
  return (
    src.version === SETTINGS_VERSION &&
    isNoteFlashCardsSettings(src.noteFlashCards)
  );
}

function persistSettings(settings: SettingsV1) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isSettingsV1(parsed)) return parsed.noteFlashCards;
    }
  } catch {}

  // First rollout of versioned settings: clear any previous schema and initialize v1.
  try {
    localStorage.removeItem(LS_KEY);
    persistSettings(DEFAULT_SETTINGS_V1);
  } catch {}
  return { ...DEFAULT_NOTE_FLASH_CARDS_SETTINGS };
}

function saveSettings(patch: Partial<NoteFlashCardsSettings>) {
  try {
    const current = loadSettings();
    persistSettings({
      version: SETTINGS_VERSION,
      noteFlashCards: { ...current, ...patch },
    });
  } catch {}
}

interface FlashGamePageProps {
  displayRange?: number;
}

const PRECISION_CENTS: Record<Precision, number> = {
  easy: 50,
  medium: 35,
  hard: 20,
};

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

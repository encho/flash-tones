import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import NoteFlashCardGame, { type ScaleKey } from "./NoteFlashCardGame";

const LS_KEY = "flashtones_settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
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
  holdDuration?: number;
}

type Precision = "easy" | "medium" | "hard";
const PRECISION_CENTS: Record<Precision, number> = {
  easy: 50,
  medium: 35,
  hard: 20,
};

export default function FlashGamePage({
  displayRange = 300,
  holdDuration = 300,
}: FlashGamePageProps) {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();

  const saved = loadSettings();

  const [noteCount, setNoteCountState] = useState<number>(saved.noteCount ?? 5);
  const [scale, setScaleState] = useState<ScaleKey>(saved.scale ?? "chromatic");
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

  const matchCents = PRECISION_CENTS[precision];

  function setNoteCount(v: number) {
    setNoteCountState(v);
    saveSettings({ noteCount: v });
  }
  function setScale(v: ScaleKey) {
    setScaleState(v);
    saveSettings({ scale: v });
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

  function handleStart() {
    const id = crypto.randomUUID();
    navigate(`/flash-game/${id}`);
  }

  function handleExit() {
    navigate("/flash-game");
  }

  return (
    <NoteFlashCardGame
      key={location.key}
      matchCents={matchCents}
      displayRange={displayRange}
      holdDuration={holdDuration}
      pitch={pitch}
      onPitchChange={setPitch}
      onExit={handleExit}
      initialStarted={!!gameId}
      onStart={handleStart}
      noteCount={noteCount}
      onNoteCountChange={setNoteCount}
      scale={scale}
      onScaleChange={setScale}
      displayType={displayType}
      onDisplayTypeChange={setDisplayType}
      prehear={prehear}
      onPrehearChange={setPrehear}
      precision={precision}
      onPrecisionChange={setPrecision}
    />
  );
}

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useState } from "react";
import NoteFlashCardGame, { type ScaleKey } from "./NoteFlashCardGame";

interface FlashGamePageProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
}

export default function FlashGamePage({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
}: FlashGamePageProps) {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();

  const [noteCount, setNoteCount] = useState(5);
  const [scale, setScale] = useState<ScaleKey>("chromatic");
  const [displayType, setDisplayType] = useState<"note" | "index">("note");
  const [pitch, setPitch] = useState<"CONCERT" | "Bb">("Bb");

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
    />
  );
}

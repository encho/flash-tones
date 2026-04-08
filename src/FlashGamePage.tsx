import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NoteFlashCardGame, { generateRandomNotes } from "./NoteFlashCardGame";

interface FlashGamePageProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
}

export default function FlashGamePage({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
}: FlashGamePageProps) {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const [noteCount, setNoteCount] = useState(3);
  const notes = useMemo(() => generateRandomNotes(noteCount), [noteCount]);

  function handleStart() {
    const id = crypto.randomUUID();
    navigate(`/flash-game/${id}`);
  }

  function handleExit() {
    navigate("/");
  }

  function handleNoteCountChange(count: number) {
    setNoteCount(count);
  }

  return (
    <NoteFlashCardGame
      notes={notes}
      matchCents={matchCents}
      displayRange={displayRange}
      holdDuration={holdDuration}
      pitch={pitch}
      onExit={handleExit}
      noteCount={noteCount}
      onNoteCountChange={gameId ? undefined : handleNoteCountChange}
      initialStarted={!!gameId}
      onStart={handleStart}
    />
  );
}

import { useNavigate, useParams } from "react-router-dom";
import NoteFlashCardGame from "./NoteFlashCardGame";

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

  function handleStart() {
    const id = crypto.randomUUID();
    navigate(`/flash-game/${id}`);
  }

  function handleExit() {
    navigate("/");
  }

  return (
    <NoteFlashCardGame
      matchCents={matchCents}
      displayRange={displayRange}
      holdDuration={holdDuration}
      pitch={pitch}
      onExit={handleExit}
      initialStarted={!!gameId}
      onStart={handleStart}
    />
  );
}

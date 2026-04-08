import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  const location = useLocation();

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
      onExit={handleExit}
      initialStarted={!!gameId}
      onStart={handleStart}
    />
  );
}

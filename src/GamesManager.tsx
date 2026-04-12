import { useNavigate } from "react-router-dom";
import { Button3NotesSignal } from "./Buttons";

interface GamesManagerProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
}

export default function GamesManager({}: GamesManagerProps) {
  const navigate = useNavigate();

  function startNewGame() {
    navigate("/flash-game");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        padding: "48px 24px",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <Button3NotesSignal
        label="New Game"
        onClick={startNewGame}
        fontSize="1.1rem"
        padding="12px 36px"
      />
    </div>
  );
}

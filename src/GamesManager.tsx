import { useNavigate } from "react-router-dom";
import { useThreeNoteSignal } from "./signals";
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

  const onsetCount = useThreeNoteSignal(true, startNewGame);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        padding: "48px 24px",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#222" }}>
        🎵 Flash Tones
      </h2>
      <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
        Sing the displayed notes to complete each round.
      </p>

      <Button3NotesSignal
        label="New Game"
        onsetCount={onsetCount}
        onClick={startNewGame}
        fontSize="1.1rem"
        padding="12px 36px"
      />
    </div>
  );
}

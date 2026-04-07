import { useState } from "react";
import NoteFlashCardGame, { generateRandomNotes } from "./NoteFlashCardGame";
import type { NoteEntry } from "./NoteFlashCardGame";
import { useThreeNoteSignal } from "./signals";
import { Button3NotesSignal } from "./Buttons";

interface GamesManagerProps {
  matchCents?: number;
  displayRange?: number;
  holdDuration?: number;
  pitch?: "CONCERT" | "Bb";
}

export default function GamesManager({
  matchCents = 50,
  displayRange = 300,
  holdDuration = 300,
  pitch = "CONCERT",
}: GamesManagerProps) {
  const [currentNotes, setCurrentNotes] = useState<NoteEntry[] | null>(null);
  const [gameKey, setGameKey] = useState(0);

  function startNewGame() {
    setCurrentNotes(generateRandomNotes());
    setGameKey((k) => k + 1);
  }

  function exitGame() {
    setCurrentNotes(null);
  }

  const onsetCount = useThreeNoteSignal(currentNotes === null, startNewGame);

  // ── Playing state ──────────────────────────────────────────────────────
  if (currentNotes !== null) {
    return (
      <NoteFlashCardGame
        key={gameKey}
        notes={currentNotes}
        matchCents={matchCents}
        displayRange={displayRange}
        holdDuration={holdDuration}
        pitch={pitch}
        onExit={exitGame}
      />
    );
  }

  // ── Menu ───────────────────────────────────────────────────────────────
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

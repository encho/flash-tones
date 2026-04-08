import { Routes, Route, Navigate } from "react-router-dom";
import GamesManager from "./GamesManager";
import FlashGamePage from "./FlashGamePage";
import "./App.css";

const GAME_PROPS = {
  matchCents: 50,
  displayRange: 300,
  holdDuration: 300,
  pitch: "Bb" as const,
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<GamesManager {...GAME_PROPS} />} />
      <Route path="/flash-game" element={<FlashGamePage {...GAME_PROPS} />} />
      <Route
        path="/flash-game/:gameId"
        element={<FlashGamePage {...GAME_PROPS} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

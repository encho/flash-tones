import { Routes, Route, Navigate } from "react-router-dom";
import FlashGamePage from "./FlashGamePage";
import Navbar from "./Navbar";
import "./App.css";

const GAME_PROPS = {
  displayRange: 300,
  holdDuration: 300,
  pitch: "Bb" as const,
};

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <Navbar />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/flash-game" replace />} />
          <Route
            path="/flash-game"
            element={<FlashGamePage {...GAME_PROPS} />}
          />
          <Route
            path="/flash-game/:gameId"
            element={<FlashGamePage {...GAME_PROPS} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;

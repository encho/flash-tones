import GamesManager from "./GamesManager";
import "./App.css";

function App() {
  return (
    <GamesManager
      matchCents={50}
      displayRange={300}
      holdDuration={300}
      pitch="Bb"
    />
  );
}

export default App;

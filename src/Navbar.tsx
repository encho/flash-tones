import { useNavigate } from "react-router-dom";

export const NAVBAR_HEIGHT = 56;

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: `${NAVBAR_HEIGHT}px`,
        backgroundColor: "#fff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      <button
        onClick={() => navigate("/")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "8px",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>🎵</span>
        <span
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "#111",
            letterSpacing: "0.03em",
          }}
        >
          Notes Trainer
        </span>
      </button>
    </header>
  );
}

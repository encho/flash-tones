import { useEffect, useRef, useState } from "react";

interface InfoModalProps {
  title: string;
  text: string;
  onClose: () => void;
}

export function InfoModal({ title, text, onClose }: InfoModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on mount
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleClose() {
    setVisible(false);
    // Wait for exit transition before unmounting
    setTimeout(onClose, 180);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        backgroundColor: `rgba(0,0,0,${visible ? 0.35 : 0})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        transition: "background-color 0.18s ease",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "24px",
          maxWidth: "380px",
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          position: "relative",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.97)",
          transition: "opacity 0.18s ease, transform 0.18s ease",
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "12px",
            right: "14px",
            background: "none",
            border: "none",
            fontSize: "1.3rem",
            cursor: "pointer",
            color: "#888",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "1rem", color: "#111", textAlign: "left" }}>
          {title}
        </p>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#444", lineHeight: "1.5", textAlign: "left" }}>
          {text}
        </p>
      </div>
    </div>
  );
}

interface SettingLabelProps {
  text: string;
  info: string;
}

export function SettingLabel({ text, info }: SettingLabelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "1rem", color: "#444", fontWeight: 600 }}>{text}</span>
        <button
          onClick={() => setOpen(true)}
          aria-label={`Info about ${text}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            color: "#888",
            fontSize: "1.05rem",
            display: "flex",
            alignItems: "center",
            opacity: 1,
          }}
        >
          ⓘ
        </button>
      </div>
      {open && <InfoModal title={text} text={info} onClose={() => setOpen(false)} />}
    </>
  );
}

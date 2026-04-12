import { UIButtonGroup } from "./Buttons";
import { SettingLabel } from "./InfoModal";
import {
  AVAILABLE_RANGE_NOTES,
  formatNoteLabel,
  formatPitchClassLabel,
  type AccidentalDisplay,
  type ScaleFamily,
  type ScaleMode,
  type SequenceType,
} from "./NoteFlashCardGame";

interface NoteFlashCardSettingsProps {
  noteCount: number;
  onNoteCountChange?: (n: number) => void;
  sequenceType: SequenceType;
  onSequenceTypeChange?: (s: SequenceType) => void;
  scaleFamily: ScaleFamily;
  onScaleFamilyChange?: (s: ScaleFamily) => void;
  scaleMode: ScaleMode;
  onScaleModeChange?: (s: ScaleMode) => void;
  rootNote: number;
  onRootNoteChange?: (n: number) => void;
  lowestNote: string;
  onLowestNoteChange?: (n: string) => void;
  highestNote: string;
  onHighestNoteChange?: (n: string) => void;
  accidentalDisplay: AccidentalDisplay;
  onAccidentalDisplayChange?: (v: AccidentalDisplay) => void;
  pitch: "CONCERT" | "Bb";
  onPitchChange?: (p: "CONCERT" | "Bb") => void;
  displayType: "note" | "index" | "visual_note";
  onDisplayTypeChange?: (d: "note" | "index" | "visual_note") => void;
  precision: "easy" | "medium" | "hard";
  onPrecisionChange?: (v: "easy" | "medium" | "hard") => void;
  holdTime: "low" | "medium" | "high";
  onHoldTimeChange?: (v: "low" | "medium" | "high") => void;
  timeLimitMs: number;
  onTimeLimitChange?: (v: number) => void;
  prehear: boolean;
  onPrehearChange?: (v: boolean) => void;
}

export default function NoteFlashCardSettings({
  noteCount,
  onNoteCountChange,
  sequenceType,
  onSequenceTypeChange,
  scaleFamily,
  onScaleFamilyChange,
  scaleMode,
  onScaleModeChange,
  rootNote,
  onRootNoteChange,
  lowestNote,
  onLowestNoteChange,
  highestNote,
  onHighestNoteChange,
  accidentalDisplay,
  onAccidentalDisplayChange,
  pitch,
  onPitchChange,
  displayType,
  onDisplayTypeChange,
  precision,
  onPrecisionChange,
  holdTime,
  onHoldTimeChange,
  timeLimitMs,
  onTimeLimitChange,
  prehear,
  onPrehearChange,
}: NoteFlashCardSettingsProps) {
  const selectStyle: React.CSSProperties = {
    width: "100%",
    fontSize: "1rem",
    padding: "10px 12px",
    minHeight: "44px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111",
    appearance: "auto",
    WebkitAppearance: "menulist",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: "32px",
        width: "min(420px, 92vw)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "1.8rem",
          fontWeight: 700,
          color: "#222",
          textAlign: "left",
        }}
      >
        Note Flash Cards
      </h2>
      <p
        style={{
          margin: "-20px 0 0 0",
          fontSize: "0.95rem",
          lineHeight: 1.4,
          color: "#555",
          textAlign: "left",
        }}
      >
        Build speed and accuracy by recognizing, hearing, and playing notes
        across your selected trumpet range.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <SettingLabel
          text="Prehear Note"
          info="When enabled, the target note is played automatically a short moment after the card appears, so you can hear the pitch before playing it on trumpet."
        />
        <input
          id="prehear-checkbox"
          type="checkbox"
          checked={prehear}
          onChange={(e) => onPrehearChange?.(e.target.checked)}
          style={{
            width: "18px",
            height: "18px",
            cursor: "pointer",
            accentColor: "#111",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Pitch"
          info="Bb transposes all displayed note names up a whole tone for Bb instruments (e.g. trumpet, clarinet). Concert shows concert-pitch note names."
        />
        <UIButtonGroup
          items={[
            {
              label: "Bb",
              onClick: () => onPitchChange?.("Bb"),
              active: pitch === "Bb",
            },
            {
              label: "Concert",
              onClick: () => onPitchChange?.("CONCERT"),
              active: pitch === "CONCERT",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Notes per game"
          info="How many notes you will be asked to play on trumpet before the results are shown."
        />
        <UIButtonGroup
          items={[5, 10, 20, 50, 100].map((n) => ({
            label: `${n}`,
            onClick: () => onNoteCountChange?.(n),
            active: noteCount === n,
          }))}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Notes Sequence"
          info="Controls the order in which notes are presented. Random picks notes unpredictably. Sequential moves up then down through the scale range. Triads groups every other note into chord-like sets, ascending then descending."
        />
        <UIButtonGroup
          items={(
            [
              ["random", "Random"],
              ["sequential", "Sequential"],
              ["triads", "Triads"],
            ] as [SequenceType, string][]
          ).map(([v, label]) => ({
            label,
            onClick: () => onSequenceTypeChange?.(v),
            active: sequenceType === v,
          }))}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Accidentals Display"
          info="Controls how accidental note names are displayed in Name mode and in note dropdowns. b uses flats, # uses sharps, both shows both forms."
        />
        <UIButtonGroup
          items={[
            {
              label: "b",
              onClick: () => onAccidentalDisplayChange?.("flat"),
              active: accidentalDisplay === "flat",
            },
            {
              label: "#",
              onClick: () => onAccidentalDisplayChange?.("sharp"),
              active: accidentalDisplay === "sharp",
            },
            {
              label: "both",
              onClick: () => onAccidentalDisplayChange?.("both"),
              active: accidentalDisplay === "both",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Scale Family"
          info="Chromatic uses all notes in the selected range. Diatonic uses 7-note scales from the selected root. Pentatonic uses 5-note scales from the selected root."
        />
        <UIButtonGroup
          items={[
            {
              label: "Chromatic",
              onClick: () => onScaleFamilyChange?.("chromatic"),
              active: scaleFamily === "chromatic",
            },
            {
              label: "Diatonic",
              onClick: () => onScaleFamilyChange?.("diatonic"),
              active: scaleFamily === "diatonic",
            },
            {
              label: "Pentatonic",
              onClick: () => onScaleFamilyChange?.("pentatonic"),
              active: scaleFamily === "pentatonic",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
          opacity: scaleFamily === "chromatic" ? 0.35 : 1,
          transition: "opacity 0.2s",
          pointerEvents: scaleFamily === "chromatic" ? "none" : "auto",
        }}
      >
        <SettingLabel
          text="Scale Mode"
          info="Applies to Diatonic and Pentatonic families. Choose Major or Minor."
        />
        <UIButtonGroup
          items={[
            {
              label: "Major",
              onClick: () => onScaleModeChange?.("major"),
              active: scaleMode === "major",
            },
            {
              label: "Minor",
              onClick: () => onScaleModeChange?.("minor"),
              active: scaleMode === "minor",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
          opacity: scaleFamily === "chromatic" ? 0.35 : 1,
          transition: "opacity 0.2s",
          pointerEvents: scaleFamily === "chromatic" ? "none" : "auto",
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            .settings-select {
              font-size: 16px !important;
              padding: 12px 12px !important;
              min-height: 48px;
              appearance: auto;
              -webkit-appearance: menulist;
            }
          }
        `}</style>
        <SettingLabel
          text="Root Note"
          info="The tonic of the selected scale. Active for Diatonic and Pentatonic families. Sequential and Triads sequences start from this note."
        />
        <select
          className="settings-select"
          value={rootNote}
          onChange={(e) => onRootNoteChange?.(Number(e.target.value))}
          style={selectStyle}
        >
          {Array.from({ length: 12 }, (_, n) => n).map((n) => (
            <option key={n} value={n}>
              {formatPitchClassLabel(n, accidentalDisplay)}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Lowest Note"
          info="Lowest note allowed in the challenge range."
        />
        <select
          className="settings-select"
          value={lowestNote}
          onChange={(e) => onLowestNoteChange?.(e.target.value)}
          style={selectStyle}
        >
          {AVAILABLE_RANGE_NOTES.filter(
            (n) =>
              AVAILABLE_RANGE_NOTES.indexOf(n) <=
              AVAILABLE_RANGE_NOTES.indexOf(highestNote),
          ).map((n) => (
            <option key={n} value={n}>
              {formatNoteLabel(n, accidentalDisplay)}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Highest Note"
          info="Highest note allowed in the challenge range. Maximum supported note is C6."
        />
        <select
          className="settings-select"
          value={highestNote}
          onChange={(e) => onHighestNoteChange?.(e.target.value)}
          style={selectStyle}
        >
          {AVAILABLE_RANGE_NOTES.filter(
            (n) =>
              AVAILABLE_RANGE_NOTES.indexOf(n) >=
              AVAILABLE_RANGE_NOTES.indexOf(lowestNote),
          ).map((n) => (
            <option key={n} value={n}>
              {formatNoteLabel(n, accidentalDisplay)}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Note Display"
          info="Name shows the note letter (e.g. C#4). Index shows the semitone position within the range of a standard trumpet (F#3 = 1, G3 = 2, ... C6 = 31). Staff shows the note on a treble clef staff."
        />
        <UIButtonGroup
          items={[
            {
              label: "Staff",
              onClick: () => onDisplayTypeChange?.("visual_note"),
              active: displayType === "visual_note",
            },
            {
              label: "Name",
              onClick: () => onDisplayTypeChange?.("note"),
              active: displayType === "note",
            },
            {
              label: "Index",
              onClick: () => onDisplayTypeChange?.("index"),
              active: displayType === "index",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Precision"
          info="How closely your pitch must match the target. Loose: ±50 cents. Tight: ±35 cents. Strict: ±20 cents. (100 cents = 1 semitone)"
        />
        <UIButtonGroup
          items={[
            {
              label: "Loose",
              onClick: () => onPrecisionChange?.("easy"),
              active: precision === "easy",
            },
            {
              label: "Tight",
              onClick: () => onPrecisionChange?.("medium"),
              active: precision === "medium",
            },
            {
              label: "Strict",
              onClick: () => onPrecisionChange?.("hard"),
              active: precision === "hard",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Hold Time"
          info="How long you must hold the correct pitch before it registers as a hit. Short: 300ms. Medium: 500ms. Long: 1000ms."
        />
        <UIButtonGroup
          items={[
            {
              label: "Short",
              onClick: () => onHoldTimeChange?.("low"),
              active: holdTime === "low",
            },
            {
              label: "Medium",
              onClick: () => onHoldTimeChange?.("medium"),
              active: holdTime === "medium",
            },
            {
              label: "Long",
              onClick: () => onHoldTimeChange?.("high"),
              active: holdTime === "high",
            },
          ]}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <SettingLabel
          text="Time Limit"
          info="Maximum time allowed per note. If you don't hit the note within this window it is marked as timed out and the next note appears."
        />
        <UIButtonGroup
          items={[2000, 5000, 10000].map((ms) => ({
            label: `${ms / 1000}s`,
            onClick: () => onTimeLimitChange?.(ms),
            active: timeLimitMs === ms,
          }))}
        />
      </div>
    </div>
  );
}

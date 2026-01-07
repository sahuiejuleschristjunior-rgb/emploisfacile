const formatTime = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default function VoiceRecorderOverlay({
  status,
  timeSec,
  waveformLevel,
  isCanceling = false,
  onStop = () => {},
}) {
  const isLocked = status === "locked";
  const isActive = status === "recording" || status === "locked" || isCanceling;

  if (!isActive) return null;

  return (
    <div className={`voice-recorder-overlay ${isCanceling ? "canceling" : ""}`}>
      <div className="voice-recorder-main">
        <div className={`voice-lock-indicator ${isLocked ? "locked" : ""}`}>
          <span className="voice-lock-icon" aria-hidden>
            🔒
          </span>
          {isLocked && <span className="voice-lock-text">Verrouillé</span>}
        </div>
        <div className="voice-waveform">
          <div
            className="voice-waveform-bar"
            style={{ "--level": waveformLevel }}
            aria-hidden
          />
          <div className="voice-waveform-pulse" aria-hidden />
        </div>
        <div className="voice-timer">{formatTime(timeSec)}</div>
      </div>

      <div className="voice-recorder-hints">
        {isCanceling ? (
          <span className="voice-cancel-text">Annulé</span>
        ) : (
          <>
            <span>Glisser ← pour annuler</span>
            <span>Glisser ↑ pour verrouiller</span>
          </>
        )}
      </div>

      {isLocked && (
        <div className="voice-recorder-actions">
          <button type="button" className="voice-stop-btn" onClick={onStop}>
            Stop
          </button>
          <button type="button" className="voice-send-btn" disabled>
            Envoyer
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";

const MAX_MESSAGE_FILE_SIZE = 10 * 1024 * 1024;
const MESSAGE_FILE_ACCEPT = ".pdf,.doc,.docx,image/jpeg,image/png";
const ALLOWED_MESSAGE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const formatFileSize = (size = 0) => {
  if (!size && size !== 0) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatTime = (time = 0) => {
  const total = Math.floor(time);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const resolveFileKind = (file) => {
  if (!file) return "file";
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g)$/i.test(name)) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(doc|docx)$/i.test(name)
  ) {
    return "doc";
  }
  return "file";
};

export default function MessageInput({
  onSend,
  onSendFile,
  onSendAudio,
  onTyping,
  disabled,
}) {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [fileKind, setFileKind] = useState("file");
  const [pendingAudio, setPendingAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const hasText = value.trim().length > 0;
  const hasSendContent = hasText || Boolean(selectedFile || pendingAudio);

  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const streamRef = useRef(null);
  const audioPreviewRef = useRef(null);

  useEffect(() => {
    if (!onTyping) return undefined;
    onTyping(Boolean(value));

    const timer = setTimeout(() => {
      onTyping(false);
    }, 900);

    return () => clearTimeout(timer);
  }, [value, onTyping]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      if (pendingAudio?.previewUrl) {
        URL.revokeObjectURL(pendingAudio.previewUrl);
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [filePreviewUrl, pendingAudio]);

  const resetFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl("");
    setFileKind("file");
  };

  const resetAudio = () => {
    if (pendingAudio?.previewUrl) {
      URL.revokeObjectURL(pendingAudio.previewUrl);
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
    }
    setPendingAudio(null);
  };

  const getAudioDuration = (blob) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });

  const startRecording = async () => {
    if (disabled || isRecording || pendingAudio) return;
    setRecordTime(0);
    recordingChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredMime = "audio/webm;codecs=opus";
      const fallbackMime = "audio/webm";
      const mimeType = MediaRecorder.isTypeSupported?.(preferredMime)
        ? preferredMime
        : fallbackMime;
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        clearInterval(recordTimerRef.current);
        setIsRecording(false);
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        recordingChunksRef.current = [];
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (!blob.size) return;
        const duration = await getAudioDuration(blob);
        const previewUrl = URL.createObjectURL(blob);
        setPendingAudio({
          blob,
          previewUrl,
          duration,
          mime: "audio/webm",
        });
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setIsRecording(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const sendAudio = async () => {
    if (!pendingAudio?.blob || !onSendAudio || disabled) return;
    const ok = await onSendAudio({
      blob: pendingAudio.blob,
      duration: pendingAudio.duration || 0,
    });
    if (ok) {
      resetAudio();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (pendingAudio) {
      event.target.value = "";
      return;
    }

    const extensionAllowed = /\.(pdf|docx?|png|jpe?g)$/i.test(file.name || "");
    if (!ALLOWED_MESSAGE_MIME_TYPES.has(file.type) && !extensionAllowed) {
      resetFile();
      event.target.value = "";
      return;
    }

    if (file.size > MAX_MESSAGE_FILE_SIZE) {
      resetFile();
      event.target.value = "";
      return;
    }

    const nextKind = resolveFileKind(file);
    setFileKind(nextKind);
    if (nextKind === "image") {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl("");
    }
    setSelectedFile(file);
    event.target.value = "";
  };

  const handleSend = () => {
    if (pendingAudio && onSendAudio && !disabled) {
      sendAudio();
      return;
    }
    if (selectedFile && onSendFile && !disabled) {
      onSendFile(selectedFile);
      resetFile();
      setValue("");
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="job-chat-input">
      {isRecording && (
        <div className="job-chat-recording">
          <span className="job-chat-recording-dot" />
          <span>Enregistrement {formatTime(recordTime)}</span>
        </div>
      )}
      {pendingAudio && (
        <div className="job-chat-audio-preview">
          <button type="button" onClick={() => audioPreviewRef.current?.play()}>
            ▶️ Écouter
          </button>
          <span>{formatTime(pendingAudio.duration || 0)}</span>
          <audio ref={audioPreviewRef} src={pendingAudio.previewUrl} preload="metadata" />
          <button type="button" onClick={resetAudio}>
            ❌ Supprimer
          </button>
          <button type="button" onClick={sendAudio} disabled={disabled}>
            📤 Envoyer
          </button>
        </div>
      )}
      {selectedFile && (
        <div className="job-chat-file-preview">
          {fileKind === "image" && filePreviewUrl ? (
            <img src={filePreviewUrl} alt={selectedFile.name} />
          ) : (
            <span className="job-chat-file-icon">
              {fileKind === "pdf" ? "📄" : fileKind === "doc" ? "📝" : "📎"}
            </span>
          )}
          <div className="job-chat-file-info">
            <strong>{selectedFile.name}</strong>
            <span>{formatFileSize(selectedFile.size)}</span>
          </div>
          <button type="button" onClick={resetFile}>
            Retirer
          </button>
        </div>
      )}
      <div className="job-chat-input-row">
        <button
          type="button"
          className="job-chat-attach"
          onClick={() => document.getElementById("job-chat-file-input")?.click()}
          disabled={disabled}
        >
          📎
        </button>
        <input
          id="job-chat-file-input"
          type="file"
          accept={MESSAGE_FILE_ACCEPT}
          className="job-chat-file-input"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <input
          type="text"
          placeholder={
            pendingAudio
              ? "Envoyer la note vocale"
              : selectedFile
              ? "Envoyer le fichier"
              : "Écrire un message…"
          }
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || Boolean(selectedFile || pendingAudio)}
        />
        <button
          type="button"
          className={`job-chat-action ${hasSendContent ? "is-send" : "is-mic"}`}
          onClick={hasSendContent ? handleSend : undefined}
          onMouseDown={hasSendContent ? undefined : startRecording}
          onMouseUp={hasSendContent ? undefined : stopRecording}
          onTouchStart={hasSendContent ? undefined : startRecording}
          onTouchEnd={hasSendContent ? undefined : stopRecording}
          disabled={disabled || (hasSendContent ? false : isRecording || Boolean(selectedFile))}
          aria-label={hasSendContent ? "Envoyer" : "Enregistrer une note vocale"}
        >
          {hasSendContent ? "➤" : "🎤"}
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";

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

export default function MessageInput({ onSend, onSendFile, onTyping, disabled }) {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [fileKind, setFileKind] = useState("file");

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
    };
  }, [filePreviewUrl]);

  const resetFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl("");
    setFileKind("file");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
          placeholder={selectedFile ? "Envoyer le fichier" : "Écrire un message…"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || Boolean(selectedFile)}
        />
        <button
          type="button"
          className="primary-btn"
          onClick={handleSend}
          disabled={disabled || (!selectedFile && !value.trim())}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

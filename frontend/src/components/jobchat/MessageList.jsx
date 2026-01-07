import React, { forwardRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;
const API_HOST = API_URL?.replace(/\/?api$/, "");

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (size = 0) => {
  if (!size && size !== 0) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
};

const resolveUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("http")) return url;
  return `${API_HOST || ""}${url.startsWith("/") ? "" : "/"}${url}`;
};

const resolveFileKind = (file) => {
  if (!file) return "file";
  const mime = (file.mime || file.type || "").toLowerCase();
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

const resolveMessageFile = (message) => {
  if (!message) return null;
  if (message.file?.url) return message.file;
  if (message.fileUrl) {
    return {
      name: message.file?.name || "Fichier",
      size: message.file?.size || 0,
      mime: message.file?.mime || "",
      url: message.fileUrl,
    };
  }
  return null;
};

const getAudioDuration = (message) => {
  const duration =
    message?.audio?.duration || message?.audioDuration || message?.duration || 0;
  if (!duration) return "";
  const total = Math.floor(duration);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const MessageList = forwardRef(function MessageList(
  { messages, currentUserId, endRef, onScroll },
  ref
) {
  const token = localStorage.getItem("token");

  const downloadFile = async (message) => {
    const file = resolveMessageFile(message);
    if (!file?.url) return;
    const fileName = file.name || "fichier";

    if (file.url.startsWith("blob:")) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    try {
      const res = await fetch(resolveUrl(file.url), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Erreur téléchargement fichier", err);
    }
  };

  return (
    <div className="job-chat-messages" ref={ref} onScroll={onScroll}>
      {messages.map((message) => {
        const senderId =
          typeof message.sender === "object" ? message.sender?._id : message.sender;
        const isMe = senderId === currentUserId;
        const content = message.content || message.text || "";
        const file = resolveMessageFile(message);
        const fileKind = resolveFileKind(file || message.file);
        return (
          <div
            key={message._id || message.clientTempId || message.createdAt}
            className={`job-chat-row ${isMe ? "me" : "other"}`}
          >
            <div className="job-chat-bubble">
              {message.type === "audio" ? (
                <div className="job-chat-audio">
                  <audio
                    controls
                    preload="metadata"
                    src={resolveUrl(message.audio?.url || message.audioUrl)}
                  />
                  <span className="job-chat-audio-duration">
                    {getAudioDuration(message)}
                  </span>
                </div>
              ) : message.type === "file" && file ? (
                <div className="job-chat-file-card">
                  <span className="job-chat-file-icon">
                    {fileKind === "image"
                      ? "🖼️"
                      : fileKind === "pdf"
                      ? "📄"
                      : fileKind === "doc"
                      ? "📝"
                      : "📎"}
                  </span>
                  <div className="job-chat-file-text">
                    <strong>{file.name || "Fichier"}</strong>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                  <button type="button" onClick={() => downloadFile(message)}>
                    Télécharger
                  </button>
                </div>
              ) : (
                <p>{content}</p>
              )}
              <span className="job-chat-time">
                {formatTime(message.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
});

export default MessageList;

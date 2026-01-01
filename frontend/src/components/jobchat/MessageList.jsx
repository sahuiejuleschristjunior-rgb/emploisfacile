import React from "react";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MessageList({ messages, currentUserId, lastIncomingId }) {
  return (
    <div className="job-chat-messages">
      {messages.map((message) => {
        const senderId =
          typeof message.sender === "object" ? message.sender?._id : message.sender;
        const isMe = senderId === currentUserId;
        const content = message.content || message.text || "";
        const isNew = message._id && message._id === lastIncomingId;
        return (
          <div
            key={message._id || message.clientTempId || message.createdAt}
            className={`job-chat-row ${isMe ? "me" : "other"}${
              isNew ? " job-msg--new" : ""
            }`}
          >
            <div className="job-chat-bubble">
              <p>{content}</p>
              <span className="job-chat-time">
                {formatTime(message.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

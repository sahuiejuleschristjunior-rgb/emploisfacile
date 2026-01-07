import React, { forwardRef } from "react";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MessageList = forwardRef(function MessageList(
  { messages, currentUserId, endRef, onScroll },
  ref
) {
  return (
    <div className="job-chat-messages" ref={ref} onScroll={onScroll}>
      {messages.map((message) => {
        const senderId =
          typeof message.sender === "object" ? message.sender?._id : message.sender;
        const isMe = senderId === currentUserId;
        const content = message.content || message.text || "";
        return (
          <div
            key={message._id || message.clientTempId || message.createdAt}
            className={`job-chat-row ${isMe ? "me" : "other"}`}
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
      <div ref={endRef} />
    </div>
  );
});

export default MessageList;

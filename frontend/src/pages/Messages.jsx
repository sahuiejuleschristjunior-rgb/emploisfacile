// src/pages/Messages.jsx
import { useEffect, useState, useRef } from "react";
import { fetchFriends } from "../api/socialApi";
import "../styles/messages.css";

const API_URL = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");
const me = JSON.parse(localStorage.getItem("user"));

export default function Messages() {
  /* ================= STATE ================= */
  const [friends, setFriends] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  /* ================= HELPERS ================= */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ================= LOAD FRIENDS ================= */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchFriends();
        setFriends(data?.friends || []);
      } catch (err) {
        console.error("Erreur amis", err);
      }
    };
    load();
  }, []);

  /* ================= LOAD CONVERSATION ================= */
  const loadConversation = async (user) => {
    setActiveChat(user);
    setMessages([]);
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/messages/conversation/${user._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur conversation", err);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return;

    const content = input.trim();
    setInput("");

    const temp = {
      _id: "temp-" + Date.now(),
      sender: me?._id,
      receiver: activeChat._id,
      content,
      type: "text",
    };

    setMessages((prev) => [...prev, temp]);
    scrollToBottom();

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver: activeChat._id,
          content,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === temp._id ? data.data : m))
        );
      }
    } catch (err) {
      console.error("Erreur envoi", err);
    }
  };

  useEffect(scrollToBottom, [messages]);

  /* ================= UI ================= */
  return (
    <div className="messages-page">
      {/* ===== SIDEBAR ===== */}
      <aside className="messages-sidebar">
        <h3>Messages</h3>

        {friends.map((f) => (
          <div
            key={f._id}
            className={`conversation-item ${
              activeChat?._id === f._id ? "active" : ""
            }`}
            onClick={() => loadConversation(f)}
          >
            <img
              src={f.avatar || "/default-avatar.png"}
              alt={f.name}
              className="conversation-avatar"
            />
            <span>{f.name}</span>
          </div>
        ))}
      </aside>

      {/* ===== CHAT ===== */}
      <main className="messages-content">
        {!activeChat ? (
          <div className="messages-placeholder">
            Sélectionne un ami
          </div>
        ) : (
          <>
            <div className="chat-header">
              <strong>{activeChat.name}</strong>
            </div>

            <div className="chat-body">
              {loading && <div>Chargement…</div>}

              {messages.map((msg) => {
                const isMe =
                  (typeof msg.sender === "object"
                    ? msg.sender?._id
                    : msg.sender) === me?._id;

                return (
                  <div
                    key={msg._id}
                    className={`message-row ${isMe ? "me" : "other"}`}
                  >
                    <div className="message-bubble">
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-bar">
              <input
                placeholder="Message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage}>Envoyer</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
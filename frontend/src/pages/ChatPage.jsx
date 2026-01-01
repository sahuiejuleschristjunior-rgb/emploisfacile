import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;
const socket = io(API_URL.replace("/api", ""));
const loadErrorMessage = "Impossible de charger vos conversations";

const ensureJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Réponse serveur invalide");
  }
  return res.json();
};

export default function ChatPage() {
  const { id } = useParams();
  const token = localStorage.getItem("token");

  const [viewer, setViewer] = useState(null);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError(loadErrorMessage);
      return;
    }

    loadViewer();
    loadPartner();
    loadMessages();

    socket.emit("join_room", { userId: id });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [id]);

  const loadViewer = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await ensureJsonResponse(res);
      if (res.ok) setViewer(data.user);
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const loadPartner = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/user/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await ensureJsonResponse(res);
      if (res.ok) setPartner(data);
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/messages/conversation/${id}?type=public`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const list = await ensureJsonResponse(res);
      if (res.ok && Array.isArray(list)) setMessages(list);
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    if (!token) {
      setError(loadErrorMessage);
      return;
    }

    const body = {
      receiver: id,
      content: text,
    };

    try {
      const res = await fetch(`${API_URL}/messages/send?type=public`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const msg = await ensureJsonResponse(res);
      if (res.ok) {
        socket.emit("send_message", msg);
        setMessages((prev) => [...prev, msg]);
        setText("");
      } else {
        setError(loadErrorMessage);
      }
    } catch (err) {
      setError(loadErrorMessage);
    }
  };

  return (
    <div className="chat-wrapper">
      {error && <div className="messages-empty">{error}</div>}
      <div className="chat-header">
        <h2>{partner?.name}</h2>
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div
            key={m._id}
            className={
              m.sender === viewer?._id ? "msg msg-me" : "msg msg-them"
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          placeholder="Écrire un message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={sendMessage}>Envoyer</button>
      </div>
    </div>
  );
}

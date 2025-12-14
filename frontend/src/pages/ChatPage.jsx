import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

const API_ROOT = import.meta.env.VITE_API_URL;
const socket = io(API_ROOT.replace("/api", ""));

export default function ChatPage() {
  const { id } = useParams();
  const token = localStorage.getItem("token");

  const [viewer, setViewer] = useState(null);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
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
    const res = await fetch(`${API_ROOT}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setViewer(data.user);
  };

  const loadPartner = async () => {
    const res = await fetch(`${API_ROOT}/auth/user/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setPartner(data);
  };

  const loadMessages = async () => {
    const res = await fetch(`${API_ROOT}/messages/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await res.json();
    if (res.ok) setMessages(list);
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    const body = {
      receiverId: id,
      text,
    };

    const res = await fetch(`${API_ROOT}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const msg = await res.json();
    if (res.ok) {
      socket.emit("send_message", msg);
      setMessages((prev) => [...prev, msg]);
      setText("");
    }
  };

  return (
    <div className="chat-wrapper">
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
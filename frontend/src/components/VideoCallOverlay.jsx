// src/components/VideoCallOverlay.jsx
import { useEffect, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoCallOverlay({
  visible,
  mode,          // "caller" | "callee"
  socket,
  me,
  otherUser,
  incomingOffer,
  callType = "video", // "video" | "audio"
  onClose,
}) {
  /* ============================================================
     HOOKS
  ============================================================ */
  const isVideoCall = callType !== "audio";

  const [status, setStatus] = useState("idle");          // "idle" | "calling" | "in-call"
  const [accepted, setAccepted] = useState(mode === "caller");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(isVideoCall);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  /* ============================================================
     CLEANUP
  ============================================================ */
  const cleanUpCall = () => {
    try {
      if (pcRef.current) {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.close();
      }
    } catch (e) {}

    pcRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleHangup = () => {
    if (socket && otherUser?._id) {
      socket.emit("call_hangup", { to: otherUser._id });
    }
    cleanUpCall();
    setStatus("idle");
    setAccepted(mode === "caller");
    onClose && onClose();
  };

  /* ============================================================
     SOCKET LISTENERS
  ============================================================ */
  useEffect(() => {
    if (!socket || !otherUser) return;

    const handleCallAnswer = ({ from, answer }) => {
      if (!pcRef.current) return;
      if (from !== otherUser._id) return;

      pcRef.current
        .setRemoteDescription(new RTCSessionDescription(answer))
        .then(() => setStatus("in-call"))
        .catch((err) => console.error("Remote answer error:", err));
    };

    const handleIceCandidate = ({ from, candidate }) => {
      if (!pcRef.current) return;
      if (from !== otherUser._id) return;

      pcRef.current
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((err) => console.error("ICE error:", err));
    };

    const handleHangupRemote = ({ from }) => {
      if (from !== otherUser._id) return;

      cleanUpCall();
      setStatus("idle");
      setAccepted(mode === "caller");
      onClose && onClose();
    };

    socket.on("call_answer", handleCallAnswer);
    socket.on("call_ice_candidate", handleIceCandidate);
    socket.on("call_hangup", handleHangupRemote);

    return () => {
      socket.off("call_answer", handleCallAnswer);
      socket.off("call_ice_candidate", handleIceCandidate);
      socket.off("call_hangup", handleHangupRemote);
    };
  }, [socket, otherUser?._id]);

  /* ============================================================
     PEER CONNECTION
  ============================================================ */
  const startPeerConnection = async (withOffer = false) => {
    if (!socket || !otherUser?._id) return;

    try {
      setStatus(mode === "caller" ? "calling" : "in-call");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });

      localStreamRef.current = stream;
      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const [remote] = event.streams;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call_ice_candidate", {
            to: otherUser._id,
            candidate: event.candidate,
          });
        }
      };

      if (withOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("call_offer", {
          to: otherUser._id,
          offer,
          callType,
        });
      }
    } catch (err) {
      console.error("startPeerConnection error:", err);
      cleanUpCall();
      onClose && onClose();
    }
  };

  /* ============================================================
     MODE CALLER — AUTO START
  ============================================================ */
  useEffect(() => {
    if (visible && mode === "caller") {
      startPeerConnection(true);
    }

    // ⭐ AJOUT : receveur active sa caméra automatiquement
    if (visible && mode === "callee" && !accepted) {
      startPeerConnection(false);
    }

    return () => cleanUpCall();
  }, [visible, mode, otherUser?._id]);

  /* ============================================================
     MODE CALLEE — ACCEPT
  ============================================================ */
  const handleAccept = async () => {
    if (!incomingOffer || !socket || !otherUser?._id) return;

    setAccepted(true);
    setStatus("in-call");

    await startPeerConnection(false);

    try {
      await pcRef.current.setRemoteDescription(
        new RTCSessionDescription(incomingOffer)
      );

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("call_answer", {
        to: otherUser._id,
        answer,
      });
    } catch (err) {
      console.error("Accept error:", err);
      cleanUpCall();
      onClose && onClose();
    }
  };

  /* ============================================================
     CONTROLES LOCAUX (MIC / CAM)
  ============================================================ */
  const toggleMic = () => {
    const enabled = !isMicOn;
    setIsMicOn(enabled);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  };

  const toggleCamera = () => {
    if (!isVideoCall) return;

    const enabled = !isCamOn;
    setIsCamOn(enabled);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */
  if (!visible || !otherUser) return null;

  const title =
    mode === "caller"
      ? `${callType === "audio" ? "Appel audio" : "Appel vidéo"} avec ${
          otherUser.name
        }`
      : !accepted
      ? `${otherUser.name} vous appelle…`
      : `${callType === "audio" ? "Appel audio" : "Appel vidéo"} avec ${
          otherUser.name
        }`;

  return (
    <div className="vc-overlay">
      <div className="vc-call">
        {/* Vidéo distante en fond plein écran */}
        {isVideoCall ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="vc-video-remote"
          />
        ) : (
          <audio
            ref={remoteVideoRef}
            autoPlay
            className="vc-audio-remote"
            controls={false}
          />
        )}

        {/* Barre haute */}
        <div className="vc-top-bar">
          <div className="vc-title">
            <div className="vc-title-name">{title}</div>
            <div className="vc-title-sub">
              {status === "calling" && "Appel en cours…"}
              {status === "in-call" && "Connecté"}
            </div>
          </div>
          <button className="vc-btn-top vc-btn-close" onClick={handleHangup}>
            ✕
          </button>
        </div>

        {/* Votre vidéo en petit carré */}
        <div className="vc-local-wrapper">
          {isVideoCall ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-local"
            />
          ) : (
            <div className="vc-audio-local">🎧 Vous</div>
          )}
          <div className="vc-local-label">Vous</div>
        </div>

        {/* Boutons bas */}
        <div className="vc-bottom-bar">
          <button
            className={`vc-round-btn ${isMicOn ? "" : "vc-btn-off"}`}
            onClick={toggleMic}
          >
            {isMicOn ? "🎙️" : "🔇"}
          </button>
          {isVideoCall && (
            <button
              className={`vc-round-btn ${isCamOn ? "" : "vc-btn-off"}`}
              onClick={toggleCamera}
            >
              {isCamOn ? "📷" : "🚫"}
            </button>
          )}

          {mode === "callee" && !accepted && (
            <button className="vc-round-btn vc-btn-accept" onClick={handleAccept}>
              ✅
            </button>
          )}

          <button
            className="vc-round-btn vc-btn-hangup"
            onClick={handleHangup}
          >
            🔴
          </button>
        </div>
      </div>
    </div>
  );
}
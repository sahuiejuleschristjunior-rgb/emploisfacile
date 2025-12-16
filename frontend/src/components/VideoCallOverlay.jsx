import { useEffect, useRef, useState } from "react";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const Icon = ({ name, size = 22 }) => {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    width: size,
    height: size,
    "aria-hidden": true,
    focusable: false,
  };

  const paths = {
    micOn: (
      <g>
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
        <path d="M19 11a1 1 0 0 0-2 0 5 5 0 1 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20a1 1 0 0 0 2 0v-2.07A7 7 0 0 0 19 11Z" />
      </g>
    ),
    micOff: (
      <g>
        <path d="M15 11.95 9.41 6.36A3 3 0 0 1 15 5v6.95Zm3.72 8.43-2.77-2.77A6.93 6.93 0 0 1 12 20a7 7 0 0 1-7-7 1 1 0 0 1 2 0 5 5 0 0 0 5 5 4.93 4.93 0 0 0 2.12-.47l-2.04-2.04A3 3 0 0 1 9 13V9.41L5.05 5.37a1 1 0 0 1 1.4-1.44l12.67 12.67a1 1 0 1 1-1.4 1.38Z" />
      </g>
    ),
    videoOn: (
      <path d="M14.75 6h-7.5A2.25 2.25 0 0 0 5 8.25v7.5A2.25 2.25 0 0 0 7.25 18h7.5A2.25 2.25 0 0 0 17 15.75v-1.38l2.38 1.58a.75.75 0 0 0 1.17-.62V8.67a.75.75 0 0 0-1.17-.62L17 9.63V8.25A2.25 2.25 0 0 0 14.75 6Z" />
    ),
    videoOff: (
      <path d="M3 3l18 18-1.4 1.4L3 4.4 4.4 3Zm5.6 3H14.75A2.25 2.25 0 0 1 17 8.25v1.38l2.38-1.58a.75.75 0 0 1 1.17.62v5.66a.75.75 0 0 1-1.17.62L17 14.37v1.38A2.25 2.25 0 0 1 14.75 18H8.6l1.9-1.9h4.25a.25.25 0 0 0 .25-.25V8.25a.25.25 0 0 0-.25-.25H6.7L8.6 6Z" />
    ),
    phone: (
      <path d="M5.54 4.47 7.7 3.64a2 2 0 0 1 2.42.9l1.16 2.1a2 2 0 0 1-.45 2.44l-.64.6a7.7 7.7 0 0 0 3.15 3.15l.61-.64a2 2 0 0 1 2.44-.45l2.09 1.16a2 2 0 0 1 .9 2.42l-.83 2.16a2 2 0 0 1-2.12 1.3 15.5 15.5 0 0 1-9.9-6.36 15.5 15.5 0 0 1-2.63-5.44 2 2 0 0 1 1.2-2.34Z" />
    ),
    phoneDown: (
      <path d="M5.05 14.34c3.96-3.77 9.94-3.77 13.9 0a1.25 1.25 0 0 1-.36 2.06l-2.27.98a1.25 1.25 0 0 1-1.4-.3l-1.24-1.4a6.02 6.02 0 0 0-2.36 0l-1.24 1.4a1.25 1.25 0 0 1-1.4.3l-2.27-.98a1.25 1.25 0 0 1-.36-2.06Z" />
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
};

export default function VideoCallOverlay({
  visible,
  mode, // "caller" | "callee"
  socket,
  me,
  otherUser,
  incomingOffer,
  callType = "video",
  onClose,
}) {
  const isVideoCall = callType !== "audio";

  const [status, setStatus] = useState("idle");
  const [accepted, setAccepted] = useState(mode === "caller");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(isVideoCall);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);

  const cleanUpCall = () => {
    try {
      if (pcRef.current) pcRef.current.close();
    } catch {}
    pcRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const handleHangup = () => {
    socket?.emit("call_hangup", { to: otherUser?._id });
    cleanUpCall();
    setAccepted(false);
    setStatus("idle");
    onClose?.();
  };

  useEffect(() => {
    if (!socket || !otherUser) return;

    socket.on("call_answer", async ({ from, answer }) => {
      if (from === otherUser._id && pcRef.current) {
        await pcRef.current.setRemoteDescription(answer);
        setStatus("in-call");
      }
    });

    socket.on("call_ice_candidate", ({ from, candidate }) => {
      if (from === otherUser._id && pcRef.current) {
        pcRef.current.addIceCandidate(candidate);
      }
    });

    socket.on("call_hangup", ({ from }) => {
      if (from === otherUser._id) {
        cleanUpCall();
        setAccepted(false);
        setStatus("idle");
        onClose?.();
      }
    });

    return () => {
      socket.off("call_answer");
      socket.off("call_ice_candidate");
      socket.off("call_hangup");
    };
  }, [socket, otherUser?._id]);

  const startPeerConnection = async (withOffer) => {
    if (pcRef.current || !socket || !otherUser) return;

    setStatus(mode === "caller" ? "calling" : "in-call");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: isVideoCall,
      audio: true,
    });

    localStreamRef.current = stream;
    if (localVideoRef.current && isVideoCall) {
      localVideoRef.current.srcObject = stream;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("call_ice_candidate", {
          to: otherUser._id,
          candidate: e.candidate,
        });
      }
    };

    if (withOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call_offer", { to: otherUser._id, offer, callType });
    }
  };

  useEffect(() => {
    if (visible && mode === "caller") {
      startPeerConnection(true);
    }
  }, [visible]);

  const handleAccept = async () => {
    setAccepted(true);
    setStatus("in-call");
    await startPeerConnection(false);
    await pcRef.current.setRemoteDescription(incomingOffer);
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);
    socket.emit("call_answer", { to: otherUser._id, answer });
  };

  if (!visible || !otherUser) return null;

  return (
    <div className="vc-overlay">
      <div className="vc-call">
        {isVideoCall ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="vc-video-remote" />
        ) : (
          <audio ref={remoteVideoRef} autoPlay />
        )}

        <div className="vc-bottom-bar">
          <button className="vc-round-btn vc-btn-hangup" onClick={handleHangup}>
            <Icon name="phoneDown" />
          </button>
        </div>

        {mode === "callee" && !accepted && (
          <div className="vc-incoming-overlay">
            <button className="vc-round-btn vc-btn-accept" onClick={handleAccept}>
              <Icon name="phone" size={28} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
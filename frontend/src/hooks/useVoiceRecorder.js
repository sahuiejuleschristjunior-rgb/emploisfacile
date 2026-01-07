import { useCallback, useEffect, useRef, useState } from "react";

const MIN_RECORDING_MS = 300;
const SUPPORTED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
];

const pickSupportedMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  return SUPPORTED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

export function useVoiceRecorder() {
  const [status, setStatus] = useState("idle");
  const [timeSec, setTimeSec] = useState(0);
  const [waveformLevel, setWaveformLevel] = useState(0);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [mimeType, setMimeType] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const cancelRef = useRef(false);
  const timerRef = useRef(null);
  const frameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  const cleanupAudioNodes = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stopStreamTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const resetPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewBlob(null);
    setPreviewUrl("");
    setDurationSec(0);
  }, [previewUrl]);

  const reset = useCallback(() => {
    resetPreview();
    setStatus("idle");
    setTimeSec(0);
    setWaveformLevel(0);
    setErrorMessage("");
    setMimeType("");
  }, [resetPreview]);

  const finalizeStop = useCallback(
    (recorder) => {
      const startedAt = startTimeRef.current || Date.now();
      const elapsedMs = Date.now() - startedAt;
      const hasChunks = chunksRef.current.length > 0;
      const shouldCancel = cancelRef.current || elapsedMs < MIN_RECORDING_MS || !hasChunks;

      cleanupAudioNodes();
      stopStreamTracks();

      const resolvedMime = recorder?.mimeType || mimeType || "audio/webm";

      if (shouldCancel) {
        chunksRef.current = [];
        cancelRef.current = false;
        setStatus("idle");
        setTimeSec(0);
        setWaveformLevel(0);
        return;
      }

      const blob = new Blob(chunksRef.current, { type: resolvedMime });
      chunksRef.current = [];
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setDurationSec(elapsedMs / 1000);
      setMimeType(resolvedMime);
      setStatus("preview");
    },
    [cleanupAudioNodes, mimeType, stopStreamTracks]
  );

  const start = useCallback(async () => {
    if (status === "recording" || status === "locked") return;
    setErrorMessage("");

    if (typeof MediaRecorder === "undefined") {
      setStatus("error");
      setErrorMessage("Votre navigateur ne supporte pas l'enregistrement audio.");
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Impossible d'accéder au micro sur cet appareil.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferredMime = pickSupportedMimeType();
      let recorder;
      try {
        recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);
      } catch (err) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      cancelRef.current = false;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setTimeSec(0);
      setWaveformLevel(0);
      setStatus("recording");
      setMimeType(recorder.mimeType || preferredMime || "");

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current || Date.now());
        setTimeSec(Math.floor(elapsed / 1000));
      }, 200);

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const value = data[i] - 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / data.length) / 128;
        setWaveformLevel(Math.min(1, rms));
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => finalizeStop(recorder);

      recorder.start();
    } catch (err) {
      stopStreamTracks();
      cleanupAudioNodes();
      setStatus("error");
      setErrorMessage("Permission micro refusée ou indisponible.");
    }
  }, [cleanupAudioNodes, finalizeStop, status, stopStreamTracks]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupAudioNodes();
      stopStreamTracks();
      setStatus("idle");
    }
  }, [cleanupAudioNodes, stopStreamTracks]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupAudioNodes();
      stopStreamTracks();
      setStatus("idle");
    }
  }, [cleanupAudioNodes, stopStreamTracks]);

  const lock = useCallback(() => {
    if (status === "recording") {
      setStatus("locked");
    }
  }, [status]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      cleanupAudioNodes();
      stopStreamTracks();
      resetPreview();
    };
  }, [cleanupAudioNodes, resetPreview, stopStreamTracks]);

  return {
    status,
    timeSec,
    waveformLevel,
    previewBlob,
    previewUrl,
    durationSec,
    mimeType,
    errorMessage,
    start,
    stop,
    cancel,
    lock,
    reset,
  };
}

export default useVoiceRecorder;

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { isNativeMobile, startSpeechRecognition } from "../lib/nativeStt";

// Records mic audio and sends to Whisper STT, returning transcript + parsed structure.
export function VoiceButton({
  mode, language = "ta", onResult, label, className, hideLabel,
}: {
  mode: "request" | "profile" | "raw";
  language?: string;
  onResult: (text: string, parsed: any) => void;
  label?: string;
  className?: string;
  hideLabel?: boolean;
}) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  async function deliverResult(text: string, parsed: any = null) {
    let nextParsed = parsed;
    if (mode === "request" && text.trim() && (!nextParsed || Object.keys(nextParsed).length === 0)) {
      try {
        nextParsed = await api.parseRequest(text);
      } catch (err) {
        console.error("Voice parse error:", err);
      }
    }
    onResult(text, nextParsed);
  }

  async function start() {
    const useNative = isNativeMobile();
    setState("recording");

    try {
      if (useNative) {
        const sttLang = language === "ta" ? "ta-IN" : "en-IN";
        const transcript = await startSpeechRecognition(sttLang);
        setState("processing");
        await deliverResult(transcript);
        setState("idle");
        return;
      }

      // Try browser Web Speech API first (no backend needed)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setState("processing");
          void deliverResult(transcript).finally(() => setState("idle"));
        };

        recognition.onerror = (event: any) => {
          console.error("Web Speech API error:", event.error);
          if (event.error === "not-allowed") {
            alert("Microphone permission denied.");
          } else {
            // Fallback to backend fal.ai
            startBackendRecording();
          }
          setState("idle");
        };

        recognition.onend = () => {
          if (state === "recording") setState("idle");
        };

        recognition.start();
        return;
      }

      // Fallback to backend fal.ai
      startBackendRecording();
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone permission required or not available.");
      setState("idle");
    }
  }

  async function startBackendRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          console.log("Sending audio blob, size:", blob.size);
          const res = await api.transcribe(blob, mode, language);
          console.log("Transcription result:", res);
          await deliverResult(res.text, res.parsed);
        } catch (err: any) {
          console.error("Voice transcription error:", err);
          const errorMsg = err.message || "Voice failed";
          if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("connection")) {
            alert("Connection error. Please check if the server is running.");
          } else if (errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
            alert("Session expired or not logged in. Please login again to use voice features.");
          } else if (errorMsg.includes("FAL_KEY") || errorMsg.includes("STT not configured")) {
            alert("AI voice service is not configured. Please set up FAL_KEY in server settings.");
          } else {
            alert(errorMsg + ". Please check the AI server and voice configuration.");
          }
        } finally {
          setState("idle");
        }
      };
      rec.start();
      recRef.current = rec;
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone permission required or not available.");
      setState("idle");
    }
  }

  function stop() {
    recRef.current?.stop();
  }

  return (
    <button
      type="button"
      onClick={state === "recording" ? stop : start}
      disabled={state === "processing"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-12 font-semibold transition",
        state === "recording" ? "bg-red-500 text-white animate-pulse" : "bg-uyir-50 text-uyir-700 hover:bg-uyir-100",
        className
      )}
    >
      {state === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> : state === "recording" ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      {!hideLabel && (
        <span>
          {label || (state === "recording" ? `I'm listening... (${formatTime(recordingTime)})` : state === "processing" ? "Transcribing…" : "Tap to Speak")}
        </span>
      )}
      {state === "recording" && <span className="ml-1 h-3 w-3 rounded-full bg-white animate-ping" />}
    </button>
  );
}

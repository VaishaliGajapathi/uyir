import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { isNativeMobile, startSpeechRecognition, stopSpeechRecognition } from "../lib/nativeStt";

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
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    const useNative = isNativeMobile();
    setState("recording");

    try {
      if (useNative) {
        const sttLang = language === "ta" ? "ta-IN" : "en-IN";
        const transcript = await startSpeechRecognition(sttLang);
        setState("processing");
        onResult(transcript, null);
        setState("idle");
      } else {
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
            onResult(res.text, res.parsed);
          } catch (err: any) {
            console.error("Voice transcription error:", err);
            const errorMsg = err.message || "Voice failed";
            if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("connection")) {
              alert("Connection error. Please check if server is running at http://localhost:4000");
            } else if (errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
              alert("Session expired or not logged in. Please login again to use voice features.");
            } else {
              alert(errorMsg + ". Please check the AI server and voice configuration.");
            }
          } finally {
            setState("idle");
          }
        };
        rec.start();
        recRef.current = rec;
      }
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
        state === "recording" ? "bg-uyir-600 text-white" : "bg-uyir-50 text-uyir-700 hover:bg-uyir-100",
        className
      )}
    >
      {state === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> : state === "recording" ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      {!hideLabel && (label || (state === "recording" ? "Stop" : state === "processing" ? "Transcribing…" : "Speak"))}
      {state === "recording" && <span className="ml-1 h-2 w-2 animate-pulse rounded-full bg-white" />}
    </button>
  );
}

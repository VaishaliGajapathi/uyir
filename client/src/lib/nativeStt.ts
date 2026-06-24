import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor } from "@capacitor/core";

export function isNativeMobile() {
  return Capacitor.isNativePlatform();
}

function extractTranscript(matches: any): string {
  if (!Array.isArray(matches) || matches.length === 0) return "";
  const first = matches[0];
  if (typeof first === "string") return first;
  if (first && typeof first.transcript === "string") return first.transcript;
  if (Array.isArray(first) && typeof first[0]?.transcript === "string") return first[0].transcript;
  return "";
}

export async function startSpeechRecognition(
  language: "en-IN" | "ta-IN" = "en-IN"
): Promise<string> {
  if (!isNativeMobile()) {
    throw new Error("Speech recognition is only available on native mobile");
  }

  const { available } = await SpeechRecognition.available();
  if (!available) {
    throw new Error("Speech recognition not available on this device");
  }

  const permissions = await SpeechRecognition.requestPermissions();
  if (permissions.speechRecognition !== "granted") {
    throw new Error("Microphone permission denied");
  }

  await SpeechRecognition.start({
    language,
    popup: false,
    partialResults: true,
    maxResults: 1,
  });

  return new Promise((resolve, reject) => {
    let resolved = false;

    SpeechRecognition.addListener("partialResults", (data) => {
      const transcript = extractTranscript(data.matches);
      if (!resolved && transcript) {
        resolved = true;
        resolve(transcript);
        void stopSpeechRecognition();
      }
    });

    SpeechRecognition.addListener("listeningState", (data) => {
      if (!resolved && data.status === "stopped") {
        reject(new Error("No speech detected"));
        void stopSpeechRecognition();
      }
    });
  });
}

export async function stopSpeechRecognition(): Promise<void> {
  try {
    await SpeechRecognition.stop();
  } catch {
    // Ignore if already stopped
  }
  await SpeechRecognition.removeAllListeners();
}

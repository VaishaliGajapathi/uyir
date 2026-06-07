import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor } from "@capacitor/core";

export function isNativeMobile() {
  return Capacitor.isNativePlatform();
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

  const { permission } = await SpeechRecognition.requestPermissions();
  if (permission !== "granted") {
    throw new Error("Microphone permission denied");
  }

  await SpeechRecognition.start({
    language,
    popup: false,
    partialResults: false,
    maxResults: 1,
  });

  return new Promise((resolve, reject) => {
    SpeechRecognition.addListener("partialResults", (data) => {
      // Ignore partial results, wait for final
    });

    SpeechRecognition.addListener("results", (data) => {
      const transcript = data.matches?.[0]?.[0]?.transcript;
      if (transcript) {
        resolve(transcript);
      } else {
        reject(new Error("No speech detected"));
      }
      void stopSpeechRecognition();
    });

    SpeechRecognition.addListener("error", (error) => {
      reject(new Error(error.error || "Speech recognition failed"));
      void stopSpeechRecognition();
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

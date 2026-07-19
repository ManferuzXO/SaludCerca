type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognition() {
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

export function browserSpeechSupported() {
  return Boolean(getSpeechRecognition());
}

export function transcribeSpeechOnce(): Promise<string> {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    return Promise.reject(new Error('Tu navegador no admite reconocimiento de voz.'));
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let transcript = '';
    let finished = false;
    recognition.lang = 'es-BO';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
    };
    recognition.onerror = (event) => {
      if (finished) return;
      finished = true;
      reject(new Error(event.error));
    };
    recognition.onend = () => {
      if (finished) return;
      finished = true;
      if (transcript) resolve(transcript);
      else reject(new Error('No se detectó audio.'));
    };
    recognition.start();
  });
}

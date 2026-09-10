import { useCallback, useEffect, useRef, useState } from 'react';

// Chrome/Edge expose this as webkitSpeechRecognition; Firefox/Safari largely don't implement it.
// We detect support explicitly and never pretend it works when it doesn't (per spec: "Do not
// pretend that unsupported functionality works").
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any;

function getRecognitionConstructor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export type MicState = 'idle' | 'listening' | 'processing' | 'error';

export function useSpeechRecognition(langTag: string) {
  const RecognitionCtor = useRef(getRecognitionConstructor()).current;
  const isSupported = Boolean(RecognitionCtor);

  const [state, setState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onFinalResultRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    const recognition = new RecognitionCtor();
    recognition.lang = langTag;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setState('listening');
      setError(null);
    };
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      setTranscript(final || interim);
      if (final) {
        setState('processing');
        onFinalResultRef.current?.(final.trim());
      }
    };
    recognition.onerror = (event: any) => {
      const map: Record<string, string> = {
        'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings and reload.',
        'no-speech': "Didn't catch any speech — try again.",
        'audio-capture': 'No microphone was found.',
        network: 'A network error interrupted speech recognition.',
      };
      setError(map[event.error] || `Speech recognition error: ${event.error}`);
      setState('error');
    };
    recognition.onend = () => {
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.stop(); } catch { /* noop */ }
    };
  }, [isSupported, RecognitionCtor, langTag]);

  const start = useCallback((onFinalResult: (text: string) => void) => {
    if (!isSupported || !recognitionRef.current) return;
    onFinalResultRef.current = onFinalResult;
    setTranscript('');
    setError(null);
    try {
      recognitionRef.current.start();
    } catch {
      // start() throws if already started; ignore.
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const markIdle = useCallback(() => setState('idle'), []);

  return { isSupported, state, transcript, error, start, stop, markIdle };
}

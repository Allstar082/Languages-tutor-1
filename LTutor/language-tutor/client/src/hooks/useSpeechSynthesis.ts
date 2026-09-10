import { useCallback, useRef, useState } from 'react';
import { ttsProvider } from '../services/tts';

export type SpeakingState = 'idle' | 'speaking' | 'paused' | 'error';

export function useSpeechSynthesis(langTag: string) {
  const [state, setState] = useState<SpeakingState>('idle');
  const [rate, setRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const lastTextRef = useRef('');

  const isSupported = ttsProvider.isSupported();

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      setError('Text-to-speech is not supported in this browser.');
      setState('error');
      return;
    }
    lastTextRef.current = text;
    setError(null);
    ttsProvider.speak(text, {
      langTag,
      rate,
      onStart: () => setState('speaking'),
      onEnd: () => setState('idle'),
      onError: (e) => { setError(e); setState('error'); },
    });
  }, [isSupported, langTag, rate]);

  const pause = useCallback(() => { ttsProvider.pause(); setState('paused'); }, []);
  const resume = useCallback(() => { ttsProvider.resume(); setState('speaking'); }, []);
  const stop = useCallback(() => { ttsProvider.stop(); setState('idle'); }, []);
  const replay = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current);
  }, [speak]);

  const changeRate = useCallback((newRate: number) => setRate(newRate), []);

  return { isSupported, state, error, rate, speak, pause, resume, stop, replay, changeRate };
}

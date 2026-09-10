// services/tts.ts
// Pluggable text-to-speech. Today only the browser's built-in SpeechSynthesis is implemented,
// but everything goes through this interface so ElevenLabs/OpenAI TTS can be dropped in later
// without touching any component code — see NEXT_STEPS.md for how to add a provider.

export interface TtsProvider {
  isSupported(): boolean;
  speak(text: string, opts: { langTag: string; rate: number; onStart?: () => void; onEnd?: () => void; onError?: (e: string) => void }): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

class BrowserSpeechSynthesisProvider implements TtsProvider {
  private utterance: SpeechSynthesisUtterance | null = null;
  private lastText = '';
  private lastLangTag = 'it-IT';
  private lastRate = 1;

  isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private pickVoice(langTag: string): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === langTag) ||
      voices.find((v) => v.lang.startsWith(langTag.split('-')[0])) ||
      undefined
    );
  }

  speak(text: string, opts: { langTag: string; rate: number; onStart?: () => void; onEnd?: () => void; onError?: (e: string) => void }) {
    if (!this.isSupported()) {
      opts.onError?.('Text-to-speech is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = opts.langTag;
    utterance.rate = opts.rate;
    const voice = this.pickVoice(opts.langTag);
    if (voice) utterance.voice = voice;
    utterance.onstart = () => opts.onStart?.();
    utterance.onend = () => opts.onEnd?.();
    utterance.onerror = (e) => opts.onError?.(e.error || 'Speech synthesis error');
    this.utterance = utterance;
    this.lastText = text;
    this.lastLangTag = opts.langTag;
    this.lastRate = opts.rate;
    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (this.isSupported()) window.speechSynthesis.pause();
  }
  resume() {
    if (this.isSupported()) window.speechSynthesis.resume();
  }
  stop() {
    if (this.isSupported()) window.speechSynthesis.cancel();
  }
  replay(onStart?: () => void, onEnd?: () => void, onError?: (e: string) => void) {
    if (!this.lastText) return;
    this.speak(this.lastText, { langTag: this.lastLangTag, rate: this.lastRate, onStart, onEnd, onError });
  }
}

// Voices load asynchronously in some browsers; warm the cache so the first speak() picks
// the right voice.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

export const ttsProvider: BrowserSpeechSynthesisProvider = new BrowserSpeechSynthesisProvider();

export type ConversationUiState = 'ready' | 'listening' | 'processing' | 'thinking' | 'speaking' | 'error';

const STATE_LABEL: Record<ConversationUiState, string> = {
  ready: 'Hold / Click to Speak',
  listening: 'Listening…',
  processing: 'Processing your speech…',
  thinking: 'AI is thinking…',
  speaking: '🔊 AI is speaking…',
  error: 'Something went wrong',
};

export default function MicButton({
  uiState,
  disabled,
  onClick,
}: {
  uiState: ConversationUiState;
  disabled?: boolean;
  onClick: () => void;
}) {
  const isListening = uiState === 'listening';
  const isBusy = uiState === 'processing' || uiState === 'thinking';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={onClick}
        disabled={disabled || isBusy}
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop listening' : 'Start speaking'}
        className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl
          transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300
          disabled:opacity-60 disabled:cursor-not-allowed
          ${isListening ? 'bg-red-500 text-white mic-listening' : 'bg-brand-500 text-white hover:bg-brand-600'}`}
      >
        {isBusy ? '⏳' : isListening ? '⏹️' : '🎙️'}
      </button>
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
        {STATE_LABEL[uiState]}
      </div>
    </div>
  );
}

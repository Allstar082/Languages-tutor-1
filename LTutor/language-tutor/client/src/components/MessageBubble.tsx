import { ChatMessage } from '../types';

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-brand-500 text-white rounded-br-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm'
          }`}
        >
          {message.content}
        </div>
        {message.correction && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 space-y-1 max-w-full">
            <div className="font-semibold">📌 {message.correction.category}</div>
            <div>{message.correction.description}</div>
            {message.correction.example_wrong && (
              <div>❌ <span className="line-through">{message.correction.example_wrong}</span></div>
            )}
            {message.correction.example_correct && <div>✅ {message.correction.example_correct}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

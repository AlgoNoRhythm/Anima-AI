import * as React from 'react';

interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center animate-fade-in">
      {questions.map((question, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(question)}
          className="rounded-full border border-chat-accent/30 bg-chat-surface px-3 py-1.5 text-sm text-foreground transition-all duration-150 hover:border-chat-accent/60 hover:bg-chat-accent/5 active:scale-[0.97]"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

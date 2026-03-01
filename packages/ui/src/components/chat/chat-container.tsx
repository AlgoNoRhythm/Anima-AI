'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import { ChatBubble } from './chat-bubble';
import { ChatInput } from './chat-input';
import { SuggestedQuestions } from './suggested-questions';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    documentTitle: string;
    pageNumbers: number[];
    text: string;
  }>;
}

interface ChatContainerProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  suggestedQuestions?: string[];
  welcomeMessage?: string;
  className?: string;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  suggestedQuestions = [],
  welcomeMessage,
  className,
}: ChatContainerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={cn('flex flex-col h-full bg-chat-bg', className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[700px] mx-auto space-y-4">
          {messages.length === 0 && welcomeMessage && (
            <div className="text-center pt-8 pb-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-chat-accent/10 mb-4">
                <div className="w-10 h-10 rounded-full bg-chat-accent" />
              </div>
              <p className="text-lg font-medium text-foreground">{welcomeMessage}</p>
              <p className="text-sm text-chat-muted mt-1">Ask me anything about the documents.</p>
            </div>
          )}
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              role={message.role}
              content={message.content}
              citations={message.citations}
            />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <div className="bg-chat-assistant rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-chat-accent/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-chat-accent/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-chat-accent/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          {messages.length === 0 && suggestedQuestions.length > 0 && (
            <SuggestedQuestions
              questions={suggestedQuestions}
              onSelect={onSendMessage}
            />
          )}
        </div>
      </div>
      <ChatInput onSend={onSendMessage} disabled={isLoading} />
    </div>
  );
}

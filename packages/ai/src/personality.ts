import type { PersonalityConfig } from './types';

export function buildSystemPrompt(personality: PersonalityConfig, context: string): string {
  const parts: string[] = [];

  // Entity identity (if known)
  if (personality.entityName) {
    parts.push(`Your identity is "${personality.entityName}".`);
  }

  // Base system prompt
  parts.push(personality.systemPrompt);

  // Tone instruction
  const toneInstructions: Record<string, string> = {
    professional: 'Maintain a professional and authoritative tone.',
    friendly: 'Be warm, approachable, and conversational.',
    casual: 'Keep it relaxed and informal.',
    formal: 'Use formal language and structured responses.',
    technical: 'Be precise, technical, and detailed.',
  };
  if (toneInstructions[personality.tone]) {
    parts.push(toneInstructions[personality.tone]!);
  }

  // Custom instructions from guardrails
  if (personality.guardrails.customInstructions) {
    parts.push(personality.guardrails.customInstructions);
  }

  // Citation requirement
  if (personality.guardrails.requireCitations) {
    parts.push('Reference page numbers and section titles when citing specific details.');
  }

  // Off-topic handling
  if (!personality.guardrails.allowOffTopic) {
    parts.push('Only answer questions about yourself and topics within your knowledge. If the question is unrelated, politely say you can only help with questions about yourself.');
  }

  // Context
  if (context) {
    parts.push(`\nYour knowledge base:\n\n${context}`);
  }

  return parts.join('\n\n');
}

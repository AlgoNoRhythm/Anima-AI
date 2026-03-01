import type { Guardrails } from './types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateInput(text: string, guardrails: Guardrails): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { valid: false, reason: 'Message cannot be empty.' };
  }

  if (text.length > 10000) {
    return { valid: false, reason: 'Message is too long.' };
  }

  // Check blocked topics
  for (const topic of guardrails.blockedTopics) {
    if (text.toLowerCase().includes(topic.toLowerCase())) {
      return { valid: false, reason: `This topic is not allowed: ${topic}` };
    }
  }

  // Basic prompt injection detection
  const injectionPatterns = [
    /ignore\b.{0,20}\binstructions/i,
    /you are now/i,
    /new instructions:/i,
    /system prompt:/i,
    /disregard\b.{0,20}\binstructions/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: 'Message contains disallowed content.' };
    }
  }

  return { valid: true };
}

export function validateOutput(text: string, guardrails: Guardrails): ValidationResult {
  if (text.length > guardrails.maxResponseLength * 2) {
    return { valid: false, reason: 'Response exceeds maximum length.' };
  }

  // Check blocked topics in output
  for (const topic of guardrails.blockedTopics) {
    if (text.toLowerCase().includes(topic.toLowerCase())) {
      return { valid: false, reason: `Response contains blocked topic: ${topic}` };
    }
  }

  return { valid: true };
}

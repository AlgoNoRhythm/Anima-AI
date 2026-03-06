function getChatApiUrl(): string {
  if (process.env.NEXT_PUBLIC_CHAT_API_URL) {
    return process.env.NEXT_PUBLIC_CHAT_API_URL;
  }
  // In local dev, derive from the current browser origin so LAN access works
  // (e.g. phone on same WiFi scanning a QR code)
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  }
  return 'http://localhost:3001';
}

export async function createSession(projectSlug: string): Promise<{ sessionToken: string; expiresAt: string }> {
  const res = await fetch(`${getChatApiUrl()}/api/session/${projectSlug}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function sendMessage(
  projectSlug: string,
  message: string,
  sessionToken: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<Response> {
  return fetch(`${getChatApiUrl()}/api/chat/${projectSlug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({ message, history }),
  });
}

export async function sendFeedback(
  messageId: string,
  feedback: 'positive' | 'negative',
  sessionToken: string,
): Promise<void> {
  const res = await fetch(`${getChatApiUrl()}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify({ messageId, feedback }),
  });
  if (!res.ok) throw new Error('Failed to send feedback');
}

export async function submitFeedbackSurvey(
  data: {
    ratings?: Array<{ ratingId: string; value: number }>;
    answers?: Array<{ questionId: string; value: string }>;
  },
  sessionToken: string,
): Promise<void> {
  const res = await fetch(`${getChatApiUrl()}/api/feedback-survey`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': sessionToken,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Failed to submit feedback' }));
    throw new Error(body.error || 'Failed to submit feedback');
  }
}

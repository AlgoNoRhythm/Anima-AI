export type AnalyticsEventType =
  | 'session_start'
  | 'message_sent'
  | 'message_received'
  | 'feedback_given'
  | 'document_viewed'
  | 'qr_scanned';

export interface AnalyticsEvent {
  id: string;
  projectId: string;
  sessionId: string | null;
  eventType: AnalyticsEventType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface FeedbackRating {
  id: string;
  label: string;
  required: boolean;
}

export interface FeedbackQuestion {
  id: string;
  label: string;
  type: 'text';
  required: boolean;
}

import type { TranslationsMap, FeedbackConfigTranslations } from '@/lib/locale/types';

export interface FeedbackConfigState {
  enabled: boolean;
  ratings: FeedbackRating[];
  questions: FeedbackQuestion[];
  submitButtonLabel: string;
  thankYouMessage: string;
  translations: TranslationsMap<FeedbackConfigTranslations>;
}

export const FEEDBACK_DEFAULTS: FeedbackConfigState = {
  enabled: false,
  ratings: [],
  questions: [],
  submitButtonLabel: 'Submit Feedback',
  thankYouMessage: 'Thank you for your feedback!',
  translations: {},
};

export const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'it'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
};

export interface ThemeTranslations {
  welcomeMessage?: string;
  actionButtonLabel?: string;
  suggestedQuestions?: string[];
}

export interface PersonalityTranslations {
  name?: string;
  disclaimerText?: string;
}

export interface FeedbackConfigTranslations {
  submitButtonLabel?: string;
  thankYouMessage?: string;
  ratingLabels?: Record<string, string>;
  questionLabels?: Record<string, string>;
}

export type TranslationsMap<T> = Partial<Record<Exclude<SupportedLocale, 'en'>, Partial<T>>>;

export interface ChatUITranslations {
  poweredBy: string;
  askMeAnything: string;
  browseDocument: string;
  restartChat: string;
  typeYourMessage: string;
  sendMessage: string;
  responseInterrupted: string;
  source: string;
  sources: string;
  page: string;
  goodResponse: string;
  badResponse: string;
  thumbsUp: string;
  thumbsDown: string;
  leaveFeedback: string;
  visitAnima: string;
  dismissDisclaimer: string;
  dismiss: string;
  pleaseSelectRating: string;
  pleaseAnswer: string;
  noActiveSession: string;
  failedToSubmitFeedback: string;
  thankYou: string;
  shareFeedback: string;
  close: string;
  typeYourAnswer: string;
  submitting: string;
  closePdfViewer: string;
  pageXOfY: string;
  tableOfContents: string;
  documents: string;
  pagesRange: string;
  previousPage: string;
  nextPage: string;
  failedToLoadPdf: string;
  failedToConnect: string;
  tooManyMessages: string;
  tooManyMessagesWait: string;
  failedToSendMessage: string;
  documentViewOnly: string;
}

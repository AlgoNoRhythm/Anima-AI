export interface ThemeState {
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  welcomeMessage: string;
  logoUrl: string | null;
  borderRadius: string;
  showLogo: boolean;
  actionButtonLabel: string;
}

export const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'DM Sans', value: '"DM Sans", system-ui, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { label: 'System', value: 'system-ui, sans-serif' },
] as const;

export const RADIUS_OPTIONS = [
  { label: 'None', value: '0', preview: '0' },
  { label: 'Small', value: '0.25rem', preview: '2px' },
  { label: 'Medium', value: '0.5rem', preview: '6px' },
  { label: 'Large', value: '0.75rem', preview: '10px' },
  { label: 'Full', value: '1rem', preview: '14px' },
] as const;

export const MOCK_MESSAGES = [
  {
    id: '1',
    role: 'user' as const,
    content: 'How do I get started?',
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: 'Welcome! You can start by uploading a document to your project. I\'ll analyze it and be ready to answer your questions.',
    citation: { title: 'Getting Started Guide', page: 3 },
  },
  {
    id: '3',
    role: 'user' as const,
    content: 'What file types are supported?',
  },
] as const;

export const THEME_DEFAULTS: ThemeState = {
  primaryColor: '#eab308',
  backgroundColor: '#fffdf9',
  fontFamily: 'Inter, system-ui, sans-serif',
  welcomeMessage: 'Hello! How can I help you today?',
  logoUrl: null,
  borderRadius: '0.5rem',
  showLogo: false,
  actionButtonLabel: 'Open PDF',
};

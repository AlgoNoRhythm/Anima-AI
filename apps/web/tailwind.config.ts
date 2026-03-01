import type { Config } from 'tailwindcss';
import sharedConfig from '../../packages/ui/tailwind.config.js';

const config: Config = {
  ...sharedConfig,
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;

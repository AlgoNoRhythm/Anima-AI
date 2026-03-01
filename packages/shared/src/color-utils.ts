/** Convert hex (#rrggbb) to HSL string "h s% l%" for shadcn CSS variables */
export function hexToHsl(hex: string): string | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  const r = parseInt(m[1]!, 16) / 255;
  const g = parseInt(m[2]!, 16) / 255;
  const b = parseInt(m[3]!, 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Parse a "h s% l%" HSL string and return { h, s, l } as numbers */
function parseHslComponents(hsl: string): { h: number; s: number; l: number } | null {
  const match = /^(\d+)\s+(\d+)%\s+(\d+)%$/.exec(hsl);
  if (!match) return null;
  return { h: parseInt(match[1]!, 10), s: parseInt(match[2]!, 10), l: parseInt(match[3]!, 10) };
}

/**
 * Compute CSS variable overrides for a theme.
 * Returns a Record of CSS variable names (with `--` prefix) to values,
 * plus optional `colorScheme` and `fontFamily` properties.
 *
 * Chat bubble colors are derived from the primary color:
 * - User bubble = primary color
 * - Assistant bubble = soft tint using primary hue
 * - Accent = primary color
 */
export function computeThemeVars(opts: {
  primaryColor?: string;
  backgroundColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}): Record<string, string> {
  const vars: Record<string, string> = {};

  // Defaults for primary hue/saturation (yellow-500 #eab308)
  let pH = 48;
  let pS = 94;
  let pL = 48;

  if (opts.primaryColor) {
    const hsl = hexToHsl(opts.primaryColor);
    if (hsl) {
      const comps = parseHslComponents(hsl);
      if (comps) {
        pH = comps.h;
        pS = comps.s;
        pL = comps.l;
      }
      vars['--primary'] = hsl;
      vars['--ring'] = hsl;
      vars['--primary-foreground'] = pL > 60 ? '0 0% 9%' : '0 0% 98%';
      // Chat: accent follows primary
      vars['--chat-accent'] = hsl;
      vars['--chat-accent-fg'] = pL > 60 ? '0 0% 9%' : '0 0% 100%';
      // Chat: user bubble = primary color
      vars['--chat-user'] = hsl;
      vars['--chat-user-fg'] = pL > 60 ? '0 0% 9%' : '0 0% 98%';
    }
  }

  if (opts.backgroundColor) {
    const hsl = hexToHsl(opts.backgroundColor);
    if (hsl) {
      vars['--background'] = hsl;
      const comps = parseHslComponents(hsl);
      const lightness = comps?.l ?? 98;
      const isLight = lightness > 60;
      vars['--foreground'] = isLight ? '240 6% 10%' : '30 10% 97%';
      vars['--card'] = isLight ? '0 0% 100%' : '240 5% 9%';
      vars['--card-foreground'] = vars['--foreground'];
      vars['--muted'] = isLight ? '30 12% 95%' : '240 5% 14%';
      vars['--muted-foreground'] = isLight ? '240 4% 46%' : '0 0% 64%';
      vars['--border'] = isLight ? '30 10% 90%' : '240 5% 16%';
      vars['--input'] = vars['--border'];
      vars['--ring'] = vars['--ring'] ?? (isLight ? '240 6% 10%' : '30 10% 97%');
      vars['colorScheme'] = isLight ? 'light' : 'dark';

      // Derive assistant bubble from primary hue: soft tint
      const assistSat = Math.min(pS, 25);
      if (isLight) {
        vars['--chat-bg'] = '220 14% 98%';
        vars['--chat-surface'] = '0 0% 100%';
        vars['--chat-assistant'] = `${pH} ${assistSat}% 93%`;
        vars['--chat-muted'] = '0 0% 55%';
        vars['--chat-border'] = `${pH} ${Math.min(pS, 12)}% 90%`;
      } else {
        vars['--chat-bg'] = '240 6% 8%';
        vars['--chat-surface'] = '240 5% 12%';
        vars['--chat-assistant'] = `${pH} ${Math.min(pS, 15)}% 18%`;
        vars['--chat-muted'] = '0 0% 50%';
        vars['--chat-border'] = `${pH} ${Math.min(pS, 10)}% 20%`;
      }
    }
  }

  if (opts.borderRadius) {
    vars['--radius'] = opts.borderRadius;
  }

  if (opts.fontFamily) {
    vars['fontFamily'] = opts.fontFamily;
  }

  return vars;
}

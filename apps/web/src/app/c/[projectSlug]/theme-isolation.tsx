'use client';

import { useEffect } from 'react';

/**
 * Forces the document dark/light class to match the project's theme,
 * ignoring the admin user's dark mode preference from localStorage.
 * This ensures the public chat page always renders with the correct
 * color scheme based on the project's background color setting.
 */
export function PublicChatThemeIsolation({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return <>{children}</>;
}

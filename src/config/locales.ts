export const SUPPORTED_LOCALES = ['en', 'ru'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Maps a raw device locale string (e.g. "ru", "pt-BR", "zh-Hans") to a supported language.
 * Falls back to 'en' if the raw value is missing or unrecognized..
 */
export function resolveLocale(raw?: string): SupportedLocale {
  if (!raw) return 'en';

  const normalized = raw.toLowerCase();

  // Exact match first
  const exact = SUPPORTED_LOCALES.find((l) => l === normalized);
  if (exact) return exact;

  // Language prefix match (e.g. "pt-BR" → "pt", "zh-Hans" → "zh")
  const prefix = normalized.split(/[-_]/)[0];
  const prefixMatch = SUPPORTED_LOCALES.find((l) => l === prefix);
  if (prefixMatch) return prefixMatch;

  return 'en';
}

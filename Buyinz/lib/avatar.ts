/**
 * Public avatars must be network-accessible URLs.
 * Local file URIs (file://) are device-specific and break for other users.
 */
export function sanitizePublicAvatarUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return null;
}

/**
 * Backend may send profile image URLs with /matrimony in the path.
 * Correct format is without /matrimony (e.g. .../uploads/profiles/...).
 * If the URL contains /matrimony, remove that segment before using.
 */
export function normalizeProfileImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/\/matrimony\/?/, '/');
}

/** Turn API paths (relative or absolute) into a browser-loadable image URL. */
export function toAbsoluteMediaUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const cleaned = trimmed
    .split(',')[0]
    .trim()
    .replace(/(\.(?:jpg|jpeg|png|webp|gif))\.profile(\b|$)/i, '$1$2');

  if (cleaned.startsWith('data:') || cleaned.startsWith('http') || cleaned.startsWith('//')) {
    return normalizeProfileImageUrl(cleaned);
  }

  const bareName = cleaned.replace(/^\//, '');
  if (/^profile_[\w.-]+\.(jpg|jpeg|png|webp|gif)$/i.test(bareName)) {
    return normalizeProfileImageUrl(`https://vescript.vescript.com/api/profiles/photos/${bareName}`);
  }

  const path = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return normalizeProfileImageUrl(`https://vescript.vescript.com${path}`);
}

/** Extract a URL string from API values that may be a string or { url, path, ... }. */
export function extractMediaUrl(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return toAbsoluteMediaUrl(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const raw =
      obj['url'] ??
      obj['path'] ??
      obj['src'] ??
      obj['image'] ??
      obj['uri'] ??
      obj['photoUrl'] ??
      obj['photo_url'];
    return toAbsoluteMediaUrl(String(raw ?? ''));
  }
  return '';
}

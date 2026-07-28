export type ChatBackgroundId =
  | 'default'
  | 'light'
  | 'lightPink'
  | 'darkBg'
  | 'gradient'
  | 'image'
  | 'purple'
  | 'dots'
  | 'hearts'
  | 'lines'
  | 'floral'
  | 'sunset';
export type BubbleColorId = 'pink' | 'blue' | 'green' | 'purple';
export type BubbleShapeId = 'rounded' | 'sharp';
export type BubbleSizeId = 'small' | 'medium' | 'large';
export type FontSizeId = 'small' | 'medium' | 'large';
export type FontFamilyId = 'system' | 'serif' | 'mono';

export interface ChatThemeSettings {
  background: ChatBackgroundId;
  /** Set when user picks image wallpaper (data URL). */
  wallpaperDataUrl: string | null;
  bubbleColor: BubbleColorId;
  bubbleShape: BubbleShapeId;
  bubbleSize: BubbleSizeId;
  darkMode: boolean;
  fontSize: FontSizeId;
  fontFamily: FontFamilyId;
}

export const CHAT_THEME_STORAGE_KEY = 'chat_theme_settings_v1';

export const DEFAULT_CHAT_THEME: ChatThemeSettings = {
  background: 'default',
  wallpaperDataUrl: null,
  bubbleColor: 'pink',
  bubbleShape: 'rounded',
  bubbleSize: 'medium',
  darkMode: false,
  fontSize: 'medium',
  fontFamily: 'system',
};

/**
 * High-DPI heart tile: vector path (24×24 artboard), scaled to 56px for crisp repeats on retina.
 */
const HEART_PATTERN_TILE_HD = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="geometricPrecision">` +
    `<path fill="#d81b60" fill-opacity="0.11" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>` +
    `</svg>`
);

function useHdBackground(s: ChatThemeSettings): boolean {
  if (s.darkMode) {
    return false;
  }
  switch (s.background) {
    case 'dots':
    case 'hearts':
    case 'lines':
    case 'floral':
    case 'purple':
    case 'gradient':
    case 'sunset':
      return true;
    case 'image':
      return !!s.wallpaperDataUrl;
    default:
      return false;
  }
}

const BUBBLE_PALETTE: Record<BubbleColorId, { me: string; other: string; meDark: string; otherDark: string }> = {
  pink: { me: '#F33A6A', other: '#e9ecef', meDark: '#ff5c8a', otherDark: '#3d2a32' },
  blue: { me: '#2196F3', other: '#e3f2fd', meDark: '#64b5f6', otherDark: '#1a2a3a' },
  green: { me: '#43a047', other: '#e8f5e9', meDark: '#66bb6a', otherDark: '#1b2e1f' },
  purple: { me: '#9c27b0', other: '#f3e5f5', meDark: '#ba68c8', otherDark: '#2d1f35' },
};

function backgroundCss(s: ChatThemeSettings): { bg: string; fg: string; mode: 'solid' | 'image' } {
  /* Sunset: vivid multi-stop gradient (animated via CSS class). */
  if (s.background === 'sunset') {
    return {
      bg:
        'linear-gradient(125deg, #fccc0a 0%, #fbad50 12%, #f77737 26%, #fd1d1d 40%, #e1306c 54%, #c13584 64%, #833ab4 78%, #5851db 88%, #405de6 100%)',
      fg: '#ffffff',
      mode: 'solid',
    };
  }
  if (s.darkMode) {
    return { bg: '#121212', fg: '#e8e8e8', mode: 'solid' };
  }
  switch (s.background) {
    case 'light':
      return { bg: '#ffffff', fg: '#212529', mode: 'solid' };
    case 'lightPink':
      return { bg: '#fff5f8', fg: '#333', mode: 'solid' };
    case 'darkBg':
      return { bg: '#1e1e1e', fg: '#e0e0e0', mode: 'solid' };
    case 'gradient':
      return {
        bg:
          'linear-gradient(165deg, #fce4ec 0%, #f8c2d4 18%, #f8bbd0 32%, #e1bee7 58%, #d1aee8 78%, #ce93d8 100%)',
        fg: '#2d1a24',
        mode: 'solid',
      };
    case 'purple':
      return {
        bg:
          'linear-gradient(148deg, #f3e5f5 0%, #ede7f6 18%, #e1bee7 38%, #d1c4e9 58%, #b39ddb 82%, #9f7fd6 100%)',
        fg: '#2d2238',
        mode: 'solid',
      };
    case 'dots':
      return {
        bg:
          'radial-gradient(circle at 50% 50%, rgba(194, 24, 90, 0.13) 0%, rgba(194, 24, 90, 0.13) 1px, transparent 1px) 0 0 / 16px 16px, linear-gradient(180deg, #fdfcfd 0%, #faf8fa 50%, #f7f5f7 100%)',
        fg: '#333',
        mode: 'solid',
      };
    case 'hearts':
      return {
        bg: `url("data:image/svg+xml,${HEART_PATTERN_TILE_HD}") 0 0 / 56px 56px, linear-gradient(165deg, #fffafc 0%, #fff5f9 45%, #fce4ec 100%)`,
        fg: '#3d2433',
        mode: 'solid',
      };
    case 'lines':
      return {
        bg:
          'linear-gradient(90deg, rgba(156, 39, 176, 0.055) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(0deg, rgba(233, 30, 99, 0.045) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(180deg, #fcfcfc 0%, #f7f7f7 100%)',
        fg: '#333',
        mode: 'solid',
      };
    case 'floral':
      return {
        bg:
          'radial-gradient(ellipse 95% 75% at 12% 18%, rgba(252, 228, 236, 0.95) 0%, rgba(244, 143, 177, 0.2) 38%, rgba(244, 143, 177, 0.06) 58%, transparent 68%), radial-gradient(ellipse 90% 80% at 88% 82%, rgba(237, 231, 246, 0.92) 0%, rgba(186, 104, 200, 0.14) 42%, rgba(186, 104, 200, 0.05) 62%, transparent 72%), radial-gradient(ellipse 100% 85% at 48% 42%, rgba(255, 182, 193, 0.12) 0%, rgba(233, 30, 99, 0.04) 45%, transparent 58%), radial-gradient(ellipse 55% 45% at 72% 28%, rgba(206, 147, 216, 0.08) 0%, transparent 55%), #fffbf7',
        fg: '#3d2c35',
        mode: 'solid',
      };
    case 'image':
      return s.wallpaperDataUrl
        ? { bg: `url(${JSON.stringify(s.wallpaperDataUrl)})`, fg: '#212529', mode: 'image' }
        : { bg: '#f8f9fa', fg: '#333', mode: 'solid' };
    case 'default':
    default:
      return { bg: '#f8f9fa', fg: '#333', mode: 'solid' };
  }
}

/** CSS custom properties + class names for `.chat-theme-body` */
export function buildThemeBodyStyle(s: ChatThemeSettings): Record<string, string> {
  const { bg, fg, mode: bgMode } = backgroundCss(s);
  const pal = BUBBLE_PALETTE[s.bubbleColor];
  const me = s.darkMode ? pal.meDark : pal.me;
  const other = s.darkMode ? pal.otherDark : pal.other;
  const otherText = s.darkMode ? '#e0e0e0' : '#333';
  const meText = '#ffffff';

  const fontScale =
    s.fontSize === 'small' ? '0.875' : s.fontSize === 'large' ? '1.125' : '1';
  const fontFamily =
    s.fontFamily === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : s.fontFamily === 'mono'
        ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
        : 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

  const style: Record<string, string> = {
    '--ct-bg': bg,
    '--ct-bg-mode': bgMode,
    '--ct-fg': fg,
    '--ct-bubble-me': me,
    '--ct-bubble-me-text': meText,
    '--ct-bubble-other': other,
    '--ct-bubble-other-text': otherText,
    '--ct-time-opacity': s.darkMode ? '0.85' : '0.7',
    '--ct-font-scale': fontScale,
    '--ct-font-family': fontFamily,
  };

  if (bgMode === 'image' && s.wallpaperDataUrl) {
    style['--ct-bg-overlay'] = s.darkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.72)';
  } else {
    style['--ct-bg-overlay'] = 'transparent';
  }

  /* Input row follows chat theme when dark */
  style['--ct-input-bg'] = s.darkMode ? '#2d2d2d' : '#ffffff';
  style['--ct-input-fg'] = s.darkMode ? '#e8e8e8' : '#212529';
  style['--ct-input-border'] = s.darkMode ? '#444' : '#ddd';
  style['--ct-attach-bg'] = s.darkMode ? '#3d3d3d' : '#f0f0f0';
  style['--ct-send-bg'] = s.darkMode ? '#c2185b' : '#F33A6A';

  if (s.background === 'sunset') {
    style['--ct-fg'] = '#ffffff';
    style['--ct-bubble-me-text'] = '#ffffff';
    style['--ct-bubble-other-text'] = '#1a1a1a';
    style['--ct-time-opacity'] = '0.95';
    style['--ct-input-bg'] = 'rgba(255, 255, 255, 0.9)';
    style['--ct-input-fg'] = '#1a1a1a';
    style['--ct-input-border'] = 'rgba(255, 255, 255, 0.55)';
    style['--ct-attach-bg'] = 'rgba(255, 255, 255, 0.28)';
    style['--ct-send-bg'] = '#e1306c';
  }

  return style;
}

export function themeBgMode(s: ChatThemeSettings): 'solid' | 'image' {
  const { mode } = backgroundCss(s);
  return mode;
}

export function themeBodyClassList(s: ChatThemeSettings): string[] {
  return [
    'chat-theme-body',
    `theme-bubble-shape-${s.bubbleShape}`,
    `theme-bubble-size-${s.bubbleSize}`,
    s.darkMode ? 'theme-dark-chat' : '',
    s.background === 'image' && s.wallpaperDataUrl ? 'theme-has-wallpaper' : '',
    s.background === 'sunset' ? 'theme-bg-sunset' : '',
    useHdBackground(s) ? 'theme-bg-hd' : '',
  ].filter(Boolean);
}

/** Same bubble/shape classes as main chat, without the flex layout class (for modal preview). */
export function themePreviewSurfaceClassList(s: ChatThemeSettings): string[] {
  return [
    `theme-bubble-shape-${s.bubbleShape}`,
    `theme-bubble-size-${s.bubbleSize}`,
    s.darkMode ? 'theme-dark-chat' : '',
    s.background === 'image' && s.wallpaperDataUrl ? 'theme-has-wallpaper' : '',
    s.background === 'sunset' ? 'theme-bg-sunset' : '',
    useHdBackground(s) ? 'theme-bg-hd' : '',
  ].filter(Boolean);
}

export function cloneTheme(s: ChatThemeSettings): ChatThemeSettings {
  return { ...s, wallpaperDataUrl: s.wallpaperDataUrl ? s.wallpaperDataUrl : null };
}

export function loadThemeFromStorage(): ChatThemeSettings {
  try {
    const raw = localStorage.getItem(CHAT_THEME_STORAGE_KEY);
    if (!raw) return cloneTheme(DEFAULT_CHAT_THEME);
    const parsed = JSON.parse(raw) as Partial<ChatThemeSettings>;
    const merged = {
      ...DEFAULT_CHAT_THEME,
      ...parsed,
      wallpaperDataUrl: typeof parsed.wallpaperDataUrl === 'string' ? parsed.wallpaperDataUrl : null,
    } as ChatThemeSettings;
    /* Legacy key from older builds */
    if ((parsed as { background?: string }).background === 'instagram') {
      merged.background = 'sunset';
    }
    return merged;
  } catch {
    return cloneTheme(DEFAULT_CHAT_THEME);
  }
}

export function saveThemeToStorage(s: ChatThemeSettings): void {
  try {
    localStorage.setItem(CHAT_THEME_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}

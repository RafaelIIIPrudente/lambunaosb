/**
 * Shared inline styles for SB Lambunao transactional emails.
 * Mirrors docs/design-system.md tokens. System-font fallbacks keep
 * the brand recognizable across email clients that drop @font-face.
 */

export const COLORS = {
  paper: '#FAF8F3',
  paper2: '#F3EFE6',
  paper3: '#EBE6DA',
  ink: '#1A1A1A',
  inkSoft: '#3A3A3A',
  inkFaint: '#6A6A6A',
  inkGhost: '#B5B5B5',
  navy: '#0B2447',
  rust: '#C14A2A',
  rustDark: '#9B3F22',
  gold: '#B88A3E',
  success: '#2D6A3A',
} as const;

export const FONTS = {
  display: '"Fraunces", "Source Serif Pro", Georgia, serif',
  script: '"Caveat", "Brush Script MT", cursive',
  sans: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"Geist Mono", "JetBrains Mono", "SF Mono", Consolas, monospace',
} as const;

export const main = {
  backgroundColor: COLORS.paper,
  fontFamily: FONTS.sans,
  margin: '0',
  padding: '40px 20px',
};

export const container = {
  backgroundColor: COLORS.paper,
  margin: '0 auto',
  padding: '32px',
  maxWidth: '560px',
  border: `1px solid ${COLORS.paper3}`,
  borderRadius: '12px',
};

export const eyebrow = {
  color: COLORS.rust,
  fontFamily: FONTS.mono,
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px 0',
};

export const heading = {
  color: COLORS.ink,
  fontFamily: FONTS.display,
  fontSize: '28px',
  fontWeight: 700,
  lineHeight: '1.15',
  margin: '0 0 12px 0',
};

export const greeting = {
  color: COLORS.ink,
  fontFamily: FONTS.script,
  fontSize: '24px',
  fontWeight: 500,
  lineHeight: '1.2',
  margin: '24px 0 12px 0',
};

export const paragraph = {
  color: COLORS.inkSoft,
  fontFamily: FONTS.sans,
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '12px 0',
};

export const refBlock = {
  backgroundColor: COLORS.paper2,
  border: `1px solid ${COLORS.paper3}`,
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'left' as const,
};

export const refLabel = {
  color: COLORS.rust,
  fontFamily: FONTS.mono,
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px 0',
};

export const refValue = {
  color: COLORS.rust,
  fontFamily: FONTS.mono,
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  margin: '0',
};

export const button = {
  backgroundColor: COLORS.rust,
  borderRadius: '8px',
  color: COLORS.paper,
  fontFamily: FONTS.script,
  fontSize: '18px',
  fontWeight: 500,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '20px 0',
};

export const hr = {
  border: 'none',
  borderTop: `1px dashed ${COLORS.paper3}`,
  margin: '24px 0',
};

export const footer = {
  color: COLORS.inkFaint,
  fontFamily: FONTS.mono,
  fontSize: '11px',
  lineHeight: '1.5',
  margin: '24px 0 0 0',
};

export const link = {
  color: COLORS.rust,
  textDecoration: 'underline',
};

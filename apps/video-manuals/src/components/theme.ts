export const theme = {
  primary: 'hsl(330 81% 60%)',
  primaryHex: '#ef4d87',
  background: 'hsl(220 14% 96%)',
  foreground: 'hsl(220 26% 14%)',
  muted: 'hsl(220 14% 60%)',
  accent: 'hsl(330 81% 92%)',
} as const;

export const typo = {
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 800,
  },
  body: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 400,
  },
} as const;

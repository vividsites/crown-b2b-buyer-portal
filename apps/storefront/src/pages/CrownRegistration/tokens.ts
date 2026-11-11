export const crownColors = {
  navy: '#15296E',
  red: '#E41C40',
  redHover: '#C1152F',
  errorSurface: '#FDEEF0',
  pageGround: '#FFFAF7',
  surface: '#FFFFFF',
  fieldFill: '#F4F5F7',
  uploadFill: '#FAFBFC',
  selectedCardFill: '#F2F4FA',
  bodyText: '#3F4650',
  mutedText: '#5B6473',
  fieldUnderline: '#BFC6CD',
  border: '#D5D8DE',
  divider: '#E4E6EA',
  scrim: 'rgba(13, 20, 45, 0.55)',
  black: '#000000',
} as const;

const fallback = "'Franklin Gothic', Arial, sans-serif";

export const crownFonts = {
  body: `franklin-gothic-urw, ${fallback}`,
  comp: `franklin-gothic-urw-comp, ${fallback}`,
  cond: `franklin-gothic-urw-cond, ${fallback}`,
} as const;

export const crownBreakpoints = { stack: 720 } as const;

export const crownMedia = {
  stacked: `@media (max-width: ${crownBreakpoints.stack - 1}px)`,
} as const;

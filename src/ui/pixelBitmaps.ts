/**
 * Pixel icons as bitmaps: one string per row, `#` for a lit pixel. Drawn by PixelIcon,
 * so there are no image files.
 */
export const PIXEL_BITMAPS = {
  'chevron-left': ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  'chevron-right': ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
} as const satisfies Record<string, readonly string[]>;

export type PixelIconName = keyof typeof PIXEL_BITMAPS;

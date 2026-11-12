import { PIXEL_BITMAPS, type PixelIconName } from './pixelBitmaps.ts';

interface PixelIconProps {
  name: PixelIconName;
  /** Screen pixels per bitmap pixel. */
  scale?: number;
  className?: string;
}

/** A bitmap icon: one 1x1 rect per lit pixel, crisp edges, in the current text colour. */
export function PixelIcon({ name, scale = 2, className }: PixelIconProps) {
  const rows: readonly string[] = PIXEL_BITMAPS[name];
  const width = rows[0]?.length ?? 0;
  const height = rows.length;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={className}
    >
      {rows.flatMap((row, y) =>
        [...row].map((pixel, x) =>
          pixel === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null,
        ),
      )}
    </svg>
  );
}

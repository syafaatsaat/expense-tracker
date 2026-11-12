import type { ReactNode } from 'react';

interface TallTextProps {
  children: ReactNode;
  /** Horizontal scale: Silkscreen is set at 8 × sx px, so every pixel stays whole. */
  sx: number;
  /** Vertical scale: the text is stretched to 8 × sy px tall. */
  sy: number;
  /** Anchor for the stretch; logos stretch from the left, button labels from the centre. */
  align?: 'start' | 'center';
}

/** Silkscreen stretched vertically (the hand-off's tall-text technique). Width stays true. */
export function TallText({ children, sx, sy, align = 'center' }: TallTextProps) {
  const size = 8 * sx;
  return (
    <span className="inline-flex items-center" style={{ height: 8 * sy + 4 }}>
      <span
        className="inline-block font-pixel whitespace-nowrap"
        style={{
          fontSize: size,
          lineHeight: `${size}px`,
          transform: `scaleY(${sy / sx})`,
          transformOrigin: align === 'start' ? '0 50%' : '50% 50%',
        }}
      >
        {children}
      </span>
    </span>
  );
}

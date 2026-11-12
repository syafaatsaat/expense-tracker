import { render } from '@testing-library/react';
import { PixelIcon } from './PixelIcon.tsx';
import { PIXEL_BITMAPS } from './pixelBitmaps.ts';

describe('PixelIcon', () => {
  it.each(Object.keys(PIXEL_BITMAPS) as (keyof typeof PIXEL_BITMAPS)[])(
    'draws one rect per lit pixel of %s',
    (name) => {
      const { container } = render(<PixelIcon name={name} />);
      const lit = PIXEL_BITMAPS[name]
        .join('')
        .split('')
        .filter((c) => c === '#').length;
      expect(container.querySelectorAll('rect')).toHaveLength(lit);
    },
  );

  it('scales the bitmap with crisp edges, in the current text colour, hidden from AT', () => {
    const { container } = render(<PixelIcon name="chevron-left" scale={3} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '12');
    expect(svg).toHaveAttribute('height', '21');
    expect(svg).toHaveAttribute('viewBox', '0 0 4 7');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });

  it('has bitmaps whose rows are all the same width', () => {
    for (const rows of Object.values(PIXEL_BITMAPS)) {
      expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    }
  });
});

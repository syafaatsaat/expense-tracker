import { useId } from 'react';

interface TeethProps {
  /** `bottom`: teeth hang below the paper. `top`: the exact inverse, for a torn-off top. */
  edge: 'top' | 'bottom';
}

// One 12x6 tooth in 2px steps. The top edge fills exactly the gaps the bottom edge leaves,
// so a receipt torn from the roll matches the one still attached.
const BOTTOM = [
  [0, 0, 12],
  [2, 2, 8],
  [4, 4, 4],
] as const;
const TOP = [
  [0, 2, 2],
  [10, 2, 2],
  [0, 4, 4],
  [8, 4, 4],
] as const;

/** A row of receipt teeth, tiled across the full width in the paper colour. */
export function Teeth({ edge }: TeethProps) {
  const id = useId();
  return (
    <svg aria-hidden="true" width="100%" height="6" shapeRendering="crispEdges" className="block">
      <defs>
        <pattern id={id} width="12" height="6" patternUnits="userSpaceOnUse">
          {(edge === 'bottom' ? BOTTOM : TOP).map(([x, y, w]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height={2} className="fill-paper" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="6" fill={`url(#${CSS.escape(id)})`} />
    </svg>
  );
}

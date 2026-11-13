// Bars from the design canvas: [x, width] in px across a 300x28 code.
const BARS = [
  [0, 4],
  [6, 2],
  [12, 2],
  [16, 6],
  [24, 4],
  [32, 2],
  [38, 2],
  [42, 2],
  [46, 2],
  [50, 2],
  [54, 6],
  [62, 2],
  [68, 2],
  [72, 6],
  [80, 6],
  [90, 2],
  [94, 2],
  [98, 6],
  [106, 4],
  [112, 2],
  [118, 2],
  [124, 4],
  [132, 2],
  [136, 6],
  [146, 2],
  [150, 2],
  [156, 2],
  [162, 2],
  [168, 2],
  [172, 6],
  [180, 4],
  [186, 6],
  [194, 4],
  [200, 2],
  [204, 2],
  [208, 6],
  [216, 6],
  [224, 4],
  [232, 2],
  [236, 6],
  [244, 2],
  [250, 2],
  [254, 4],
  [260, 2],
  [264, 2],
  [270, 2],
  [276, 6],
  [284, 4],
  [292, 4],
] as const;

/** Decorative barcode. Clipped, not scaled, on narrow receipts so every bar stays crisp. */
export function Barcode() {
  return (
    <div aria-hidden="true" className="mt-1 flex justify-center overflow-hidden">
      <svg width="300" height="28" shapeRendering="crispEdges" className="shrink-0 fill-ink">
        {BARS.map(([x, w]) => (
          <rect key={x} x={x} y={0} width={w} height={28} />
        ))}
      </svg>
    </div>
  );
}

import { type IntradayCandle } from "@/lib/api";

/**
 * Tiny intraday candlestick sparkline for a watchlist chip. Rendered as plain
 * SVG (no per-chip chart engine) so it scales to dozens of rows with zero
 * canvas overhead. `preserveAspectRatio="none"` stretches it to the available
 * width; wicks use non-scaling strokes so they stay crisp at any size.
 */
export function MiniCandles({
  candles,
  className,
}: {
  candles: IntradayCandle[];
  className?: string;
}) {
  // Need at least a couple of bars for the shape to mean anything.
  if (!candles || candles.length < 2) {
    return <div className={className} aria-hidden />;
  }

  const CW = 4; // viewBox units per candle cell
  const H = 100;
  const PAD = 8;
  const W = candles.length * CW;

  let hi = candles[0].h;
  let lo = candles[0].l;
  for (const k of candles) {
    if (k.h > hi) hi = k.h;
    if (k.l < lo) lo = k.l;
  }
  const range = hi - lo || 1;
  const y = (p: number) => PAD + (1 - (p - lo) / range) * (H - 2 * PAD);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {candles.map((k, i) => {
        const bull = k.c >= k.o;
        const color = bull ? "var(--up)" : "var(--down)";
        const xc = i * CW + CW / 2;
        const top = y(Math.max(k.o, k.c));
        const bot = y(Math.min(k.o, k.c));
        const bodyH = Math.max(bot - top, 1.4);
        return (
          <g key={i}>
            <line
              x1={xc}
              y1={y(k.h)}
              x2={xc}
              y2={y(k.l)}
              stroke={color}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <rect x={i * CW + 0.7} y={top} width={CW - 1.4} height={bodyH} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

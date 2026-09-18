import type { PricePoint } from "@/lib/types";
import { formatEuro } from "@/lib/money";

export function PriceHistoryChart({
  history,
  currentPrice,
}: {
  history: PricePoint[];
  currentPrice: number;
}) {
  if (history.length < 2) return null;

  const width = 640;
  const height = 220;
  const padX = 48;
  const padY = 28;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices) - 20;
  const max = Math.max(...prices) + 20;
  const span = max - min || 1;

  const coords = history.map((point, i) => {
    const x =
      padX + ((width - padX * 2) * i) / Math.max(history.length - 1, 1);
    const y = padY + (1 - (point.price - min) / span) * (height - padY * 2);
    return { x, y, ...point };
  });

  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const last = coords[coords.length - 1];
  const yTicks = [max, (max + min) / 2, min];
  const monthLabels = history
    .filter((_, i) => i === 0 || i === Math.floor(history.length / 2) || i === history.length - 1)
    .map((h) =>
      new Date(h.date).toLocaleString("en", { month: "short" }),
    );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[320px]"
        role="img"
        aria-label={`Price history chart. Current price ${formatEuro(currentPrice)}.`}
      >
        {yTicks.map((tick) => {
          const y = padY + (1 - (tick - min) / span) * (height - padY * 2);
          return (
            <g key={tick}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeDasharray="4 6"
              />
              <text
                x={8}
                y={y + 4}
                fill="var(--muted)"
                fontSize="11"
                fontFamily="var(--font-body)"
              >
                €{Math.round(tick)}
              </text>
            </g>
          );
        })}
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={last.x}
          cy={last.y}
          r="6"
          fill="var(--ink)"
          stroke="white"
          strokeWidth="2"
        />
        {monthLabels.map((label, i) => {
          const x =
            i === 0
              ? padX
              : i === 1
                ? width / 2
                : width - padX;
          return (
            <text
              key={`${label}-${i}`}
              x={x}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
              fill="var(--muted)"
              fontSize="11"
              fontFamily="var(--font-body)"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

import { cn } from '@/lib/utils';

function normalize(values: number[], width: number, height: number, pad = 4) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = pad + (index / Math.max(values.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return { x, y };
  });
}

export function Sparkline({
  values,
  width = 260,
  height = 96,
  color = '#22d3ee',
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const points = normalize(values, width, height, 6);
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');
  const area = `${line} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;
  const id = `spark-${color.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="Balance trend"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function MiniBarChart({
  data,
  className,
  barClassName = 'bg-brand',
  highlightClassName = 'bg-cyan',
  height = 132,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  className?: string;
  barClassName?: string;
  highlightClassName?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className={cn('w-full', className)}>
      <div
        className="flex items-end justify-between gap-2.5"
        style={{ height }}
      >
        {data.map((item) => (
          <div key={item.label} className="flex h-full flex-1 items-end">
            <div
              className={cn(
                'w-full rounded-[7px] transition-all duration-300 hover:opacity-90',
                item.highlight ? highlightClassName : barClassName
              )}
              style={{
                height: `${Math.max((item.value / max) * 100, 5)}%`,
                backgroundImage: item.highlight
                  ? 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 55%, #0ea5c4 100%)'
                  : 'linear-gradient(180deg, #5b83f7 0%, #4069e8 55%, #3358cc 100%)',
              }}
              title={`${item.label}: ${item.value}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-between gap-2.5">
        {data.map((item) => (
          <span
            key={item.label}
            className="flex-1 text-center text-[10.5px] text-muted-dim"
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StackedRiskBars({
  data,
  height = 150,
}: {
  data: { low: number; medium: number; high: number }[];
  height?: number;
}) {
  const totals = data.map((item) => item.low + item.medium + item.high);
  const max = Math.max(...totals, 1);
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-1.5" style={{ height }}>
        {data.map((item, index) => {
          const total = totals[index];
          const barHeight = Math.max((total / max) * 100, 8);
          return (
            <div
              key={index}
              className="flex h-full flex-1 items-end justify-center"
            >
              <div
                className="flex w-full max-w-[16px] flex-col-reverse overflow-hidden rounded-[3px]"
                style={{ height: `${barHeight}%` }}
              >
                {item.low > 0 && (
                  <div
                    className="w-full bg-[#3e63d8]"
                    style={{ flexGrow: item.low }}
                  />
                )}
                {item.medium > 0 && (
                  <div
                    className="w-full bg-[#e5a93a]"
                    style={{ flexGrow: item.medium }}
                  />
                )}
                {item.high > 0 && (
                  <div
                    className="w-full bg-[#ef6a7b]"
                    style={{ flexGrow: item.high }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-dim">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3e63d8]" /> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e5a93a]" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef6a7b]" /> High
        </span>
      </div>
    </div>
  );
}

export function RevenueChart({
  labels,
  revenue,
  expenses,
  estimateFrom = 4,
  className,
}: {
  labels: string[];
  revenue: number[];
  expenses: number[];
  estimateFrom?: number;
  className?: string;
}) {
  const width = 760;
  const height = 280;
  const padX = 10;
  const padY = 14;
  const max = Math.max(...revenue, ...expenses) * 1.08;
  const stepX = (width - padX * 2) / (labels.length - 1);

  const point = (value: number, index: number) => ({
    x: padX + index * stepX,
    y: height - padY - (value / max) * (height - padY * 2),
  });

  const revenuePoints = revenue.map(point);
  const expensePoints = expenses.map(point);

  const toPath = (points: { x: number; y: number }[]) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
      .join(' ');

  const actualPoints = revenuePoints.slice(0, estimateFrom + 1);
  const estimatePoints = revenuePoints.slice(estimateFrom);
  const actualPath = toPath(actualPoints);
  const estimatePath = toPath(estimatePoints);
  const areaPath = `${actualPath} L${actualPoints[actualPoints.length - 1].x},${height - padY} L${actualPoints[0].x},${height - padY} Z`;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-4 flex flex-wrap items-center gap-5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-cyan" /> Revenue (actual)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-cyan/60 [background-image:repeating-linear-gradient(90deg,transparent,transparent_3px,#22d3ee_3px,#22d3ee_6px)]" />{' '}
          Revenue (estimate)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[2px] w-4 rounded-full bg-[#7d8aa5]" /> Expenses
        </span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[230px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Revenue versus expenses chart"
        >
          <defs>
            <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={height * ratio}
              y2={height * ratio}
              stroke="rgba(148,173,214,0.08)"
              strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill="url(#revenue-area)" />
          <path
            d={actualPath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={estimatePath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.4"
            strokeDasharray="6 7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={toPath(expensePoints)}
            fill="none"
            stroke="#7d8aa5"
            strokeWidth="1.6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {revenuePoints.map((p, index) => (
            <circle
              key={index}
              cx={p.x}
              cy={p.y}
              r="2.4"
              fill="#22d3ee"
              opacity={index >= estimateFrom ? 0.7 : 1}
            />
          ))}
        </svg>
        <div className="mt-2 flex justify-between text-[10.5px] text-muted-dim">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DonutChart({
  segments,
  size = 172,
  thickness = 26,
  className,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  let cumulative = 0;
  const stops: string[] = [];
  segments.forEach((segment) => {
    const start = cumulative;
    cumulative += segment.value;
    stops.push(`${segment.color} ${start}% ${cumulative}%`);
  });
  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="h-full w-full rounded-full"
        style={{
          background: `conic-gradient(from -90deg, ${stops.join(', ')})`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
        }}
      />
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && (
            <span className="text-lg font-semibold text-ink">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-muted">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function Progress({
  value,
  max = 100,
  className,
  fillClassName = 'bg-brand',
}: {
  value: number;
  max?: number;
  className?: string;
  fillClassName?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn('progress-track', className)}>
      <div
        className={cn('progress-fill', fillClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

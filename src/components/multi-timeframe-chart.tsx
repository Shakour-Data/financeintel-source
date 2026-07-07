'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { TimeFrameScore } from '@/lib/multi-timeframe';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getBarColor(score: number): string {
  if (score >= 60) return '#4ade80';   // green
  if (score >= 40) return '#facc15';   // yellow
  return '#f87171';                    // red
}

function getBarColorWithAlpha(score: number, alpha: number): string {
  if (score >= 60) return `rgba(74, 222, 128, ${alpha})`;
  if (score >= 40) return `rgba(250, 204, 21, ${alpha})`;
  return `rgba(248, 113, 113, ${alpha})`;
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MultiTimeframeChartProps {
  timeFrames: TimeFrameScore[];
  overallScore?: number;
  height?: number;
  showOverallLine?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════

function CustomTooltip({ active, payload, overallScore }: {
  active?: boolean;
  payload?: Array<{ payload: { timeFrame: string; score: number; trend: string; momentum: number; volatility: string } }>;
  overallScore?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-sm mb-1">{data.timeFrame} Timeframe</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">Score:</span>
        <span className="font-bold" style={{ color: getBarColor(data.score) }}>
          {data.score.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">Trend:</span>
        <span className={
          data.trend.includes('bull') ? 'text-emerald-400' :
          data.trend.includes('bear') ? 'text-red-400' : 'text-yellow-400'
        }>
          {data.trend.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">Momentum:</span>
        <span className={data.momentum >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {data.momentum >= 0 ? '+' : ''}{data.momentum.toFixed(3)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Volatility:</span>
        <span className="text-foreground capitalize">{data.volatility}</span>
      </div>
      {overallScore !== undefined && (
        <div className="mt-1.5 pt-1.5 border-t border-border">
          <span className="text-muted-foreground">Weighted Overall:</span>
          <span className="font-bold ml-1" style={{ color: getBarColor(overallScore) }}>
            {overallScore.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN CHART COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MultiTimeframeChart({
  timeFrames,
  overallScore,
  height = 300,
  showOverallLine = true,
  className,
}: MultiTimeframeChartProps) {
  const chartData = timeFrames.map((tf) => ({
    timeFrame: tf.timeFrame,
    score: tf.aiScore,
    trend: tf.trend,
    momentum: tf.momentum,
    volatility: tf.volatility,
    weight: tf.weight,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(120,120,120,0.2)"
            opacity={0.3}
          />
          <XAxis
            dataKey="timeFrame"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={{ stroke: 'rgba(120,120,120,0.2)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={{ stroke: 'rgba(120,120,120,0.2)' }}
            tickLine={false}
            ticks={[0, 20, 40, 60, 80, 100]}
          />
          <Tooltip
            content={<CustomTooltip overallScore={overallScore} />}
            cursor={{ fill: 'rgba(120,120,120,0.1)', opacity: 0.3 }}
          />
          {/* Reference zones */}
          <ReferenceLine y={60} stroke="#4ade8040" strokeDasharray="3 3" />
          <ReferenceLine y={40} stroke="#f8717140" strokeDasharray="3 3" />
          {/* Overall score line */}
          {showOverallLine && overallScore !== undefined && (
            <ReferenceLine
              y={overallScore}
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="8 4"
              label={{
                value: `Overall: ${overallScore.toFixed(1)}`,
                position: 'right',
                fill: '#a855f7',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />
          )}
          <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColorWithAlpha(entry.score, 0.8)}
                stroke={getBarColor(entry.score)}
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          Bullish (60+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />
          Neutral (40-60)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400" />
          Bearish (&lt;40)
        </span>
        {showOverallLine && overallScore !== undefined && (
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-purple-400" style={{ borderTop: '2px dashed #a855f7' }} />
            Weighted Overall
          </span>
        )}
      </div>
    </div>
  );
}

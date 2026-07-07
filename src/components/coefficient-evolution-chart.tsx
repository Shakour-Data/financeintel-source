'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoeffDataPoint {
  date: string;
  coefficient: number;
  previousCoefficient?: number;
  coefficientChange: number;
  predictionError?: number;
  optimizationDelta?: number;
  version: number;
}

interface CoefficientEvolutionChartProps {
  nodeKey: string;
  days?: number;
  color?: string;
  className?: string;
  height?: number;
  title?: string;
}

const PERIOD_OPTIONS = [
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
  { label: '3y', value: 1095 },
];

export function CoefficientEvolutionChart({
  nodeKey,
  days: initialDays = 90,
  color = '#22c55e',
  className,
  height = 280,
  title,
}: CoefficientEvolutionChartProps) {
  const [data, setData] = useState<CoeffDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(initialDays);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market/indicators/coefficients?nodeKey=${encodeURIComponent(nodeKey)}&days=${period}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data ?? json.history ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [nodeKey, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    fullDate: d.date,
    coefficient: Math.round(d.coefficient * 10000) / 100, // as percentage
    change: Math.round(d.coefficientChange * 10000) / 100,
    predictionError: d.predictionError !== null && d.predictionError !== undefined
      ? Math.round(d.predictionError * 1000) / 1000
      : undefined,
    version: d.version,
  }));

  // Find significant coefficient changes
  const significantChanges = chartData.filter(d => Math.abs(d.change) > 0.5);

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">
            {title ?? `${nodeKey.split('.').pop()} Coefficient Evolution`}
          </span>
          <span className="text-[10px] text-muted-foreground">ML Learning Process</span>
        </div>
        <div className="flex items-center gap-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                period === opt.value
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-2" style={{ height }}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`coeff-gradient-${nodeKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                tickCount={6}
              />
              <YAxis
                yAxisId="coeff"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={40}
                tickFormatter={(v: number) => `${v}%`}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="error"
                orientation="right"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={35}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => v.toFixed(2)}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                labelFormatter={(_label: string, payload: Array<{ payload?: { fullDate?: string } }>) => {
                  if (payload && payload[0]?.payload?.fullDate) {
                    return payload[0].payload.fullDate;
                  }
                  return _label;
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'coefficient') return [`${value}%`, 'Coefficient'];
                  if (name === 'predictionError') return [value.toFixed(3), 'Pred. Error'];
                  return [value, name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '10px' }}
                formatter={(value: string) => {
                  if (value === 'coefficient') return 'Coefficient';
                  if (value === 'predictionError') return 'Prediction Error';
                  return value;
                }}
              />

              {/* Initial coefficient reference line */}
              <ReferenceLine
                yAxisId="coeff"
                y={25}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={0.5}
                label={{ value: 'Initial', position: 'insideTopRight', fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              />

              <Line
                yAxisId="coeff"
                type="monotone"
                dataKey="coefficient"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: color }}
                name="coefficient"
              />
              <Line
                yAxisId="error"
                type="monotone"
                dataKey="predictionError"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 2, fill: '#ef4444' }}
                name="predictionError"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        {!loading && chartData.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            No coefficient evolution data available
          </div>
        )}
      </div>

      {/* Footer stats */}
      {!loading && data.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t text-[10px] text-muted-foreground">
          <span>
            Total changes: {data.length} | Significant: {significantChanges.length}
          </span>
          <span>
            Latest: {data[data.length - 1]?.coefficient !== undefined
              ? `${(data[data.length - 1].coefficient * 100).toFixed(2)}%`
              : 'N/A'}
          </span>
        </div>
      )}
    </div>
  );
}

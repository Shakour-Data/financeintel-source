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
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendDataPoint {
  date: string;
  score: number;
  coefficient?: number;
}

interface TrendChartProps {
  coinId: string;
  nodeKey: string;
  days?: number;
  title?: string;
  color?: string;
  className?: string;
  height?: number;
  showCoefficient?: boolean;
}

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
  { label: '3y', value: 1095 },
];

export function TrendChart({
  coinId,
  nodeKey,
  days: initialDays = 30,
  title,
  color = '#22c55e',
  className,
  height = 220,
  showCoefficient = true,
}: TrendChartProps) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/scores/history?coinId=${encodeURIComponent(coinId)}&nodeKey=${encodeURIComponent(nodeKey)}&days=${period}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      setError('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  }, [coinId, nodeKey, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    fullDate: d.date,
    score: d.score,
    ...(showCoefficient && d.coefficient !== undefined
      ? { coefficient: Math.round(d.coefficient * 1000) / 10 } // Show as percentage
      : {}),
  }));

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{title ?? nodeKey.split('.').pop()}</span>
          <span className="text-[10px] text-muted-foreground">Score Trend</span>
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
        {error && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            {error}
          </div>
        )}
        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                tickCount={6}
              />
              <YAxis
                yAxisId="score"
                domain={[0, 10]}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={25}
              />
              {showCoefficient && (
                <YAxis
                  yAxisId="coeff"
                  orientation="right"
                  domain={[0, 50]}
                  tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  width={30}
                  tickFormatter={(v: number) => `${v}%`}
                />
              )}
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
              />
              <Legend
                wrapperStyle={{ fontSize: '10px' }}
                formatter={(value: string) => (value === 'score' ? 'Score' : 'Coeff %')}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="score"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                name="score"
              />
              {showCoefficient && (
                <Line
                  yAxisId="coeff"
                  type="monotone"
                  dataKey="coefficient"
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  opacity={0.6}
                  name="coefficient"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        {!loading && !error && chartData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-1">
            <span>Insufficient historical data</span>
            <span className="text-[10px] opacity-70">Data will appear as scores accumulate</span>
          </div>
        )}
      </div>
    </div>
  );
}

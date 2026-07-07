'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoeffDataPoint {
  date: string;
  coefficient: number;
  coefficientChange: number;
  predictionError?: number;
}

interface CoefficientChartProps {
  nodeKey: string;
  days?: number;
  color?: string;
  className?: string;
  height?: number;
  title?: string;
}

export function CoefficientChart({
  nodeKey,
  days: initialDays = 30,
  color = '#22c55e',
  className,
  height = 180,
  title,
}: CoefficientChartProps) {
  const [data, setData] = useState<CoeffDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(initialDays);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/scores/coefficients?nodeKey=${encodeURIComponent(nodeKey)}&days=${period}`
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json.data ?? []);
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
    date: d.date.slice(5),
    fullDate: d.date,
    coefficient: Math.round(d.coefficient * 10000) / 100, // as percentage with 2 decimal
    change: Math.round(d.coefficientChange * 10000) / 100,
  }));

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold">
          {title ?? `${nodeKey.split('.').pop()} Coefficient`}
        </span>
        <div className="flex items-center gap-0.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                period === d
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="p-2" style={{ height }}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${nodeKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={35}
                tickFormatter={(v: number) => `${v}%`}
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
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'coefficient' ? 'Coeff' : 'Change',
                ]}
              />
              <Area
                type="monotone"
                dataKey="coefficient"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${nodeKey})`}
                name="coefficient"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {!loading && chartData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-1">
            <span>Insufficient historical data</span>
            <span className="text-[10px] opacity-70">Data will appear as coefficients evolve</span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TrendDataPoint {
  date: string;
  timestamp?: number;
  score: number;
  coefficient: number;
  volatility?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface HierarchyTrendsChartOptimizedProps {
  title: string;
  subtitle?: string;
  data: TrendDataPoint[];
  level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect';
  color?: string;
  height?: number;
  showCoefficient?: boolean;
  onDateRangeChange?: (days: number) => void;
  loading?: boolean;
}

const LEVEL_COLORS = {
  'dimension': '#ef4444',
  'sub-dimension': '#3b82f6',
  'aspect': '#22c55e',
  'sub-aspect': '#f59e0b',
};

// Custom memoized tooltip to prevent re-renders
const CustomTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{payload[0].payload.date}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

export const HierarchyTrendsChartOptimized: React.FC<HierarchyTrendsChartOptimizedProps> = ({
  title,
  subtitle,
  data,
  level,
  color,
  height = 400,
  showCoefficient = true,
  onDateRangeChange,
  loading = false,
}) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('90d');

  const displayColor = color || LEVEL_COLORS[level] || '#8b5cf6';

  // Memoize statistics calculation
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        current: '0.00',
        change: '0.00',
        percentChange: 0,
        min: '0.00',
        max: '0.00',
        average: '0.00',
        trend: 'stable' as const,
      };
    }

    const scores = data.map((d) => d.score);
    const current = scores[scores.length - 1];
    const previous = scores[0];
    const change = current - previous;
    const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    const trend =
      percentChange > 0.5 ? ('up' as const) : percentChange < -0.5 ? ('down' as const) : ('stable' as const);

    return {
      current: current.toFixed(2),
      change: change.toFixed(2),
      percentChange: parseFloat(percentChange.toFixed(2)),
      min: min.toFixed(2),
      max: max.toFixed(2),
      average: average.toFixed(2),
      trend,
    };
  }, [data]);

  const handleDateRangeChange = useCallback(
    (days: number) => {
      const range =
        days === 7 ? ('7d' as const) : days === 30 ? ('30d' as const) : days === 90 ? ('90d' as const) : days === 365 ? ('1y' as const) : ('all' as const);
      setDateRange(range);
      onDateRangeChange?.(days);
    },
    [onDateRangeChange]
  );

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading trend data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                {title}
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: displayColor + '20',
                    borderColor: displayColor,
                    color: displayColor,
                  }}
                >
                  {level}
                </Badge>
              </CardTitle>
              {subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatBox label="Current" value={stats.current} />
            <StatBox
              label="Change"
              value={`${stats.change} (${stats.percentChange}%)`}
              highlight={stats.trend}
            />
            <StatBox label="Min / Max" value={`${stats.min} / ${stats.max}`} />
            <StatBox label="Average" value={stats.average} />
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1 flex-wrap">
              {[
                { label: '7D', days: 7 },
                { label: '30D', days: 30 },
                { label: '90D', days: 90 },
                { label: '1Y', days: 365 },
              ].map(({ label, days }) => (
                <Button
                  key={days}
                  variant={dateRange === (label === '7D' ? '7d' : label === '30D' ? '30d' : label === '90D' ? '90d' : '1y') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateRangeChange(days)}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="flex gap-1">
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                Area
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="currentColor"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              stroke="currentColor"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'currentColor' }}
              domain={[0, 10]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {chartType === 'area' ? (
              <>
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke={displayColor}
                  fill={displayColor}
                  fillOpacity={0.3}
                  name="Score"
                  dot={false}
                  isAnimationActive={false}
                />
                {showCoefficient && (
                  <Area
                    type="monotone"
                    dataKey="coefficient"
                    stroke="#a78bfa"
                    fill="#a78bfa"
                    fillOpacity={0.15}
                    name="Coefficient"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={displayColor}
                  strokeWidth={2}
                  name="Score"
                  dot={false}
                  isAnimationActive={false}
                />
                {showCoefficient && (
                  <Line
                    type="monotone"
                    dataKey="coefficient"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    name="Coefficient"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>

        {/* Recent Data Points */}
        {data.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap justify-center">
            {data
              .slice(-4)
              .map((point, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {point.date}: {point.score.toFixed(2)}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Stat box sub-component
interface StatBoxProps {
  label: string;
  value: string;
  highlight?: 'up' | 'down' | 'stable';
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, highlight }) => {
  const colorClass =
    highlight === 'up'
      ? 'text-green-600 dark:text-green-400'
      : highlight === 'down'
        ? 'text-red-600 dark:text-red-400'
        : '';

  return (
    <div className="bg-muted p-3 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
    </div>
  );
};

export default HierarchyTrendsChartOptimized;

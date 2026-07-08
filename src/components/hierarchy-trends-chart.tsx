'use client';

import React, { useMemo, useState } from 'react';
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
  ComposedChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TrendDataPoint {
  date: string;
  timestamp: number;
  score: number;
  coefficient: number;
  volatility?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface HierarchyTrendsChartProps {
  title: string;
  subtitle?: string;
  data: TrendDataPoint[];
  level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect';
  color?: string;
  height?: number;
  showCoefficient?: boolean;
  showVolatility?: boolean;
  onDateRangeChange?: (days: number) => void;
  loading?: boolean;
}

const LEVEL_COLORS = {
  'dimension': '#ef4444',
  'sub-dimension': '#3b82f6',
  'aspect': '#22c55e',
  'sub-aspect': '#f59e0b',
};

const DEFAULT_COLOR = '#8b5cf6';

export const HierarchyTrendsChart: React.FC<HierarchyTrendsChartProps> = ({
  title,
  subtitle,
  data,
  level,
  color,
  height = 400,
  showCoefficient = true,
  showVolatility = false,
  onDateRangeChange,
  loading = false,
}) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('90d');

  const displayColor = color || LEVEL_COLORS[level] || DEFAULT_COLOR;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        current: 0,
        previous: 0,
        change: 0,
        percentChange: 0,
        min: 0,
        max: 0,
        average: 0,
      };
    }

    const scores = data.map((d) => d.score);
    const current = scores[scores.length - 1];
    const previous = scores[0];
    const change = current - previous;
    const percentChange = previous !== 0 ? ((change / previous) * 100).toFixed(2) : '0';
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const average = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);

    return {
      current: current.toFixed(2),
      previous: previous.toFixed(2),
      change: change.toFixed(2),
      percentChange: parseFloat(percentChange as string),
      min: min.toFixed(2),
      max: max.toFixed(2),
      average,
    };
  }, [data]);

  const handleDateRangeChange = (days: number) => {
    setDateRange(
      days === 7
        ? '7d'
        : days === 30
          ? '30d'
          : days === 90
            ? '90d'
            : days === 365
              ? '1y'
              : 'all'
    );
    onDateRangeChange?.(days);
  };

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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
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
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
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
              {subtitle && <CardDescription>{subtitle}</CardDescription>}
            </div>
          </div>

          {/* Statistics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-bold">{stats.current}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Change</p>
              <p
                className={`text-lg font-bold ${
                  parseFloat(stats.change as string) > 0
                    ? 'text-green-600'
                    : parseFloat(stats.change as string) < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                }`}
              >
                {stats.change} ({stats.percentChange}%)
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Min / Max</p>
              <p className="text-lg font-bold">
                {stats.min} / {stats.max}
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-lg font-bold">{stats.average}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={dateRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange(7)}
              >
                7D
              </Button>
              <Button
                variant={dateRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange(30)}
              >
                30D
              </Button>
              <Button
                variant={dateRange === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange(90)}
              >
                90D
              </Button>
              <Button
                variant={dateRange === '1y' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange(365)}
              >
                1Y
              </Button>
              <Button
                variant={dateRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange(9999)}
              >
                ALL
              </Button>
            </div>

            <div className="flex gap-2">
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
            <CartesianGrid strokeDasharray="3 3" />
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
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: `2px solid ${displayColor}`,
                borderRadius: '8px',
                padding: '8px',
              }}
              formatter={(value: any) => {
                if (typeof value === 'number') {
                  return [value.toFixed(2), value];
                }
                return value;
              }}
            />
            <Legend />

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
                  isAnimationActive={true}
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
                    isAnimationActive={true}
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
                  isAnimationActive={true}
                />
                {showCoefficient && (
                  <Line
                    type="monotone"
                    dataKey="coefficient"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    name="Coefficient"
                    dot={false}
                    isAnimationActive={true}
                  />
                )}
              </>
            )}
          </ChartComponent>
        </ResponsiveContainer>

        {/* Optional Trend Badges */}
        {data.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {data
              .slice(-5)
              .map((point, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-xs"
                >
                  {point.date}: {point.score.toFixed(2)}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HierarchyTrendsChart;

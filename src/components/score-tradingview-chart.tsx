'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TimeSeriesPoint {
  time: string; // YYYY-MM-DD
  value: number;
}

interface IndicatorSeries {
  key: string;
  name: string;
  color: string;
  data: TimeSeriesPoint[];
  lineType?: 'solid' | 'dashed';
  lineWidth?: number;
}

interface ScoreTradingViewChartProps {
  title: string;
  series: IndicatorSeries[];
  height?: number;
  showMA?: boolean;
  maPeriod?: number;
}

type TimeFrame = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function calculateMA(data: TimeSeriesPoint[], period: number): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].value;
    }
    result.push({
      time: data[i].time,
      value: Math.round((sum / period) * 1000) / 1000,
    });
  }
  return result;
}

function filterByTimeframe(data: TimeSeriesPoint[], tf: TimeFrame): TimeSeriesPoint[] {
  if (tf === 'ALL') return data;
  const now = new Date();
  let startDate: Date;
  switch (tf) {
    case '1W': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '1M': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case '3M': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    case '6M': startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
    case '1Y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
    default: return data;
  }
  const startStr = startDate.toISOString().split('T')[0];
  return data.filter(d => d.time >= startStr);
}

// ═══════════════════════════════════════════════════════════════
// CANVAS CHART (TradingView-style)
// ═══════════════════════════════════════════════════════════════

function TradingViewCanvas({
  series,
  height,
  showMA,
  maPeriod,
  timeframe,
}: {
  series: IndicatorSeries[];
  height: number;
  showMA: boolean;
  maPeriod: number;
  timeframe: TimeFrame;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    values: Array<{ name: string; value: number; color: string }>;
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [height]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    const w = dimensions.width;
    const h = dimensions.height;
    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#0c0f14';
    ctx.fillRect(0, 0, w, h);

    // Filter data by timeframe
    const filteredSeries = series.map(s => ({
      ...s,
      data: filterByTimeframe(s.data, timeframe),
    }));

    // Find global min/max
    let globalMin = Infinity;
    let globalMax = -Infinity;
    for (const s of filteredSeries) {
      for (const p of s.data) {
        if (p.value < globalMin) globalMin = p.value;
        if (p.value > globalMax) globalMax = p.value;
      }
      // Include MA range
      if (showMA && s.data.length >= maPeriod) {
        const maData = calculateMA(s.data, maPeriod);
        for (const p of maData) {
          if (p.value < globalMin) globalMin = p.value;
          if (p.value > globalMax) globalMax = p.value;
        }
      }
    }

    if (globalMin === Infinity || globalMax === -Infinity) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No data', w / 2, h / 2);
      return;
    }

    const range = globalMax - globalMin || 1;
    globalMin -= range * 0.1;
    globalMax += range * 0.1;
    const totalRange = globalMax - globalMin;

    // Helper functions
    const toX = (index: number, total: number) =>
      padding.left + (index / Math.max(total - 1, 1)) * chartW;
    const toY = (value: number) =>
      padding.top + (1 - (value - globalMin) / totalRange) * chartH;

    // Draw grid
    ctx.strokeStyle = '#1a1e2a';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis label
      const val = globalMax - (i / gridLines) * totalRange;
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(val.toFixed(2), w - padding.right + 5, y + 3);
    }

    // Draw time axis labels
    if (filteredSeries.length > 0 && filteredSeries[0].data.length > 0) {
      const dataLen = filteredSeries[0].data.length;
      const labelCount = Math.min(6, dataLen);
      for (let i = 0; i < labelCount; i++) {
        const idx = Math.floor((i / (labelCount - 1)) * (dataLen - 1));
        const x = toX(idx, dataLen);
        const dateStr = filteredSeries[0].data[idx].time;
        ctx.fillStyle = '#4b5563';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dateStr.slice(5), x, h - 8);
      }
    }

    // Draw series
    for (const s of filteredSeries) {
      if (s.data.length < 2) continue;

      // Main line
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth ?? 2;
      ctx.setLineDash(s.lineType === 'dashed' ? [4, 4] : []);
      ctx.beginPath();
      for (let i = 0; i < s.data.length; i++) {
        const x = toX(i, s.data.length);
        const y = toY(s.data[i].value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Moving average
      if (showMA && s.data.length >= maPeriod) {
        const maData = calculateMA(s.data, maPeriod);
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        for (let i = 0; i < maData.length; i++) {
          // MA data starts at index maPeriod-1 of original data
          const x = toX(i + maPeriod - 1, s.data.length);
          const y = toY(maData[i].value);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Current value indicator
      if (s.data.length > 0) {
        const lastPoint = s.data[s.data.length - 1];
        const x = toX(s.data.length - 1, s.data.length);
        const y = toY(lastPoint.value);

        // Dot
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Value label on right
        ctx.fillStyle = s.color;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(lastPoint.value.toFixed(2), w - padding.right + 5, y + 3);
      }
    }

    // Draw crosshair and tooltip on hover
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (
        mouseX < padding.left ||
        mouseX > w - padding.right ||
        mouseY < padding.top ||
        mouseY > h - padding.bottom
      ) {
        setTooltip(null);
        return;
      }

      // Find closest data index
      const dataLen = filteredSeries[0]?.data.length ?? 0;
      if (dataLen === 0) {
        setTooltip(null);
        return;
      }
      const idx = Math.round(
        ((mouseX - padding.left) / chartW) * (dataLen - 1)
      );
      const clampedIdx = Math.max(0, Math.min(dataLen - 1, idx));

      const values = filteredSeries
        .filter(s => s.data.length > clampedIdx)
        .map(s => ({
          name: s.name,
          value: s.data[clampedIdx].value,
          color: s.color,
        }));

      setTooltip({
        x: mouseX,
        y: mouseY,
        date: filteredSeries[0]?.data[clampedIdx]?.time ?? '',
        values,
      });
    };

    const handleMouseLeave = () => setTooltip(null);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [series, dimensions, showMA, maPeriod, timeframe]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full rounded" />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-md border border-border/50 bg-card/95 shadow-lg px-2.5 py-1.5 text-xs"
          style={{
            left: Math.min(tooltip.x + 10, dimensions.width - 160),
            top: Math.max(tooltip.y - 10, 5),
          }}
        >
          <div className="text-muted-foreground mb-1 font-mono text-[10px]">
            {tooltip.date}
          </div>
          {tooltip.values.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="w-2 h-0.5 rounded-full shrink-0"
                style={{ backgroundColor: v.color }}
              />
              <span className="text-muted-foreground">{v.name}:</span>
              <span className="font-mono font-medium" style={{ color: v.color }}>
                {v.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ScoreTradingViewChart({
  title,
  series,
  height = 300,
  showMA: initialShowMA = true,
  maPeriod: initialMAPeriod = 7,
}: ScoreTradingViewChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>('1M');
  const [showMA, setShowMA] = useState(initialShowMA);
  const [maPeriod, setMaPeriod] = useState(initialMAPeriod);
  const [selectedIndicators, setSelectedIndicators] = useState<Set<string>>(
    new Set(series.map(s => s.key))
  );

  const toggleIndicator = useCallback((key: string) => {
    setSelectedIndicators(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const visibleSeries = series.filter(s => selectedIndicators.has(s.key));

  const timeframes: TimeFrame[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Chart Header - TradingView style */}
      <div className="bg-[#0c0f14] border-b border-[#1a1e2a] px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{title}</span>
            <span className="text-[10px] text-gray-500">|</span>
            <span className="text-[10px] text-gray-400">AI Score Indicators</span>
          </div>
          <div className="flex items-center gap-1">
            {/* MA Toggle */}
            <button
              onClick={() => setShowMA(!showMA)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                showMA
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              MA({maPeriod})
            </button>
            {/* MA Period selector */}
            <select
              value={maPeriod}
              onChange={e => setMaPeriod(Number(e.target.value))}
              className="bg-[#1a1e2a] text-gray-400 text-[10px] border border-[#2a2e3a] rounded px-1 py-0.5"
            >
              <option value={3}>3</option>
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>

        {/* Timeframe buttons */}
        <div className="flex items-center gap-0.5 mt-1.5">
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                timeframe === tf
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1e2a]'
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator toggles */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {series.map(s => (
            <button
              key={s.key}
              onClick={() => toggleIndicator(s.key)}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded transition-colors',
                selectedIndicators.has(s.key)
                  ? 'bg-opacity-20'
                  : 'opacity-40'
              )}
              style={{
                backgroundColor: selectedIndicators.has(s.key)
                  ? `${s.color}20`
                  : 'transparent',
                color: s.color,
                border: `1px solid ${selectedIndicators.has(s.key) ? s.color + '40' : 'transparent'}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <TradingViewCanvas
        series={visibleSeries}
        height={height}
        showMA={showMA}
        maPeriod={maPeriod}
        timeframe={timeframe}
      />

      {/* Legend */}
      {showMA && (
        <div className="bg-[#0c0f14] border-t border-[#1a1e2a] px-3 py-1.5 flex items-center gap-3">
          <span className="text-[9px] text-gray-500">Legend:</span>
          <span className="text-[9px] text-gray-400">
            — Score &nbsp;
            <span className="text-gray-600">- - MA({maPeriod})</span>
          </span>
        </div>
      )}
    </div>
  );
}

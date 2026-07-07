'use client';

import { cn } from '@/lib/utils';
import type { TimeFrameScore } from '@/lib/multi-timeframe';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getSignalColor(signal: string): { bg: string; text: string; border: string; dot: string } {
  if (signal === 'strong_bull' || signal === 'bull') {
    return {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
    };
  }
  if (signal === 'strong_bear' || signal === 'bear') {
    return {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/30',
      dot: 'bg-red-400',
    };
  }
  return {
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-400',
  };
}

function getTrendArrow(trend: string): string {
  switch (trend) {
    case 'strong_bull': return '▲▲';
    case 'bull': return '▲';
    case 'neutral': return '◆';
    case 'bear': return '▼';
    case 'strong_bear': return '▼▼';
    default: return '◆';
  }
}

function getSignalLabel(signal: string): string {
  switch (signal) {
    case 'strong_bull': return 'Strong Bull';
    case 'bull': return 'Bull';
    case 'neutral': return 'Neutral';
    case 'bear': return 'Bear';
    case 'strong_bear': return 'Strong Bear';
    default: return 'Neutral';
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface TimeframeSignalBadgeProps {
  timeFrame: string;
  trend: string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showLabel?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL DOT (for table rows - minimal)
// ═══════════════════════════════════════════════════════════════

interface SignalDotProps {
  trend: string;
  size?: number;
  className?: string;
}

export function SignalDot({ trend, size = 10, className }: SignalDotProps) {
  const colors = getSignalColor(trend);
  return (
    <span
      className={cn('rounded-full inline-block shrink-0', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: trend === 'neutral' ? '#facc15' : trend.includes('bull') ? '#4ade80' : '#f87171',
        boxShadow: `0 0 ${size / 2}px ${trend === 'neutral' ? 'rgba(250,204,21,0.4)' : trend.includes('bull') ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export function TimeframeSignalBadge({
  timeFrame,
  trend,
  score,
  size = 'md',
  showScore = false,
  showLabel = false,
  className,
}: TimeframeSignalBadgeProps) {
  const colors = getSignalColor(trend);
  const arrow = getTrendArrow(trend);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const dotSize = {
    sm: 6,
    md: 8,
    lg: 10,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border font-medium whitespace-nowrap',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          width: dotSize[size],
          height: dotSize[size],
          backgroundColor: trend === 'neutral' ? '#facc15' : trend.includes('bull') ? '#4ade80' : '#f87171',
        }}
      />
      <span className="font-semibold">{timeFrame}</span>
      <span className="opacity-80">{arrow}</span>
      {showScore && score !== undefined && (
        <span className="font-mono font-bold">{score.toFixed(1)}</span>
      )}
      {showLabel && (
        <span className="opacity-70">{getSignalLabel(trend)}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIMEFRAME SELECTOR BAR (for detail panel)
// ═══════════════════════════════════════════════════════════════

interface TimeframeSelectorBarProps {
  timeFrames: TimeFrameScore[];
  selectedTf: string;
  onSelect: (tf: string) => void;
  className?: string;
}

export function TimeframeSelectorBar({
  timeFrames,
  selectedTf,
  onSelect,
  className,
}: TimeframeSelectorBarProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto pb-1', className)}>
      {timeFrames.map((tf) => {
        const colors = getSignalColor(tf.trend);
        const isSelected = tf.timeFrame === selectedTf;
        return (
          <button
            key={tf.timeFrame}
            onClick={() => onSelect(tf.timeFrame)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap',
              isSelected
                ? cn(colors.bg, colors.text, colors.border, 'ring-1 ring-current/20')
                : 'border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <SignalDot trend={tf.trend} size={6} />
            <span>{tf.timeFrame}</span>
            <span className="font-mono text-xs">{tf.aiScore.toFixed(1)}</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONSENSUS BADGES
// ═══════════════════════════════════════════════════════════════

interface ConsensusDisplayProps {
  bullCount: number;
  bearCount: number;
  neutralCount: number;
  alignment: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConsensusDisplay({
  bullCount,
  bearCount,
  neutralCount,
  alignment,
  size = 'md',
  className,
}: ConsensusDisplayProps) {
  const total = bullCount + bearCount + neutralCount;
  const bullPct = total > 0 ? (bullCount / total) * 100 : 0;
  const bearPct = total > 0 ? (bearCount / total) * 100 : 0;
  const neutralPct = total > 0 ? (neutralCount / total) * 100 : 0;

  const alignmentLabel = alignment?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ?? 'Mixed';
  const alignmentColor = alignment?.includes('bull')
    ? 'text-emerald-400'
    : alignment?.includes('bear')
      ? 'text-red-400'
      : 'text-yellow-400';

  const sizeClasses = {
    sm: 'text-[10px] gap-2',
    md: 'text-xs gap-3',
    lg: 'text-sm gap-4',
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Stacked bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
        {bullPct > 0 && (
          <div
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${bullPct}%` }}
          />
        )}
        {neutralPct > 0 && (
          <div
            className="h-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${neutralPct}%` }}
          />
        )}
        {bearPct > 0 && (
          <div
            className="h-full bg-red-400 transition-all duration-500"
            style={{ width: `${bearPct}%` }}
          />
        )}
      </div>

      {/* Counts */}
      <div className={cn('flex items-center', sizeClasses[size])}>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Bull: {bullCount}
        </span>
        <span className="flex items-center gap-1 text-yellow-400">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Neutral: {neutralCount}
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Bear: {bearCount}
        </span>
      </div>

      {/* Alignment label */}
      <span className={cn('font-semibold', alignmentColor, sizeClasses[size])}>
        {alignmentLabel}
      </span>
    </div>
  );
}

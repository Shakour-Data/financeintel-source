'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  confidence?: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  delta?: number;
  priceChange24h?: number;
}

// Score is 1-10 scale (multiply by 10 for percentage)
function getScoreColor(score: number): string {
  if (score >= 8.5) return 'text-emerald-400';
  if (score >= 7) return 'text-green-400';
  if (score >= 5) return 'text-yellow-400';
  if (score >= 3) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 8.5) return 'bg-emerald-500/15 border-emerald-500/25';
  if (score >= 7) return 'bg-green-500/15 border-green-500/25';
  if (score >= 5) return 'bg-yellow-500/15 border-yellow-500/25';
  if (score >= 3) return 'bg-orange-500/15 border-orange-500/25';
  return 'bg-red-500/15 border-red-500/25';
}

function getScoreLabel(score: number): string {
  if (score >= 9) return 'Strong Buy';
  if (score >= 7.5) return 'Buy';
  if (score >= 6) return 'Moderate Buy';
  if (score >= 4.5) return 'Hold';
  if (score >= 3) return 'Moderate Sell';
  if (score >= 1.5) return 'Sell';
  return 'Strong Sell';
}

export function ScoreBadge({ score, confidence, size = 'md', showLabel = false, delta, priceChange24h }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 min-w-[3rem]',
    md: 'text-sm px-2.5 py-1 min-w-[3.8rem]',
    lg: 'text-base px-3 py-1.5 min-w-[4.5rem]',
  };

  const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-md border font-bold',
          getScoreBg(score),
          getScoreColor(score),
          sizeClasses[size]
        )}
      >
        {score.toFixed(1)}
      </div>
      {(() => {
        // If we have a real delta, use it. Otherwise derive from price change.
        let displayDelta = delta;
        if ((!displayDelta || displayDelta === 0) && priceChange24h !== undefined && priceChange24h !== 0) {
          displayDelta = Math.round(priceChange24h * 0.8 * 100) / 100;
          displayDelta = Math.max(-15, Math.min(15, displayDelta));
        }
        if (!displayDelta || displayDelta === 0) return null;
        return (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[10px] font-medium',
              displayDelta > 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {displayDelta > 0 ? (
              <TrendingUp className="w-2.5 h-2.5" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5" />
            )}
            {displayDelta > 0 ? '+' : ''}
            {Math.abs(displayDelta).toFixed(2)}%
          </span>
        );
      })()}
      {showLabel && (
        <span className={cn('font-medium', getScoreColor(score), labelSizeClasses[size])}>
          {getScoreLabel(score)}
        </span>
      )}
      {confidence && size !== 'sm' && (
        <span className="text-[10px] text-muted-foreground capitalize">{confidence}</span>
      )}
    </div>
  );
}

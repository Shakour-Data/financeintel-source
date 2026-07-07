'use client';

/**
 * LivePriceIndicator — shows whether the real-time price feed WebSocket
 * is connected, and displays the last update time.
 *
 * Shows a green pulsing dot when connected, a red dot when disconnected.
 */

import { usePriceFeed } from '@/hooks/use-price-feed';
import { Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LivePriceIndicator() {
  const { connected, lastTick, prices } = usePriceFeed();

  const formattedTime = lastTick
    ? new Date(lastTick).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
        connected
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          : 'bg-muted border-border text-muted-foreground'
      )}
      title={
        connected
          ? `Real-time price feed connected — ${prices.size} coins tracked. Last update: ${formattedTime ?? 'never'}`
          : 'Real-time price feed disconnected — showing cached data'
      }
    >
      <Radio className={cn('w-3.5 h-3.5', connected && 'animate-pulse')} />
      <span>{connected ? 'Live' : 'Offline'}</span>
      {connected && prices.size > 0 && (
        <span className="text-[9px] opacity-70 ml-0.5">
          {prices.size}
        </span>
      )}
      {connected && formattedTime && (
        <span className="text-[9px] opacity-70 ml-1 tabular-nums">
          {formattedTime}
        </span>
      )}
    </div>
  );
}

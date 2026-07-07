'use client';

import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MarketBreadthBarProps {
  bullCoins: number;
  neutralCoins: number;
  bearCoins: number;
  total: number;
  className?: string;
}

export function MarketBreadthBar({
  bullCoins,
  neutralCoins,
  bearCoins,
  total,
  className,
}: MarketBreadthBarProps) {
  if (total === 0) {
    // Show empty bar instead of returning null
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-medium">Bull {bullCoins}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-yellow-400 font-medium">Neutral {neutralCoins}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-400 font-medium">Bear {bearCoins}</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground">No data</span>
        </div>
        <div className="h-8 rounded-lg bg-muted/20 border" />
      </div>
    );
  }

  const bullPct = (bullCoins / total) * 100;
  const neutralPct = (neutralCoins / total) * 100;
  const bearPct = (bearCoins / total) * 100;
  const breadth = ((bullCoins - bearCoins) / total) * 100;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('space-y-2', className)}>
        {/* Labels */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-medium">Bull {bullCoins}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-yellow-400 font-medium">Neutral {neutralCoins}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-400 font-medium">Bear {bearCoins}</span>
            </span>
          </div>
          <span className={cn(
            'font-bold text-sm',
            breadth > 20 ? 'text-emerald-400' : breadth > 0 ? 'text-yellow-400' : 'text-red-400'
          )}>
            Breadth: {breadth > 0 ? '+' : ''}{breadth.toFixed(0)}%
          </span>
        </div>

        {/* Stacked bar */}
        <TooltipProvider>
          <div className="relative h-8 rounded-lg overflow-hidden bg-muted/20 border">
            <div className="flex h-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className="h-full bg-emerald-500/70 flex items-center justify-center"
                    initial={{ width: 0 }}
                    animate={{ width: `${bullPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  >
                    {bullPct > 8 && (
                      <span className="text-[10px] font-bold text-emerald-100">{bullPct.toFixed(0)}%</span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="text-emerald-400 font-medium">{bullCoins}</span> coins with AI Score &gt; 6 (Bullish)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className="h-full bg-yellow-500/50 flex items-center justify-center"
                    initial={{ width: 0 }}
                    animate={{ width: `${neutralPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  >
                    {neutralPct > 10 && (
                      <span className="text-[10px] font-bold text-yellow-100">{neutralPct.toFixed(0)}%</span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="text-yellow-400 font-medium">{neutralCoins}</span> coins with AI Score 4–6 (Neutral)
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className="h-full bg-red-500/70 flex items-center justify-center"
                    initial={{ width: 0 }}
                    animate={{ width: `${bearPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                  >
                    {bearPct > 8 && (
                      <span className="text-[10px] font-bold text-red-100">{bearPct.toFixed(0)}%</span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="text-red-400 font-medium">{bearCoins}</span> coins with AI Score &lt; 4 (Bearish)
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Thermometer marker */}
            <motion.div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.5)]"
              initial={{ left: '50%' }}
              animate={{ left: `${50 + breadth / 2}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </TooltipProvider>

        {/* Scale labels */}
        <div className="flex justify-between text-[9px] text-muted-foreground/50">
          <span>Bearish</span>
          <span>Neutral</span>
          <span>Bullish</span>
        </div>
      </div>
    </TooltipProvider>
  );
}

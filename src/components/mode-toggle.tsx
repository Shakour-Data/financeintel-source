'use client';

import { Coins, Landmark } from 'lucide-react';
import { useSiteRouter, type DashboardMode } from '@/lib/site-router';
import { cn } from '@/lib/utils';

export function ModeToggle() {
  const { dashboardMode, setDashboardMode } = useSiteRouter();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border">
      <button
        onClick={() => setDashboardMode('crypto')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          dashboardMode === 'crypto'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Coins className="w-3.5 h-3.5" />
        <span>Crypto</span>
      </button>
      <button
        onClick={() => setDashboardMode('stocks')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          dashboardMode === 'stocks'
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Landmark className="w-3.5 h-3.5" />
        <span>Stocks</span>
      </button>
    </div>
  );
}

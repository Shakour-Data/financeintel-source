'use client';

import { useMemo } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CryptoTable } from './crypto-table';
import { useWatchlist } from '@/lib/user-data';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── CoinData (mirrors page.tsx) ─────────────────────────────────

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_1h_in_currency?: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  sparkline_in_7d?: { price: number[] };
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface WatchlistPanelProps {
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
  selectedCoinId: string | null;
}

// ─── Component ───────────────────────────────────────────────────

export function WatchlistPanel({
  coins,
  onSelectCoin,
  selectedCoinId,
}: WatchlistPanelProps) {
  const ids = useWatchlist((s) => s.ids);
  const clearWatchlist = useWatchlist((s) => s.clear);

  // Filter the full coin list down to only favorited coins.
  // Preserve the watchlist's add-order so the user sees a stable list.
  const watchlistCoins = useMemo(() => {
    if (!ids.length) return [];
    const byId = new Map(coins.map((c) => [c.id, c]));
    const result: CoinData[] = [];
    for (const id of ids) {
      const c = byId.get(id);
      if (c) result.push(c);
    }
    return result;
  }, [ids, coins]);

  const count = watchlistCoins.length;

  // ─── Empty State ──────────────────────────────────────────────
  if (count === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Watchlist</h2>
          <p className="text-sm text-muted-foreground">
            Track your favorite cryptocurrencies in one place. Star coins to add them here for quick access.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/10">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mb-4">
            <Star className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-base font-semibold mb-1">Your watchlist is empty</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Click the star icon next to any coin in the Overview tab to add it here.
          </p>
        </div>
      </div>
    );
  }

  // ─── Populated State ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Watchlist
            <span className="text-sm font-normal text-muted-foreground">
              — {count} {count === 1 ? 'coin' : 'coins'}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your favorited cryptocurrencies. Click a star to remove it from this list.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearWatchlist()}
          className={cn(
            'text-muted-foreground hover:text-destructive',
            'hover:border-destructive/40 hover:bg-destructive/5'
          )}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Clear all
        </Button>
      </div>

      {/* Reuse the main table — it already has the star column so users
          can unfavorite coins directly from here */}
      <CryptoTable
        coins={watchlistCoins}
        onSelectCoin={onSelectCoin}
        selectedCoinId={selectedCoinId}
      />
    </div>
  );
}

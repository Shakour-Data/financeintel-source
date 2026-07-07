'use client';

import { useMemo } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── Types ──────────────────────────────────────────────────────

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
  total_supply?: number | null;
  max_supply?: number | null;
  sparkline_in_7d?: { price: number[] };
  aiScore: number;
  previousAiScore?: number;
  aiScoreChange?: number;
  aiScoreChangePct?: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface MarketHeatmapProps {
  coins: CoinData[];
  onSelectCoin: (coin: CoinData) => void;
}

interface HeatmapItem {
  id: string;
  name: string;
  size: number;
  change: number;
  coin: CoinData;
}

interface HeatmapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  depth?: number;
  payload?: HeatmapItem;
  name?: string;
  value?: number;
  // Recharts may also spread the data item fields directly
  coin?: CoinData;
  change?: number;
  onSelectCoin?: (coin: CoinData) => void;
}

// ─── Color scale ────────────────────────────────────────────────
// 7-stop diverging scale: deep emerald (strong gain) → neutral gray → deep rose (strong loss)

function getHeatmapColor(change: number): string {
  if (change > 5) return '#059669'; // deep emerald
  if (change > 2) return '#10b981'; // medium emerald
  if (change > 0) return '#6ee7b7'; // light emerald
  if (change === 0) return '#94a3b8'; // neutral gray
  if (change > -2) return '#fda4af'; // light rose
  if (change > -5) return '#f43f5e'; // medium rose
  return '#be123c'; // deep rose
}

// ─── Compact formatters ─────────────────────────────────────────

function formatCompactPrice(price: number): string {
  if (price >= 1e6) return `$${(price / 1e6).toFixed(2)}M`;
  if (price >= 1e3) return `$${(price / 1e3).toFixed(1)}K`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatCompactMcap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  if (cap >= 1e3) return `$${(cap / 1e3).toFixed(1)}K`;
  return `$${cap.toFixed(0)}`;
}

// Plain price string (without leading $) for use in the title attribute
function formatPlainPrice(price: number): string {
  if (price >= 1e6) return `${(price / 1e6).toFixed(2)}M`;
  if (price >= 1e3) return `${(price / 1e3).toFixed(1)}K`;
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

// ─── Custom Treemap cell ────────────────────────────────────────

function HeatmapCell(props: HeatmapCellProps) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
    coin: directCoin,
    change: directChange,
    onSelectCoin,
  } = props;

  // Recharts Treemap may pass the data item either as `payload` (the full item)
  // or spread its fields directly as props. Handle both.
  const coin = directCoin ?? payload?.coin;
  const change = Number.isFinite(directChange as number)
    ? (directChange as number)
    : Number.isFinite(payload?.change)
      ? payload!.change
      : 0;

  if (!coin || width <= 1 || height <= 1) {
    return null;
  }
  const fill = getHeatmapColor(change);
  const changeStr = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  // Show different levels of detail based on available cell area
  const showSymbol = width > 44 && height > 26;
  const showPrice = width > 64 && height > 44;
  const showChange = width > 72 && height > 60;

  // Font sizes that adapt to cell size
  const symbolFontSize = Math.max(9, Math.min(16, width / 7));
  const priceFontSize = Math.max(8, Math.min(11, width / 9));
  const changeFontSize = Math.max(7, Math.min(10, width / 10));

  // Vertical centering: distribute the visible lines around the cell midline
  const cy = height / 2;
  let symbolY = cy;
  let priceY = cy;
  let changeY = cy;
  if (showChange) {
    symbolY = cy - 10;
    priceY = cy + 4;
    changeY = cy + 17;
  } else if (showPrice) {
    symbolY = cy - 7;
    priceY = cy + 8;
  }

  const titleText = `${coin.name} (${coin.symbol}) — $${formatPlainPrice(
    coin.current_price
  )} | ${changeStr} | MC ${formatCompactMcap(coin.market_cap)}`;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="heatmap-cell-group"
      onClick={(e) => {
        e.stopPropagation();
        onSelectCoin?.(coin);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectCoin?.(coin);
        }
      }}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      <title>{titleText}</title>
      <g className="heatmap-cell-inner">
        <rect
          width={width}
          height={height}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={2}
          rx={2}
        />
        {showSymbol && (
          <text
            x={width / 2}
            y={symbolY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={symbolFontSize}
            fontWeight={700}
            style={{
              pointerEvents: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {coin.symbol}
          </text>
        )}
        {showPrice && (
          <text
            x={width / 2}
            y={priceY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={priceFontSize}
            opacity={0.92}
            style={{ pointerEvents: 'none' }}
          >
            {formatCompactPrice(coin.current_price)}
          </text>
        )}
        {showChange && (
          <text
            x={width / 2}
            y={changeY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={changeFontSize}
            fontWeight={600}
            opacity={0.95}
            style={{ pointerEvents: 'none' }}
          >
            {changeStr}
          </text>
        )}
      </g>
    </g>
  );
}

// ─── Main component ─────────────────────────────────────────────

export function MarketHeatmap({ coins, onSelectCoin }: MarketHeatmapProps) {
  const data = useMemo<HeatmapItem[]>(() => {
    return coins
      .filter((c) => c && c.market_cap > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        size: c.market_cap,
        change:
          Number.isFinite(c.price_change_percentage_24h)
            ? c.price_change_percentage_24h
            : 0,
        coin: c,
      }))
      .sort((a, b) => b.size - a.size);
  }, [coins]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market Heatmap</CardTitle>
        <CardDescription>
          Size: Market Cap | Color: 24h Change
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Hover scale-up transition for treemap cells */}
        <style>{`
          .heatmap-cell-inner {
            transition: transform 150ms ease-out;
            transform-origin: center;
            transform-box: fill-box;
          }
          .heatmap-cell-group:hover .heatmap-cell-inner {
            transform: scale(1.03);
          }
          .heatmap-cell-group:focus-visible .heatmap-cell-inner {
            transform: scale(1.03);
          }
        `}</style>

        {data.length === 0 ? (
          <div className="h-[300px] md:h-[400px] w-full space-y-2">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <div className="h-[300px] md:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data}
                dataKey="size"
                stroke="#ffffff"
                animationDuration={400}
                content={((cellProps: HeatmapCellProps) => (
                  <HeatmapCell {...cellProps} onSelectCoin={onSelectCoin} />
                )) as any}
              />
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { CoinData, MarketHeatmapProps };

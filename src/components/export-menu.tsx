'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Dimension } from '@/lib/scoring-engine-v2';

// ─── CoinData (mirror of dashboard shape) ─────────────────────

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
  high_24h: number;
  low_24h: number;
  ath: number;
  ath_change_percentage: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  aiScore: number;
  previousAiScore: number;
  aiScoreChange: number;
  aiScoreChangePct: number;
  confidence: 'high' | 'medium' | 'low';
  dimensions: Dimension[];
}

interface ExportMenuProps {
  coins: CoinData[];
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

// ─── Download helpers ────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(',')
    )
    .join('\n');
  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

// ─── Formatting helpers ──────────────────────────────────────

function formatDatestamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n === undefined || n === null) return '';
  if (!Number.isFinite(n)) return '';
  return n.toFixed(decimals);
}

// ─── CSV builders ────────────────────────────────────────────

const DIMENSION_COLUMNS = [
  'fundamental',
  'technical',
  'onchain',
  'market_psychology',
  'news_sentiment',
  'macroeconomic',
  'regulatory',
  'network_security',
  'derivatives',
  'whale_smart_money',
  'ecosystem_defi',
  'inter_market',
] as const;

function buildScoresCSV(coins: CoinData[]): (string | number)[][] {
  const header = [
    'rank',
    'symbol',
    'name',
    'price',
    'market_cap',
    'volume',
    '24h_change',
    '7d_change',
    'ath_distance',
    'ai_score',
    'previous_score',
    'score_delta_pct',
    'confidence',
    ...DIMENSION_COLUMNS.map((k) => `dim_${k}`),
  ];
  const rows: (string | number)[][] = [header];

  for (const c of coins) {
    const dimBy: Record<string, Dimension> = {};
    for (const d of c.dimensions ?? []) dimBy[d.key] = d;

    rows.push([
      c.market_cap_rank ?? '',
      c.symbol ?? '',
      c.name ?? '',
      fmtNum(c.current_price),
      c.market_cap ?? '',
      c.total_volume ?? '',
      fmtNum(c.price_change_percentage_24h),
      fmtNum(c.price_change_percentage_7d_in_currency),
      fmtNum(c.ath_change_percentage),
      fmtNum(c.aiScore),
      fmtNum(c.previousAiScore),
      fmtNum(c.aiScoreChangePct),
      c.confidence ?? '',
      ...DIMENSION_COLUMNS.map((k) => {
        const d = dimBy[k];
        return d ? fmtNum(d.score) : '';
      }),
    ]);
  }
  return rows;
}

function buildDimensionBreakdownCSV(coins: CoinData[]): (string | number)[][] {
  const header = [
    'rank',
    'symbol',
    'name',
    'dimension_key',
    'dimension_name',
    'dimension_score',
    'previous_score',
    'score_change',
    'score_change_pct',
    'coefficient',
    'previous_coefficient',
    'coefficient_change',
    'sub_dimensions_count',
  ];
  const rows: (string | number)[][] = [header];

  for (const c of coins) {
    for (const d of c.dimensions ?? []) {
      rows.push([
        c.market_cap_rank ?? '',
        c.symbol ?? '',
        c.name ?? '',
        d.key ?? '',
        d.name ?? '',
        fmtNum(d.score),
        fmtNum(d.previousScore),
        fmtNum(d.scoreChange),
        fmtNum(d.scoreChangePct),
        fmtNum(d.coefficient, 4),
        fmtNum(d.previousCoefficient, 4),
        fmtNum(d.coefficientChange, 4),
        d.subDimensions?.length ?? 0,
      ]);
    }
  }
  return rows;
}

function buildExportJSON(coins: CoinData[]) {
  return {
    exported_at: new Date().toISOString(),
    coin_count: coins.length,
    scale: '1-10',
    coins: coins.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      price: c.current_price,
      market_cap: c.market_cap,
      market_cap_rank: c.market_cap_rank,
      total_volume: c.total_volume,
      price_change_percentage_24h: c.price_change_percentage_24h,
      price_change_percentage_7d: c.price_change_percentage_7d_in_currency ?? null,
      ath: c.ath,
      ath_change_percentage: c.ath_change_percentage,
      circulating_supply: c.circulating_supply,
      total_supply: c.total_supply,
      max_supply: c.max_supply,
      ai_score: c.aiScore,
      previous_ai_score: c.previousAiScore,
      ai_score_change: c.aiScoreChange,
      ai_score_change_pct: c.aiScoreChangePct,
      confidence: c.confidence,
      dimensions: (c.dimensions ?? []).map((d) => ({
        key: d.key,
        name: d.name,
        color: d.color,
        score: d.score,
        previous_score: d.previousScore,
        score_change: d.scoreChange,
        score_change_pct: d.scoreChangePct,
        coefficient: d.coefficient,
        previous_coefficient: d.previousCoefficient,
        coefficient_change: d.coefficientChange,
        sub_dimensions: (d.subDimensions ?? []).map((sd) => ({
          key: sd.key,
          name: sd.name,
          score: sd.score,
          coefficient: sd.coefficient,
        })),
      })),
    })),
  };
}

// ─── Component ───────────────────────────────────────────────

export function ExportMenu({
  coins,
  className,
  variant = 'outline',
  size = 'sm',
  label = 'Export',
}: ExportMenuProps) {
  const [busy, setBusy] = useState<null | 'csv' | 'json' | 'dim'>(null);

  const disabled = coins.length === 0;

  const withBusy = async (key: 'csv' | 'json' | 'dim', fn: () => void, successMsg: string) => {
    if (disabled) return;
    setBusy(key);
    try {
      // Defer to next tick so the spinner can render before heavy work.
      await new Promise((r) => setTimeout(r, 10));
      fn();
      toast.success(successMsg, {
        description: `${coins.length} coin${coins.length === 1 ? '' : 's'} exported.`,
      });
    } catch (err) {
      toast.error('Export failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleExportScoresCSV = () => {
    withBusy(
      'csv',
      () => {
        const rows = buildScoresCSV(coins);
        downloadCSV(`crypto-scores-${formatDatestamp()}.csv`, rows);
      },
      'Scores CSV exported'
    );
  };

  const handleExportScoresJSON = () => {
    withBusy(
      'json',
      () => {
        const data = buildExportJSON(coins);
        downloadJSON(`crypto-scores-${formatDatestamp()}.json`, data);
      },
      'Scores JSON exported'
    );
  };

  const handleExportDimensionBreakdown = () => {
    withBusy(
      'dim',
      () => {
        const rows = buildDimensionBreakdownCSV(coins);
        downloadCSV(`crypto-dimensions-${formatDatestamp()}.csv`, rows);
      },
      'Dimension breakdown CSV exported'
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || busy !== null}
          className={cn('gap-1.5', className)}
          aria-label="Export menu"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
          <span>{busy ? 'Exporting…' : label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Export {coins.length} coin{coins.length === 1 ? '' : 's'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleExportScoresCSV}
          disabled={busy !== null}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="size-4 text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-sm">Scores as CSV</span>
            <span className="text-[10px] text-muted-foreground">
              rank, price, AI score, 12 dim scores
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportScoresJSON}
          disabled={busy !== null}
          className="gap-2 cursor-pointer"
        >
          <FileJson className="size-4 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-sm">Scores as JSON</span>
            <span className="text-[10px] text-muted-foreground">
              full nested structure + metadata
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleExportDimensionBreakdown}
          disabled={busy !== null}
          className="gap-2 cursor-pointer"
        >
          <FileText className="size-4 text-sky-500" />
          <div className="flex flex-col">
            <span className="text-sm">Dimension Breakdown CSV</span>
            <span className="text-[10px] text-muted-foreground">
              one row per coin × dimension
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportMenu;

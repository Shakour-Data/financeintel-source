'use client';

import { useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  AlertTriangle,
  Coins,
  RotateCcw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

import { cn } from '@/lib/utils';
import { usePortfolio, type Holding } from '@/lib/user-data';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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
  aiScore: number;
}

interface PortfolioPanelProps {
  coins: CoinData[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

// 8 distinct slice colors — emerald/teal/amber/rose/cyan/violet/orange/lime
// (deliberately no blue/indigo)
const PIE_COLORS = [
  '#10b981', // emerald-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  if (n < 0) return `-${fmtCurrency(-n)}`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  if (n >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n > 0) return `$${n.toFixed(6)}`;
  return '$0.00';
}

function fmtAmount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toFixed(6).replace(/\.?0+$/, '');
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return '0.00%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoFromInputDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // date input returns YYYY-MM-DD; normalize to ISO
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function inputDateFromISO(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayISODate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ═══════════════════════════════════════════════════════════════
// DERIVED DATA HOOK
// ═══════════════════════════════════════════════════════════════

interface EnrichedHolding extends Holding {
  currentPrice: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  priceAvailable: boolean;
}

function useEnrichedHoldings(coins: CoinData[]): {
  enriched: EnrichedHolding[];
  totals: {
    value: number;
    cost: number;
    pnl: number;
    roiPct: number;
  };
} {
  const holdings = usePortfolio((s) => s.holdings);

  return useMemo(() => {
    const coinMap = new Map<string, CoinData>();
    for (const c of coins) coinMap.set(c.id, c);

    const enriched: EnrichedHolding[] = holdings.map((h) => {
      const coin = coinMap.get(h.coinId);
      const priceAvailable = !!coin && Number.isFinite(coin.current_price);
      const currentPrice = priceAvailable ? coin!.current_price : h.buyPrice;
      const value = h.amount * currentPrice;
      const cost = h.amount * h.buyPrice;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      return {
        ...h,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPct,
        priceAvailable,
      };
    });

    const value = enriched.reduce((s, h) => s + h.value, 0);
    const cost = enriched.reduce((s, h) => s + h.cost, 0);
    const pnl = value - cost;
    const roiPct = cost > 0 ? (pnl / cost) * 100 : 0;

    return { enriched, totals: { value, cost, pnl, roiPct } };
  }, [holdings, coins]);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: SUMMARY CARDS
// ═══════════════════════════════════════════════════════════════

function SummaryCards({
  totals,
  holdingsCount,
}: {
  totals: { value: number; cost: number; pnl: number; roiPct: number };
  holdingsCount: number;
}) {
  const pnlPositive = totals.pnl >= 0;
  const roiPositive = totals.roiPct >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="gap-0 py-4">
        <CardContent className="px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Wallet className="w-3.5 h-3.5" />
            Total Value
          </div>
          <div className="text-xl md:text-2xl font-bold tabular-nums">
            {fmtCurrency(totals.value)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {holdingsCount} {holdingsCount === 1 ? 'position' : 'positions'}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardContent className="px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Coins className="w-3.5 h-3.5" />
            Total Cost
          </div>
          <div className="text-xl md:text-2xl font-bold tabular-nums">
            {fmtCurrency(totals.cost)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Sum of buy price × amount
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardContent className="px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {pnlPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            Total P&amp;L
          </div>
          <div
            className={cn(
              'text-xl md:text-2xl font-bold tabular-nums',
              pnlPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400'
            )}
          >
            {pnlPositive ? '+' : ''}
            {fmtCurrency(totals.pnl)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Value − Cost
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 py-4">
        <CardContent className="px-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {roiPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            Total ROI
          </div>
          <div
            className={cn(
              'text-xl md:text-2xl font-bold tabular-nums',
              roiPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-500 dark:text-red-400'
            )}
          >
            {fmtPct(totals.roiPct)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            P&amp;L / Cost
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: ADD HOLDING FORM
// ═══════════════════════════════════════════════════════════════

function AddHoldingForm({ coins }: { coins: CoinData[] }) {
  const addHolding = usePortfolio((s) => s.addHolding);

  const [coinId, setCoinId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [buyPriceStr, setBuyPriceStr] = useState<string>('');
  const [buyDate, setBuyDate] = useState<string>(todayISODate());
  const [notes, setNotes] = useState<string>('');

  const selectedCoin = useMemo(
    () => coins.find((c) => c.id === coinId),
    [coins, coinId]
  );

  const handleCoinChange = useCallback((id: string) => {
    setCoinId(id);
    // Default buy price to the coin's current market price when first selected
    const coin = coins.find((c) => c.id === id);
    if (coin) {
      setBuyPriceStr(String(coin.current_price));
    }
  }, [coins]);

  const resetForm = useCallback(() => {
    setCoinId('');
    setAmountStr('');
    setBuyPriceStr('');
    setBuyDate(todayISODate());
    setNotes('');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin) {
      toast.error('Please select a coin first.');
      return;
    }
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid amount (greater than 0).');
      return;
    }
    const buyPrice = parseFloat(buyPriceStr);
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
      toast.error('Please enter a valid buy price (greater than 0).');
      return;
    }
    if (!buyDate) {
      toast.error('Please pick a buy date.');
      return;
    }

    addHolding({
      coinId: selectedCoin.id,
      symbol: selectedCoin.symbol,
      name: selectedCoin.name,
      image: selectedCoin.image,
      amount,
      buyPrice,
      buyDate: isoFromInputDate(buyDate),
      notes: notes.trim() || undefined,
    });

    toast.success('Holding added', {
      description: `${amount} ${selectedCoin.symbol.toUpperCase()} @ ${fmtPrice(
        buyPrice
      )}`,
    });

    resetForm();
  };

  const noCoins = coins.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Add Holding
        </CardTitle>
        <CardDescription>
          Track a new position. Buy price defaults to the coin&apos;s current
          market price.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Coin selector */}
            <div className="space-y-1.5 md:col-span-2 lg:col-span-1">
              <Label htmlFor="portfolio-coin">Coin</Label>
              <Select
                value={coinId}
                onValueChange={handleCoinChange}
                disabled={noCoins}
              >
                <SelectTrigger id="portfolio-coin" className="w-full">
                  <SelectValue
                    placeholder={noCoins ? 'No coins available' : 'Select a coin'}
                  />
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-72 overflow-y-auto">
                    {coins.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-semibold uppercase">
                          {c.symbol}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-amount">Amount</Label>
              <Input
                id="portfolio-amount"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="e.g. 0.5"
              />
            </div>

            {/* Buy Price */}
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-buyprice">Buy Price (USD)</Label>
              <Input
                id="portfolio-buyprice"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={buyPriceStr}
                onChange={(e) => setBuyPriceStr(e.target.value)}
                placeholder={
                  selectedCoin
                    ? String(selectedCoin.current_price)
                    : 'e.g. 50000'
                }
              />
            </div>

            {/* Buy Date */}
            <div className="space-y-1.5">
              <Label htmlFor="portfolio-buydate">Buy Date</Label>
              <Input
                id="portfolio-buydate"
                type="date"
                value={buyDate}
                max={todayISODate()}
                onChange={(e) => setBuyDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
              <Label htmlFor="portfolio-notes">
                Notes{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="portfolio-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Long-term hold, DCA batch #2"
                maxLength={200}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus className="w-4 h-4" />
              Add Holding
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// EDIT HOLDING DIALOG
// ═══════════════════════════════════════════════════════════════

function EditHoldingDialog({
  holding,
  open,
  onOpenChange,
  onSave,
}: {
  holding: EnrichedHolding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<Holding>) => void;
}) {
  const [amountStr, setAmountStr] = useState(String(holding.amount));
  const [buyPriceStr, setBuyPriceStr] = useState(String(holding.buyPrice));
  const [buyDate, setBuyDate] = useState(inputDateFromISO(holding.buyDate));
  const [notes, setNotes] = useState(holding.notes ?? '');

  const handleSave = () => {
    const amount = parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid amount (greater than 0).');
      return;
    }
    const buyPrice = parseFloat(buyPriceStr);
    if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
      toast.error('Please enter a valid buy price (greater than 0).');
      return;
    }

    onSave({
      amount,
      buyPrice,
      buyDate: isoFromInputDate(buyDate),
      notes: notes.trim() || undefined,
    });

    toast.success('Holding updated', {
      description: `${holding.symbol.toUpperCase()} position saved`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Holding</DialogTitle>
          <DialogDescription>
            Update the details for your{' '}
            <span className="font-medium text-foreground uppercase">
              {holding.symbol}
            </span>{' '}
            position.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            {holding.image ? (
              <img
                src={holding.image}
                alt={holding.symbol}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                {holding.symbol.slice(0, 3).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {holding.name}
              </div>
              <div className="text-xs text-muted-foreground uppercase">
                {holding.symbol}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-buyprice">Buy Price (USD)</Label>
              <Input
                id="edit-buyprice"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={buyPriceStr}
                onChange={(e) => setBuyPriceStr(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-buydate">Buy Date</Label>
            <Input
              id="edit-buydate"
              type="date"
              value={buyDate}
              max={todayISODate()}
              onChange={(e) => setBuyDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">
              Notes{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="edit-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOLDINGS TABLE
// ═══════════════════════════════════════════════════════════════

function HoldingsTable({
  enriched,
  onEdit,
}: {
  enriched: EnrichedHolding[];
  onEdit: (h: EnrichedHolding) => void;
}) {
  const removeHolding = usePortfolio((s) => s.removeHolding);

  if (enriched.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Holdings
          </CardTitle>
          <CardDescription>Your tracked crypto positions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No holdings yet. Add your first position above.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Holdings
        </CardTitle>
        <CardDescription>
          {enriched.length} {enriched.length === 1 ? 'position' : 'positions'} •
          prices update with market data
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-[28rem] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="pl-6">Coin</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Buy Price</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">P&amp;L</TableHead>
                <TableHead className="text-right">P&amp;L %</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.map((h) => {
                const positive = h.pnl >= 0;
                return (
                  <TableRow key={h.id}>
                    {/* Coin */}
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2 min-w-0">
                        {h.image ? (
                          <img
                            src={h.image}
                            alt={h.symbol}
                            className="w-6 h-6 rounded-full shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-semibold">
                            {h.symbol.slice(0, 3).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm uppercase">
                              {h.symbol}
                            </span>
                            {!h.priceAvailable && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                                title="Coin no longer in tracked market data — showing buy price as fallback"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                N/A
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[8rem]">
                            {h.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="text-right tabular-nums">
                      {fmtAmount(h.amount)}
                    </TableCell>

                    {/* Buy Price */}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmtPrice(h.buyPrice)}
                    </TableCell>

                    {/* Current Price */}
                    <TableCell className="text-right tabular-nums">
                      {h.priceAvailable ? (
                        fmtPrice(h.currentPrice)
                      ) : (
                        <span
                          className="text-muted-foreground"
                          title="Price unavailable — using buy price"
                        >
                          {fmtPrice(h.currentPrice)}
                        </span>
                      )}
                    </TableCell>

                    {/* Value */}
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtCurrency(h.value)}
                    </TableCell>

                    {/* P&L $ */}
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-medium',
                        positive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400'
                      )}
                    >
                      {positive ? '+' : ''}
                      {fmtCurrency(h.pnl)}
                    </TableCell>

                    {/* P&L % */}
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-medium',
                        positive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400'
                      )}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {positive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {fmtPct(h.pnlPct)}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-6">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(h)}
                          aria-label={`Edit ${h.symbol} holding`}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              aria-label={`Delete ${h.symbol} holding`}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this holding?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove your{' '}
                                <span className="font-medium text-foreground uppercase">
                                  {h.symbol}
                                </span>{' '}
                                position (
                                {fmtAmount(h.amount)} @{' '}
                                {fmtPrice(h.buyPrice)}). This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  removeHolding(h.id);
                                  toast.success('Holding removed', {
                                    description: `${h.symbol.toUpperCase()} position deleted`,
                                  });
                                }}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALLOCATION PIE CHART
// ═══════════════════════════════════════════════════════════════

interface AllocationSlice {
  name: string;
  symbol: string;
  value: number;
  pct: number;
  color: string;
}

function AllocationChart({
  enriched,
  totalValue,
}: {
  enriched: EnrichedHolding[];
  totalValue: number;
}) {
  const slices: AllocationSlice[] = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => b.value - a.value);
    return sorted.map((h, i) => ({
      name: h.name,
      symbol: h.symbol,
      value: h.value,
      pct: totalValue > 0 ? (h.value / totalValue) * 100 : 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [enriched, totalValue]);

  if (slices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Allocation
          </CardTitle>
          <CardDescription>Current portfolio distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <PieChartIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Add holdings to see allocation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Allocation
        </CardTitle>
        <CardDescription>By current market value.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="80%"
                paddingAngle={slices.length > 1 ? 2 : 0}
                stroke="none"
              >
                {slices.map((s) => (
                  <Cell key={s.symbol} fill={s.color} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = payload[0].payload as AllocationSlice;
                  return (
                    <div className="rounded-md border bg-popover text-popover-foreground px-3 py-2 text-xs shadow-md">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.symbol.toUpperCase()}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {fmtCurrency(p.value)} ({p.pct.toFixed(2)}%)
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {slices.map((s) => (
            <div
              key={s.symbol}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-medium uppercase truncate">
                  {s.symbol}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="text-muted-foreground text-xs">
                  {fmtCurrency(s.value)}
                </span>
                <span className="font-medium w-12 text-right">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function PortfolioPanel({ coins }: PortfolioPanelProps) {
  const { enriched, totals } = useEnrichedHoldings(coins);
  const updateHolding = usePortfolio((s) => s.updateHolding);
  const clearAll = usePortfolio((s) => s.clearAll);

  const [editing, setEditing] = useState<EnrichedHolding | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = useCallback((h: EnrichedHolding) => {
    setEditing(h);
    setEditOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    (patch: Partial<Holding>) => {
      if (!editing) return;
      updateHolding(editing.id, patch);
    },
    [editing, updateHolding]
  );

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold mb-1">Portfolio Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Track your crypto holdings, monitor P&amp;L in real time, and
            visualize your allocation across positions.
          </p>
        </div>
        {enriched.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all holdings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all {enriched.length}{' '}
                  {enriched.length === 1 ? 'holding' : 'holdings'} from your
                  portfolio. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearAll();
                    toast.success('Portfolio cleared');
                  }}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Section 1: Summary cards */}
      <SummaryCards
        totals={totals}
        holdingsCount={enriched.length}
      />

      {/* Section 2: Add holding form */}
      <AddHoldingForm coins={coins} />

      {/* Section 3: Holdings table + allocation chart */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <HoldingsTable enriched={enriched} onEdit={handleEdit} />
        </div>
        <div className="md:col-span-1">
          <AllocationChart enriched={enriched} totalValue={totals.value} />
        </div>
      </div>

      {/* Edit dialog — keyed by holding.id so it remounts with fresh state
          whenever a different holding is being edited */}
      {editing && (
        <EditHoldingDialog
          key={editing.id}
          holding={editing}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

export default PortfolioPanel;

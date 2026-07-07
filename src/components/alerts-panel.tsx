'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Bell,
  BellRing,
  Pause,
  Play,
  Trash2,
  Plus,
  ChevronDown,
  History,
  Clock,
  CheckCircle2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  useAlerts,
  type AlertCondition,
  type PriceAlert,
} from '@/lib/user-data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  price_change_percentage_24h: number;
  aiScore: number;
}

interface AlertsPanelProps {
  coins: CoinData[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS / HELPERS
// ═══════════════════════════════════════════════════════════════

const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'Price Above',
  below: 'Price Below',
  pct_up_24h: '24h Change Up %',
  pct_down_24h: '24h Change Down %',
  score_above: 'AI Score Above',
  score_below: 'AI Score Below',
};

const CONDITION_VALUES: AlertCondition[] = [
  'above',
  'below',
  'pct_up_24h',
  'pct_down_24h',
  'score_above',
  'score_below',
];

function describeAlert(a: PriceAlert): string {
  switch (a.condition) {
    case 'above':
      return `${a.symbol} above $${a.target.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    case 'below':
      return `${a.symbol} below $${a.target.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
    case 'pct_up_24h':
      return `${a.symbol} up ${a.target}% in 24h`;
    case 'pct_down_24h':
      return `${a.symbol} down ${a.target}% in 24h`;
    case 'score_above':
      return `${a.symbol} AI Score above ${a.target}`;
    case 'score_below':
      return `${a.symbol} AI Score below ${a.target}`;
  }
}

function formatPrice(n: number): string {
  if (n >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
}

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ alert }: { alert: PriceAlert }) {
  if (alert.triggered) {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" />
        Triggered
      </Badge>
    );
  }
  if (!alert.active) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        <Pause className="w-3 h-3" />
        Paused
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      Waiting
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERT CARD
// ═══════════════════════════════════════════════════════════════

function AlertCard({
  alert,
  coinImage,
  onToggle,
  onRemove,
}: {
  alert: PriceAlert;
  coinImage?: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-colors',
        alert.triggered
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : alert.active
            ? 'border-border hover:border-foreground/20'
            : 'border-dashed border-border opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {coinImage ? (
            <img
              src={coinImage}
              alt={alert.symbol}
              className="w-8 h-8 rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-semibold">
              {alert.symbol.slice(0, 3).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">{alert.symbol}</span>
              <StatusBadge alert={alert} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {describeAlert(alert)}
            </p>
            {alert.note && (
              <p className="text-xs text-muted-foreground/80 mt-1 italic line-clamp-2">
                &ldquo;{alert.note}&rdquo;
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </span>
              {alert.triggered && alert.triggeredAt && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <BellRing className="w-3 h-3" />
                  Triggered {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!alert.triggered && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggle}
              aria-label={alert.active ? 'Pause alert' : 'Resume alert'}
              title={alert.active ? 'Pause' : 'Resume'}
            >
              {alert.active ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Delete alert"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this alert?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the alert
                  {' '}
                  <span className="font-medium text-foreground">{describeAlert(alert)}</span>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRemove}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE ALERT FORM
// ═══════════════════════════════════════════════════════════════

function CreateAlertForm({ coins }: { coins: CoinData[] }) {
  const addAlert = useAlerts((s) => s.addAlert);

  const [coinId, setCoinId] = useState<string>(coins[0]?.id ?? '');
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [targetStr, setTargetStr] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const selectedCoin = useMemo(
    () => coins.find((c) => c.id === coinId),
    [coins, coinId]
  );

  const targetHint = useMemo(() => {
    if (!selectedCoin) return '';
    switch (condition) {
      case 'above':
      case 'below':
        return `Current price: ${formatPrice(selectedCoin.current_price)}`;
      case 'pct_up_24h':
      case 'pct_down_24h':
        return `Current 24h change: ${selectedCoin.price_change_percentage_24h.toFixed(2)}%`;
      case 'score_above':
      case 'score_below':
        return `Current AI Score: ${selectedCoin.aiScore.toFixed(2)} / 10`;
    }
  }, [selectedCoin, condition]);

  const isPct = condition === 'pct_up_24h' || condition === 'pct_down_24h';
  const isScore = condition === 'score_above' || condition === 'score_below';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin) {
      toast.error('Please select a coin first.');
      return;
    }
    const target = parseFloat(targetStr);
    if (!Number.isFinite(target) || target <= 0) {
      toast.error('Please enter a valid target value.');
      return;
    }
    if (isScore && target > 10) {
      toast.error('AI Score target must be between 0 and 10.');
      return;
    }

    addAlert({
      coinId: selectedCoin.id,
      symbol: selectedCoin.symbol,
      name: selectedCoin.name,
      condition,
      target,
      active: true,
      note: note.trim() || undefined,
    });

    toast.success('Alert created', {
      description: describeAlert({
        ...{ id: '', createdAt: '', triggered: false },
        coinId: selectedCoin.id,
        symbol: selectedCoin.symbol,
        name: selectedCoin.name,
        condition,
        target,
        active: true,
      } as PriceAlert),
    });

    setTargetStr('');
    setNote('');
  };

  const targetPlaceholder = isPct
    ? 'e.g. 5'
    : isScore
      ? '0 – 10'
      : `e.g. ${selectedCoin ? selectedCoin.current_price : '100'}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Create New Alert
        </CardTitle>
        <CardDescription>
          Get notified when a coin hits your target price, 24h move, or AI score threshold.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coin selector */}
            <div className="space-y-1.5">
              <Label htmlFor="alert-coin">Coin</Label>
              <Select value={coinId} onValueChange={setCoinId}>
                <SelectTrigger id="alert-coin" className="w-full">
                  <SelectValue placeholder="Select a coin" />
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-72 overflow-y-auto">
                    {coins.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="font-semibold uppercase">{c.symbol}</span>
                        <span className="text-muted-foreground ml-1">{c.name}</span>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Condition selector */}
            <div className="space-y-1.5">
              <Label htmlFor="alert-condition">Condition</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as AlertCondition)}>
                <SelectTrigger id="alert-condition" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_VALUES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target input */}
          <div className="space-y-1.5">
            <Label htmlFor="alert-target">
              Target {isPct ? '(%)' : isScore ? '(0 – 10)' : '(USD)'}
            </Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Input
                id="alert-target"
                type="number"
                inputMode="decimal"
                step={isPct ? '0.1' : isScore ? '0.1' : 'any'}
                min={isScore ? 0 : undefined}
                max={isScore ? 10 : undefined}
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value)}
                placeholder={targetPlaceholder}
                className="sm:max-w-xs"
              />
              {targetHint && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {targetHint}
                </span>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="alert-note">
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="alert-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Take profit target"
              maxLength={140}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Plus className="w-4 h-4" />
              Create Alert
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Bell className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        No alerts yet. Create one above to get notified when your coins hit target prices or scores.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRIGGERED HISTORY (collapsible)
// ═══════════════════════════════════════════════════════════════

function TriggeredHistory({
  triggered,
  coins,
  onRemove,
  onClear,
}: {
  triggered: PriceAlert[];
  coins: CoinData[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (triggered.length === 0) return null;

  const imageMap = new Map(coins.map((c) => [c.id, c.image]));

  // Sort: most recent triggeredAt first.
  const sorted = [...triggered].sort((a, b) => {
    const ta = a.triggeredAt ? new Date(a.triggeredAt).getTime() : 0;
    const tb = b.triggeredAt ? new Date(b.triggeredAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-base">
                  Triggered History
                </CardTitle>
                <Badge variant="secondary" className="ml-1">
                  {triggered.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    open && 'rotate-180'
                  )}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 pt-0">
            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear triggered history
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear triggered history?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {triggered.length} triggered alert
                      {triggered.length === 1 ? '' : 's'} from history. Active (waiting) alerts
                      will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onClear}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {sorted.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  coinImage={imageMap.get(a.coinId)}
                  onToggle={() => {}}
                  onRemove={() => onRemove(a.id)}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN ALERTS PANEL
// ═══════════════════════════════════════════════════════════════

export function AlertsPanel({ coins }: AlertsPanelProps) {
  const alerts = useAlerts((s) => s.alerts);
  const removeAlert = useAlerts((s) => s.removeAlert);
  const toggleAlert = useAlerts((s) => s.toggleAlert);
  const clearTriggered = useAlerts((s) => s.clearTriggered);

  const imageMap = useMemo(
    () => new Map(coins.map((c) => [c.id, c.image])),
    [coins]
  );

  // "Active" group: alerts that have not triggered yet (waiting + paused).
  // "Triggered" group: alerts that have fired.
  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.triggered),
    [alerts]
  );
  const triggeredAlerts = useMemo(
    () => alerts.filter((a) => a.triggered),
    [alerts]
  );

  return (
    <div className="space-y-6">
      <CreateAlertForm coins={coins} />

      {/* Section 2: Active alerts list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-amber-500" />
            Active Alerts
            {activeAlerts.length > 0 && (
              <Badge variant="secondary">{activeAlerts.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Alerts currently watching the market. Paused alerts won&apos;t trigger notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {activeAlerts.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  coinImage={imageMap.get(a.coinId)}
                  onToggle={() => toggleAlert(a.id)}
                  onRemove={() => removeAlert(a.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Triggered history (collapsible) */}
      <TriggeredHistory
        triggered={triggeredAlerts}
        coins={coins}
        onRemove={removeAlert}
        onClear={clearTriggered}
      />
    </div>
  );
}

export default AlertsPanel;

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────

export interface FilterState {
  categories: string[];
  scoreMin: number;
  scoreMax: number;
  mcapTier: 'all' | 'large' | 'mid' | 'small' | 'micro';
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  coinsCount: number;
  filteredCount: number;
}

// ─── Constants ──────────────────────────────────────────────────

const ALL_CATEGORIES = [
  'l1',
  'l2',
  'defi',
  'stablecoin',
  'meme',
  'privacy',
  'oracle',
  'ai',
  'gaming',
  'exchange',
  'rwa',
  'lst',
  'other',
] as const;

export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  scoreMin: 1,
  scoreMax: 10,
  mcapTier: 'all',
};

const MCAP_TIERS: { value: FilterState['mcapTier']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'large', label: 'Large (>$10B)' },
  { value: 'mid', label: 'Mid ($1B–$10B)' },
  { value: 'small', label: 'Small ($100M–$1B)' },
  { value: 'micro', label: 'Micro (<$100M)' },
];

// ─── Helpers ────────────────────────────────────────────────────

function isDefaultFilters(f: FilterState): boolean {
  return (
    f.categories.length === 0 &&
    f.scoreMin === 1 &&
    f.scoreMax === 10 &&
    f.mcapTier === 'all'
  );
}

// ─── Component ──────────────────────────────────────────────────

export function FilterBar({
  filters,
  onChange,
  coinsCount,
  filteredCount,
}: FilterBarProps) {
  const toggleCategory = (cat: string) => {
    const newCats = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: newCats });
  };

  const handleMinScore = (val: number[]) => {
    const newMin = val[0];
    // Prevent min from exceeding max
    onChange({ ...filters, scoreMin: Math.min(newMin, filters.scoreMax) });
  };

  const handleMaxScore = (val: number[]) => {
    const newMax = val[0];
    // Prevent max from going below min
    onChange({ ...filters, scoreMax: Math.max(newMax, filters.scoreMin) });
  };

  const handleMcapTier = (val: string) => {
    onChange({
      ...filters,
      mcapTier: val as FilterState['mcapTier'],
    });
  };

  const handleClear = () => {
    onChange({ ...DEFAULT_FILTERS });
  };

  const showClear = !isDefaultFilters(filters);

  return (
    <Card className="p-4 gap-0">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
          {/* ── 1. Category chips ── */}
          <div className="flex flex-col gap-1.5 lg:max-w-md">
            <Label className="text-xs text-muted-foreground font-normal">
              Category
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const active = filters.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={active}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors capitalize',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                      active
                        ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                        : 'bg-transparent text-muted-foreground border-border hover:border-emerald-500/50 hover:text-foreground'
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. AI Score range ── */}
          <div className="flex flex-col gap-1.5 lg:min-w-[220px]">
            <Label className="text-xs text-muted-foreground font-normal">
              AI Score Range:{' '}
              <span className="text-foreground font-semibold tabular-nums">
                {filters.scoreMin.toFixed(1)} — {filters.scoreMax.toFixed(1)}
              </span>
            </Label>
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-7 shrink-0">
                  Min
                </span>
                <Slider
                  min={1}
                  max={10}
                  step={0.5}
                  value={[filters.scoreMin]}
                  onValueChange={handleMinScore}
                  className="flex-1"
                  aria-label="Minimum AI score"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-7 shrink-0">
                  Max
                </span>
                <Slider
                  min={1}
                  max={10}
                  step={0.5}
                  value={[filters.scoreMax]}
                  onValueChange={handleMaxScore}
                  className="flex-1"
                  aria-label="Maximum AI score"
                />
              </div>
            </div>
          </div>

          {/* ── 3. Market Cap tier ── */}
          <div className="flex flex-col gap-1.5 lg:min-w-[170px]">
            <Label className="text-xs text-muted-foreground font-normal">
              Market Cap
            </Label>
            <Select value={filters.mcapTier} onValueChange={handleMcapTier}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {MCAP_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── 4. Clear Filters ── */}
          {showClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="self-start lg:self-end h-9"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear Filters
            </Button>
          )}

          {/* ── 5. Result count ── */}
          <div className="lg:ml-auto text-xs text-muted-foreground self-start lg:self-end pb-1 whitespace-nowrap">
            Showing{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {filteredCount.toLocaleString()}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {coinsCount.toLocaleString()}
            </span>{' '}
            coins
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FilterBar;

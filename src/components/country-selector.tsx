'use client';

import { useSiteRouter, type StockCountryCode } from '@/lib/site-router';
import { STOCK_COUNTRIES, type StockCountry } from '@/lib/stock-data-engine';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function CountrySelector() {
  const { selectedCountry, setSelectedCountry, dashboardMode } = useSiteRouter();

  if (dashboardMode !== 'stocks') return null;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedCountry}
        onValueChange={(v) => setSelectedCountry(v as StockCountryCode)}
      >
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STOCK_COUNTRIES.map((country: StockCountry) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.name}</span>
                <span className="text-muted-foreground text-[10px]">({country.code})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

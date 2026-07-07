'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TradingViewWidgetProps {
  symbol: string;
  exchange?: string;
  className?: string;
  height?: number;
}

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1h', value: '60' },
  { label: '4h', value: '240' },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
];

export function TradingViewWidget({
  symbol,
  exchange = 'BINANCE',
  className,
  height = 480,
}: TradingViewWidgetProps) {
  const [timeframe, setTimeframe] = useState('D');

  // Construct TradingView symbol
  const tvSymbol = `${exchange}:${symbol}`;

  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${encodeURIComponent(tvSymbol)}&interval=${timeframe}&theme=dark&style=1&locale=en&toolbar_bg=0c0f14&enable_publishing=false&hide_top_toolbar=false&hide_side_toolbar=false&allow_symbol_change=true&withdateranges=1&show_popup_button=false&popup_width=1000&popup_height=650&studies=%5B%5B%22MASimple%22%2C%7B%22length%22%3A20%7D%5D%2C%5B%22MASimple%22%2C%7B%22length%22%3A50%7D%5D%2C%5B%22MASimple%22%2C%7B%22length%22%3A200%7D%5D%5D`;

  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-[#0c0f14]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">TradingView</span>
          <span className="text-[10px] text-gray-500">|</span>
          <span className="text-[10px] text-gray-400">{tvSymbol}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors',
                timeframe === tf.value
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1e2a]'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Embedded TradingView chart */}
      <iframe
        src={src}
        title="TradingView Chart"
        style={{ width: '100%', height: `${height}px`, border: 'none' }}
        allowTransparency
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}

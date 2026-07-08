'use client';

import React, { useState, useEffect } from 'react';
import { TradingViewWidget } from '../tradingview-widget';
import { HierarchyTrendsChart } from '../hierarchy-trends-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendDataPoint {
  date: string;
  score: number;
  coefficient: number;
  volatility?: number;
  coinCount?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface TrendResponse {
  data: TrendDataPoint[];
  metadata: {
    nodeKey: string;
    level: string;
    daysRequested: number;
    pointsReturned: number;
  };
}

// Default hierarchy nodes for quick selection
const DEFAULT_NODES = [
  { key: 'fundamental', name: 'Fundamental Analysis', level: 'dimension', color: '#ef4444' },
  { key: 'technical', name: 'Technical Analysis', level: 'dimension', color: '#3b82f6' },
  { key: 'onchain', name: 'On-Chain & Microstructure', level: 'dimension', color: '#22c55e' },
  { key: 'market_psych', name: 'Market Psychology', level: 'dimension', color: '#f59e0b' },
];

export const TradingViewHierarchyPage: React.FC = () => {
  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>('fundamental');
  const [selectedNodeLevel, setSelectedNodeLevel] = useState<string>('dimension');
  const [loading, setLoading] = useState(false);
  const [daysRange, setDaysRange] = useState(90);

  // Fetch trend data
  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          nodeKey: selectedNodeKey,
          level: selectedNodeLevel,
          days: daysRange.toString(),
        });

        const response = await fetch(`/api/hierarchy/trends?${params}`);
        if (!response.ok) throw new Error('Failed to fetch trend data');

        const result: TrendResponse = await response.json();
        setTrendData(result.data);
      } catch (error) {
        console.error('Error fetching trend data:', error);
        setTrendData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [selectedNodeKey, selectedNodeLevel, daysRange]);

  const selectedNode = DEFAULT_NODES.find((n) => n.key === selectedNodeKey);

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">TradingView + Hierarchy Analysis</h1>
        <p className="text-muted-foreground">
          Monitor price action alongside hierarchy trend analysis
        </p>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: TradingView Chart - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Price Chart</CardTitle>
                  <CardDescription>TradingView lightweight chart</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BINANCE:BTCUSDT">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="BINANCE:ETHUSDT">Ethereum (ETH)</SelectItem>
                      <SelectItem value="BINANCE:BNBUSDT">Binance (BNB)</SelectItem>
                      <SelectItem value="BINANCE:XRPUSDT">Ripple (XRP)</SelectItem>
                      <SelectItem value="BINANCE:SOLAUSDT">Solana (SOL)</SelectItem>
                      <SelectItem value="BINANCE:ADAUSDT">Cardano (ADA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-96 md:h-full">
                <TradingViewWidget symbol={symbol} height={500} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Hierarchy Selector - 1 column */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hierarchy Selection</CardTitle>
              <CardDescription className="text-xs">
                Choose a hierarchy node to view trends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Select Buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Select</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_NODES.map((node) => (
                    <Button
                      key={node.key}
                      variant={selectedNodeKey === node.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedNodeKey(node.key);
                        setSelectedNodeLevel(node.level);
                      }}
                      className="text-xs"
                    >
                      {node.name.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium">Time Range</p>
                <div className="grid grid-cols-2 gap-2">
                  {[7, 30, 90, 365].map((days) => (
                    <Button
                      key={days}
                      variant={daysRange === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDaysRange(days)}
                    >
                      {days === 7 ? '7D' : days === 30 ? '30D' : days === 90 ? '90D' : '1Y'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Current Selection Info */}
              {selectedNode && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Current Selection</p>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedNode.color }}
                      />
                      <span className="font-medium text-sm">{selectedNode.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {selectedNode.level}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {trendData.length} data points loaded
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trends Chart - Full Width */}
      {selectedNode && (
        <HierarchyTrendsChart
          title={`${selectedNode.name} Trends`}
          subtitle={`Showing trend analysis for ${selectedNode.level} over ${daysRange} days`}
          data={trendData}
          level={selectedNodeLevel as any}
          color={selectedNode.color}
          showCoefficient={true}
          showVolatility={true}
          loading={loading}
          onDateRangeChange={setDaysRange}
          height={400}
        />
      )}

      {/* Correlation Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Price vs Hierarchy Correlation</CardTitle>
          <CardDescription>
            Analyze how price action correlates with hierarchy node scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Current Symbol</p>
              <Badge variant="outline">{symbol}</Badge>
            </div>
            <div>
              <p className="font-medium mb-2">Time Range</p>
              <Badge variant="outline">{daysRange} days</Badge>
            </div>
            <div>
              <p className="font-medium mb-2">Data Points</p>
              <Badge variant="outline">{trendData.length}</Badge>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            <p>
              The hierarchy trends show how different dimensions, sub-dimensions, aspects, and
              sub-aspects are evolving over time. Compare these trends with the price chart above to
              identify potential correlations and market patterns.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Correlate price movements with hierarchy score changes to identify leading/lagging indicators</li>
            <li>Use time range buttons to zoom in/out and find different timeframe patterns</li>
            <li>Toggle between area and line charts to see different perspective of the same data</li>
            <li>Higher volatility (gap between score lines) may indicate uncertainty or transition periods</li>
            <li>Watch for divergences between hierarchy trends and price action for potential reversals</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingViewHierarchyPage;

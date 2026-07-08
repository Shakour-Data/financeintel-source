'use client';

import React, { useState, useEffect } from 'react';
import { HierarchyTrendsPanel } from './hierarchy-trends-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react';

interface HierarchyStats {
  level: string;
  name: string;
  count: number;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export const HierarchyAnalysisPage: React.FC = () => {
  const [stats, setStats] = useState<HierarchyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch market indicators to get aggregate stats
        const response = await fetch('/api/market/indicators');
        if (!response.ok) throw new Error('Failed to fetch indicators');

        const data = await response.json();
        // Process data to create stats
        // This would be implemented based on your actual market indicators structure
        setStats([
          {
            level: 'dimension',
            name: 'Dimensions',
            count: 12,
            avgScore: 6.2,
            trend: 'up',
            change: 0.5,
          },
          {
            level: 'sub-dimension',
            name: 'Sub-Dimensions',
            count: 40,
            avgScore: 5.8,
            trend: 'stable',
            change: 0.1,
          },
          {
            level: 'aspect',
            name: 'Aspects',
            count: 80,
            avgScore: 5.5,
            trend: 'down',
            change: -0.3,
          },
          {
            level: 'sub-aspect',
            name: 'Sub-Aspects',
            count: 173,
            avgScore: 5.2,
            trend: 'stable',
            change: 0.0,
          },
        ]);
      } catch (error) {
        console.error('Error fetching hierarchy stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="w-full space-y-8 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Hierarchy Analysis</h1>
            <p className="text-muted-foreground">
              Explore trend analysis for dimensions, sub-dimensions, aspects, and sub-aspects
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.level}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <CardDescription className="text-xs">
                  {stat.count} nodes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{stat.avgScore.toFixed(1)}</div>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      stat.trend === 'up'
                        ? 'bg-green-100 text-green-800'
                        : stat.trend === 'down'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {stat.trend === 'up' ? (
                      <>
                        <ArrowUpRight size={12} />
                        {stat.change > 0 && '+'}
                        {stat.change}
                      </>
                    ) : stat.trend === 'down' ? (
                      <>
                        <ArrowDownLeft size={12} />
                        {stat.change}
                      </>
                    ) : (
                      <>−</>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Average score across all {stat.name.toLowerCase()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Hierarchy Trends</CardTitle>
          <CardDescription>
            Select hierarchy nodes to view detailed trend analysis and coefficients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HierarchyTrendsPanel />
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Hierarchy Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-primary mb-1">🔴 Dimensions</div>
              <p className="text-muted-foreground">
                12 top-level categories (Fundamental, Technical, On-Chain, Market Psychology, etc.)
              </p>
            </div>
            <div>
              <div className="font-semibold text-blue-600 mb-1">🔵 Sub-Dimensions</div>
              <p className="text-muted-foreground">
                40 analytical areas grouped under dimensions
              </p>
            </div>
            <div>
              <div className="font-semibold text-green-600 mb-1">🟢 Aspects</div>
              <p className="text-muted-foreground">
                80 specific metrics and indicators
              </p>
            </div>
            <div>
              <div className="font-semibold text-yellow-600 mb-1">🟡 Sub-Aspects</div>
              <p className="text-muted-foreground">
                173 raw data points (actual scoring units)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chart Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="font-semibold mb-1">📊 Multi-View Analysis</div>
              <p className="text-muted-foreground">
                Toggle between area and line charts for different perspectives
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">⏱️ Time Range Selection</div>
              <p className="text-muted-foreground">
                View trends over 7D, 30D, 90D, 1Y, or all-time periods
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">📈 Statistics & Coefficients</div>
              <p className="text-muted-foreground">
                See current scores, changes, and ML coefficient weights
              </p>
            </div>
            <div>
              <div className="font-semibold mb-1">🎯 Hierarchical Drill-Down</div>
              <p className="text-muted-foreground">
                Navigate from dimensions down to individual sub-aspects
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How to Use */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Badge className="mt-0.5 flex-shrink-0">1</Badge>
              <span>
                Click on the <strong>"Hierarchy Browser"</strong> tab to explore all available nodes
              </span>
            </li>
            <li className="flex gap-3">
              <Badge className="mt-0.5 flex-shrink-0">2</Badge>
              <span>
                Use the <strong>level tabs</strong> to filter by Dimensions, Sub-Dimensions, Aspects, or
                Sub-Aspects
              </span>
            </li>
            <li className="flex gap-3">
              <Badge className="mt-0.5 flex-shrink-0">3</Badge>
              <span>
                <strong>Search</strong> by name to quickly find nodes (supports both English and Persian)
              </span>
            </li>
            <li className="flex gap-3">
              <Badge className="mt-0.5 flex-shrink-0">4</Badge>
              <span>
                Click on any node to view its <strong>trend chart</strong> and statistics
              </span>
            </li>
            <li className="flex gap-3">
              <Badge className="mt-0.5 flex-shrink-0">5</Badge>
              <span>
                Use the <strong>time range buttons</strong> to adjust the chart timeframe
              </span>
            </li>
            <li className="flex gap-3">
              <Badge className="mt-0.5 flex-shrink-0">6</Badge>
              <span>
                Toggle between <strong>Area</strong> and <strong>Line</strong> views for different perspectives
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default HierarchyAnalysisPage;

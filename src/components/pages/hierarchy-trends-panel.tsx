'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { HierarchyTrendsChart } from '../hierarchy-trends-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface TrendDataPoint {
  date: string;
  timestamp?: number;
  score: number;
  coefficient: number;
  volatility?: number;
  coinCount?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface HierarchyNode {
  key: string;
  name: string;
  nameFa?: string;
  color?: string;
  level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect';
  children?: HierarchyNode[];
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

const LEVEL_COLORS = {
  'dimension': '#ef4444',
  'sub-dimension': '#3b82f6',
  'aspect': '#22c55e',
  'sub-aspect': '#f59e0b',
};

export const HierarchyTrendsPanel: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect'>(
    'dimension'
  );
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hierarchyNodes, setHierarchyNodes] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [daysRange, setDaysRange] = useState(90);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch hierarchy nodes from market overview
  useEffect(() => {
    const fetchHierarchyNodes = async () => {
      try {
        const response = await fetch('/api/market/overview');
        if (!response.ok) throw new Error('Failed to fetch market overview');

        const { hierarchy } = await response.json();
        if (hierarchy) {
          setHierarchyNodes(hierarchy);
          // Select first dimension by default
          if (hierarchy.length > 0) {
            setSelectedNode({
              ...hierarchy[0],
              level: 'dimension',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching hierarchy nodes:', error);
      }
    };

    fetchHierarchyNodes();
  }, []);

  // Fetch trend data when node or date range changes
  useEffect(() => {
    if (!selectedNode) return;

    const fetchTrendData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          nodeKey: selectedNode.key,
          level: selectedLevel,
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
  }, [selectedNode, selectedLevel, daysRange]);

  const toggleNodeExpanded = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectNode = (node: HierarchyNode, level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect') => {
    setSelectedNode(node);
    setSelectedLevel(level);
  };

  // Filter nodes based on search
  const filteredNodes = hierarchyNodes.filter((node) =>
    node.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (node.nameFa && node.nameFa.includes(searchFilter))
  );

  // Render hierarchy tree with expandable nodes
  const renderHierarchyTree = (nodes: HierarchyNode[], level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect') => {
    return (
      <div className="space-y-2">
        {nodes.map((node) => (
          <div key={node.key} className="space-y-1">
            <div
              className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                selectedNode?.key === node.key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              onClick={() => handleSelectNode(node, level)}
            >
              {node.children && node.children.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNodeExpanded(node.key);
                  }}
                  className="p-1"
                >
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform ${
                      expandedNodes.has(node.key) ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
              )}
              {!node.children && <div className="w-6" />}

              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: node.color || LEVEL_COLORS[level] }}
              />

              <div className="flex-1">
                <div className="font-medium text-sm">{node.name}</div>
                {node.nameFa && (
                  <div className="text-xs text-muted-foreground">{node.nameFa}</div>
                )}
              </div>

              <Badge variant="outline" className="text-xs">
                {level}
              </Badge>
            </div>

            {expandedNodes.has(node.key) && node.children && node.children.length > 0 && (
              <div className="ml-6 space-y-1 border-l border-muted pl-4">
                {renderHierarchyTree(node.children, 
                  level === 'dimension' ? 'sub-dimension' : 
                  level === 'sub-dimension' ? 'aspect' : 
                  'sub-aspect'
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="visualization" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visualization">Trends Chart</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy Browser</TabsTrigger>
        </TabsList>

        {/* Trends Visualization Tab */}
        <TabsContent value="visualization" className="space-y-4 mt-4">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedNode.color || LEVEL_COLORS[selectedLevel] }}
                  />
                  <h2 className="text-2xl font-bold">{selectedNode.name}</h2>
                  <Badge variant="secondary">{selectedLevel}</Badge>
                </div>
                {selectedNode.nameFa && (
                  <p className="text-sm text-muted-foreground">{selectedNode.nameFa}</p>
                )}
              </div>

              <HierarchyTrendsChart
                title={selectedNode.name}
                subtitle={selectedNode.nameFa}
                data={trendData}
                level={selectedLevel}
                color={selectedNode.color || LEVEL_COLORS[selectedLevel]}
                showCoefficient={true}
                showVolatility={true}
                loading={loading}
                onDateRangeChange={setDaysRange}
                height={500}
              />
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">Select a hierarchy node from the browser to view trends</p>
            </div>
          )}
        </TabsContent>

        {/* Hierarchy Browser Tab */}
        <TabsContent value="hierarchy" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hierarchy Browser</CardTitle>
              <CardDescription>
                Browse and select dimensions, sub-dimensions, aspects, and sub-aspects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div>
                <Input
                  placeholder="Search by name (English or Persian)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Level Tabs */}
              <Tabs value={selectedLevel} onValueChange={(v: any) => setSelectedLevel(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dimension">Dimensions</TabsTrigger>
                  <TabsTrigger value="sub-dimension">Sub-Dim</TabsTrigger>
                  <TabsTrigger value="aspect">Aspects</TabsTrigger>
                  <TabsTrigger value="sub-aspect">Sub-Asp</TabsTrigger>
                </TabsList>

                {selectedLevel === 'dimension' && (
                  <div className="mt-4 max-h-96 overflow-y-auto pr-4">
                    {renderHierarchyTree(filteredNodes, 'dimension')}
                  </div>
                )}

                {selectedLevel === 'sub-dimension' && selectedNode?.children && (
                  <div className="mt-4 max-h-96 overflow-y-auto pr-4">
                    {renderHierarchyTree(selectedNode.children, 'sub-dimension')}
                  </div>
                )}

                {selectedLevel === 'aspect' && 
                  selectedNode?.children?.flatMap(sd => sd.children || []).length! > 0 && (
                  <div className="mt-4 max-h-96 overflow-y-auto pr-4">
                    {renderHierarchyTree(
                      selectedNode.children?.flatMap(sd => sd.children || []) || [],
                      'aspect'
                    )}
                  </div>
                )}

                {selectedLevel === 'sub-aspect' && 
                  selectedNode?.children?.flatMap(sd => sd.children?.flatMap(a => a.children || []) || []).length! > 0 && (
                  <div className="mt-4 max-h-96 overflow-y-auto pr-4">
                    {renderHierarchyTree(
                      selectedNode.children?.flatMap(sd =>
                        sd.children?.flatMap(a => a.children || []) || []
                      ) || [],
                      'sub-aspect'
                    )}
                  </div>
                )}
              </Tabs>

              {/* Selected Node Info */}
              {selectedNode && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Selected Node</p>
                        <p className="font-semibold">{selectedNode.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Key</p>
                        <p className="font-mono text-sm">{selectedNode.key}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Level</p>
                        <Badge variant="secondary">{selectedLevel}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Data Points</p>
                        <p className="font-semibold">{trendData.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HierarchyTrendsPanel;

# Hierarchy Analysis - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HierarchyAnalysisPage (Main Dashboard)             │   │
│  │  ├─ Quick Stats Cards (4 hierarchy levels)          │   │
│  │  ├─ HierarchyTrendsPanel                            │   │
│  │  │  ├─ Visualization Tab                            │   │
│  │  │  │  └─ HierarchyTrendsChart                      │   │
│  │  │  └─ Hierarchy Browser Tab                        │   │
│  │  │     ├─ Search Input                              │   │
│  │  │     ├─ Level Tabs (Dim/SubDim/Aspect/SubAsp)    │   │
│  │  │     ├─ Expandable Tree Navigation                │   │
│  │  │     └─ Selection Details Panel                   │   │
│  │  ├─ Info Cards                                      │   │
│  │  └─ Usage Instructions                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TradingViewHierarchyPage (Integrated View)         │   │
│  │  ├─ TradingView Chart (Left 2/3)                    │   │
│  │  │  ├─ Symbol Selector                              │   │
│  │  │  └─ Live Price Action                            │   │
│  │  ├─ Sidebar (Right 1/3)                             │   │
│  │  │  ├─ Quick Select Buttons                         │   │
│  │  │  ├─ Time Range Selector                          │   │
│  │  │  └─ Current Selection Info                       │   │
│  │  └─ Full-width Trend Chart                          │   │
│  │     └─ HierarchyTrendsChart                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chart Components (Reusable)                         │   │
│  │  ├─ HierarchyTrendsChart (Full-featured)            │   │
│  │  └─ HierarchyTrendsChartOptimized (Performance)     │   │
│  │     ├─ Area Chart Mode                              │   │
│  │     ├─ Line Chart Mode                              │   │
│  │     ├─ Statistics Panel                             │   │
│  │     ├─ Time Range Controls                          │   │
│  │     └─ Responsive Sizing                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Triggers API Calls
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    HTTP API LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GET /api/hierarchy/trends                                  │
│  ├─ Parameters                                              │
│  │  ├─ nodeKey: string (dimension/subdim/aspect/subaspect) │
│  │  ├─ level: 'dimension'|'sub-dimension'|'aspect'|       │
│  │  │         'sub-aspect'                                 │
│  │  ├─ days: number (default: 90)                          │
│  │  └─ limit: number (default: 1000, max: 10000)          │
│  │                                                          │
│  └─ Response Format                                         │
│     ├─ data: TrendDataPoint[]                              │
│     │  ├─ date: string (YYYY-MM-DD)                        │
│     │  ├─ score: number (1-10)                             │
│     │  ├─ coefficient: number (ML weight)                  │
│     │  ├─ volatility: number (std deviation)               │
│     │  ├─ coinCount: number                                │
│     │  └─ trend: 'up'|'down'|'stable'                      │
│     └─ metadata: { nodeKey, level, daysRequested, ... }    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Query Aggregation
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PRIMARY SOURCE: MarketIndicatorDaily                        │
│  ├─ Pre-aggregated daily averages                           │
│  ├─ Fast query performance (<200ms)                         │
│  ├─ Structure:                                              │
│  │  ├─ date: Date                                          │
│  │  ├─ hierarchyNodeId: int (FK)                           │
│  │  ├─ averageScore: float (1-10)                          │
│  │  ├─ coefficient: float (0-1)                            │
│  │  ├─ volatility: float (std dev)                         │
│  │  └─ numCoinsIncluded: int                               │
│  │                                                          │
│  └─ Query: Filter by nodeKey/level and date range           │
│                                                               │
│  FALLBACK SOURCE: ScoreHistory (if no MarketIndicatorDaily) │
│  ├─ Per-coin per-node scores                               │
│  ├─ Real-time calculations                                 │
│  ├─ Structure:                                              │
│  │  ├─ date: Date                                          │
│  │  ├─ coinId: string                                      │
│  │  ├─ hierarchyNodeId: int (FK)                           │
│  │  ├─ score: float (1-10)                                 │
│  │  └─ coefficient: float (0-1)                            │
│  │                                                          │
│  └─ Query: Fetch records, aggregate by date                 │
│                                                               │
│  REFERENCE DATA: HierarchyNode                              │
│  ├─ id: int (Primary key)                                  │
│  ├─ key: string (Unique identifier)                        │
│  ├─ name: string                                           │
│  ├─ level: string (dimension|sub-dimension|aspect|...)    │
│  ├─ parentId: int (FK for tree structure)                  │
│  └─ 305 total nodes (12+40+80+173)                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
1. USER INTERACTION
   ┌──────────────────────────┐
   │ Select Hierarchy Node    │
   │ (e.g., "Fundamental")    │
   └──────────┬───────────────┘
              ↓

2. COMPONENT STATE UPDATE
   ┌──────────────────────────┐
   │ Set selectedNode         │
   │ Set selectedLevel        │
   │ Set dateRange            │
   └──────────┬───────────────┘
              ↓

3. EFFECT TRIGGER
   ┌──────────────────────────┐
   │ useEffect dependency     │
   │ Build query params       │
   │ Trigger API call         │
   └──────────┬───────────────┘
              ↓

4. API REQUEST
   GET /api/hierarchy/trends
   ?nodeKey=fundamental
   &level=dimension
   &days=90
   └──────────┬───────────────┘
              ↓

5. DATABASE QUERY
   ┌─────────────────────────────┐
   │ Query MarketIndicatorDaily  │
   │ WHERE hierarchyNode.key='fundamental' │
   │ AND level='dimension'       │
   │ AND date >= NOW() - 90 days │
   │ ORDER BY date ASC           │
   └──────────┬───────────────────┘
              ↓

6. DATA AGGREGATION
   ┌────────────────────────────────┐
   │ If no MarketIndicatorDaily:    │
   │   Query ScoreHistory           │
   │   Group by date                │
   │   Calculate averages           │
   │   Calculate statistics         │
   │   Format response              │
   └──────────┬─────────────────────┘
              ↓

7. API RESPONSE
   ┌──────────────────────────┐
   │ {                        │
   │   data: [90 points],     │
   │   metadata: {...}        │
   │ }                        │
   └──────────┬───────────────┘
              ↓

8. COMPONENT RECEIVES DATA
   ┌──────────────────────────┐
   │ Update trendData state   │
   │ Recalculate statistics   │
   │ Trigger re-render        │
   └──────────┬───────────────┘
              ↓

9. CHART RENDERING
   ┌──────────────────────────┐
   │ ResponsiveContainer      │
   │ ├─ AreaChart/LineChart   │
   │ ├─ XAxis (dates)         │
   │ ├─ YAxis (scores 1-10)   │
   │ ├─ Area/Line (score)     │
   │ ├─ Area/Line (coeff)     │
   │ ├─ Tooltip               │
   │ └─ Legend                │
   └──────────┬───────────────┘
              ↓

10. DISPLAY TO USER
    ┌────────────────────────────────┐
    │ ✓ Rendered Chart               │
    │ ✓ Statistics Panel              │
    │ ✓ Time Range Controls           │
    │ ✓ Recent Data Points            │
    └────────────────────────────────┘
```

## Component Hierarchy

```
src/
├── app/
│   ├── page.tsx (Main Page Router)
│   │   ├─ Dynamic Import: HierarchyAnalysisPage
│   │   └─ Dynamic Import: TradingViewHierarchyPage
│   │
│   └── api/
│       └── hierarchy/
│           └── trends/
│               └── route.ts (GET Handler)
│
└── components/
    ├── hierarchy-trends-chart.tsx (Main Chart)
    │   ├─ Props: title, data, level, color, height, ...
    │   └─ Features: Area/Line, Time Range, Stats
    │
    ├── hierarchy-trends-chart-optimized.tsx (Performance)
    │   └─ Optimizations: Memoization, No Animation
    │
    └── pages/
        ├── hierarchy-trends-panel.tsx (Browser + Chart)
        │   ├─ Tabs: Visualization | Hierarchy Browser
        │   ├─ Tree Navigation: Expandable hierarchy
        │   ├─ Search: English + Persian
        │   └─ Selection: Details panel
        │
        ├── hierarchy-analysis-page.tsx (Dashboard)
        │   ├─ Stats Cards: 4 hierarchy levels
        │   ├─ HierarchyTrendsPanel
        │   ├─ Info Cards: Structure + Features
        │   └─ Instructions: How to use
        │
        └── tradingview-hierarchy-page.tsx (Integrated)
            ├─ Layout: 2/3 Price + 1/3 Sidebar
            ├─ TradingViewWidget: Price chart
            ├─ Sidebar: Node selector + controls
            ├─ Chart: Full-width trends
            └─ Tips: Correlation analysis
```

## State Management Flow

```
┌─────────────────────────────────────────────┐
│ HierarchyTrendsPanel Component              │
├─────────────────────────────────────────────┤
│                                              │
│ State:                                       │
│ ├─ selectedLevel: 'dimension'|... (string) │
│ ├─ selectedNode: HierarchyNode | null      │
│ ├─ trendData: TrendDataPoint[] (array)     │
│ ├─ loading: boolean                         │
│ ├─ hierarchyNodes: HierarchyNode[] (array) │
│ ├─ expandedNodes: Set<string>              │
│ ├─ daysRange: number                        │
│ └─ searchFilter: string                     │
│                                              │
│ Effects:                                     │
│ ├─ useEffect: Fetch hierarchy nodes         │
│ │  └─ Triggered on mount                    │
│ │     └─ Updates hierarchyNodes state       │
│ │        └─ Selects first dimension by def. │
│ │                                           │
│ └─ useEffect: Fetch trend data              │
│    └─ Triggered when:                       │
│       ├─ selectedNode changes               │
│       ├─ selectedLevel changes              │
│       └─ daysRange changes                  │
│       └─ API call: GET /api/hierarchy/trends│
│          └─ Updates trendData state         │
│             └─ Triggers chart re-render     │
│                                              │
│ Callbacks:                                   │
│ ├─ handleSelectNode(node, level)            │
│ │  └─ Updates selectedNode & selectedLevel  │
│ │                                            │
│ ├─ toggleNodeExpanded(nodeKey)              │
│ │  └─ Updates expandedNodes Set             │
│ │                                            │
│ └─ filterNodes (computed)                   │
│    └─ Filters by searchFilter               │
│                                              │
└─────────────────────────────────────────────┘
```

## Styling & Theme

```
Colors (Tailwind CSS):
├─ Dimensions: #ef4444 (red-500)
├─ Sub-Dimensions: #3b82f6 (blue-500)
├─ Aspects: #22c55e (green-500)
└─ Sub-Aspects: #f59e0b (amber-500)

Component Theme:
├─ Card: CardHeader + CardContent
├─ Buttons: variant="default" | variant="outline"
├─ Badges: variant="outline" | variant="secondary"
├─ Tabs: TabsList + TabsContent
├─ Skeleton: For loading states
└─ Responsive: Tailwind grid system

Breakpoints:
├─ Mobile: <640px
├─ Tablet: 640px-1024px
├─ Desktop: >1024px
└─ Large: >1280px
```

## Error Handling

```
API Layer:
├─ 400: Missing/invalid parameters
│  └─ Response: { error: 'Missing required params...' }
│
├─ 500: Database/processing error
│  └─ Response: { error: 'Failed to fetch...', details: {...} }
│
└─ Network errors: Caught in useEffect

UI Layer:
├─ No data: Show "No data available" message
├─ Loading: Show loading spinner
├─ Error: Show error message with retry option
└─ Invalid node: Fallback to first node

Fallback Strategy:
├─ If MarketIndicatorDaily empty: Query ScoreHistory
├─ If both empty: Return empty data array
└─ Frontend: Show empty state with guidance
```

## Performance Optimization

```
Client-Side:
├─ Code Splitting: Dynamic imports (no SSR)
├─ Memoization: useMemo for statistics
├─ Memoization: useCallback for handlers
├─ Component Props: Optimized version available
├─ Chart Settings: No animations by default
├─ Data Limits: Default 90 days
└─ Responsive: ResizeObserver integration

Server-Side:
├─ Database: Pre-aggregated MarketIndicatorDaily
├─ Caching: 3-minute in-memory cache
├─ Indexing: Indexes on hierarchyNode.key + date
├─ Aggregation: Server-side (not client)
├─ Pagination: Support via limit parameter
└─ Query Optimization: WHERE + ORDER + LIMIT

Network:
├─ JSON Response: ~5-20KB (90 days of data)
├─ Gzip Compression: Enabled (reduces ~70%)
├─ Request Time: <200ms average
├─ Timeouts: 30 second default
└─ Retry: Exponential backoff (optional)
```

## Database Queries

```
PRIMARY QUERY (MarketIndicatorDaily):
────────────────────────────────────────
SELECT 
  date,
  averageScore as score,
  coefficient,
  volatility,
  numCoinsIncluded as coinCount
FROM MarketIndicatorDaily mid
INNER JOIN HierarchyNode hn ON mid.hierarchyNodeId = hn.id
WHERE hn.key = $1
  AND hn.level = $2
  AND mid.date >= NOW() - ($3 || ' days')::interval
ORDER BY mid.date ASC
LIMIT $4

Performance: ~50-100ms

FALLBACK QUERY (ScoreHistory):
──────────────────────────────
SELECT 
  date,
  score,
  coefficient
FROM ScoreHistory sh
INNER JOIN HierarchyNode hn ON sh.hierarchyNodeId = hn.id
WHERE hn.key = $1
  AND hn.level = $2
  AND sh.date >= NOW() - ($3 || ' days')::interval
ORDER BY sh.date ASC, sh.coinId ASC

Aggregation (in app code):
- Group by date
- Calculate: average(score), average(coefficient), stddev(score)
- Determine trend: score > 5.5 ? 'up' : score < 4.5 ? 'down' : 'stable'

Performance: ~150-300ms (depending on data size)
```

This architecture provides scalability, maintainability, and performance while keeping the codebase clean and modular.

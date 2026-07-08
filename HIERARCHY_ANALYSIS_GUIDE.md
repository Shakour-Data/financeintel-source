# Hierarchy Analysis Features Guide

## Overview

The Hierarchy Analysis system provides comprehensive trend visualization for all four levels of the FinanceIntel scoring hierarchy:

- **Dimensions** (12): Top-level analytical categories
- **Sub-Dimensions** (40): Specialized analytical areas
- **Aspects** (80): Specific metrics and indicators
- **Sub-Aspects** (173): Individual raw data points

## Components

### 1. HierarchyTrendsChart
**File**: `src/components/hierarchy-trends-chart.tsx`

The main chart component for displaying trend analysis with:
- Area and line chart visualization modes
- Time range selection (7D, 30D, 90D, 1Y, ALL)
- Real-time statistics (current, change %, min, max, average)
- Coefficient overlay for ML weight tracking
- Responsive design with Tailwind CSS

**Props**:
```typescript
interface HierarchyTrendsChartProps {
  title: string;
  subtitle?: string;
  data: TrendDataPoint[];
  level: 'dimension' | 'sub-dimension' | 'aspect' | 'sub-aspect';
  color?: string;
  height?: number;
  showCoefficient?: boolean;
  showVolatility?: boolean;
  onDateRangeChange?: (days: number) => void;
  loading?: boolean;
}
```

### 2. HierarchyTrendsChartOptimized
**File**: `src/components/hierarchy-trends-chart-optimized.tsx`

Performance-optimized version with:
- Memoized statistics calculations
- Custom optimized tooltip
- Disabled animations for performance
- Improved rendering efficiency
- Recommended for high-volume data scenarios

### 3. HierarchyTrendsPanel
**File**: `src/components/pages/hierarchy-trends-panel.tsx`

Full-featured panel component with:
- Tabbed interface (Visualization & Hierarchy Browser)
- Hierarchical node browser with search
- Expandable tree navigation through all hierarchy levels
- Real-time trend data fetching
- Node selection and details display

**Features**:
- Multi-level hierarchy navigation
- Search by English name or Persian (Farsi) name
- Expand/collapse nodes to explore sub-levels
- Current selection info panel
- Statistics display for selected node

### 4. HierarchyAnalysisPage
**File**: `src/components/pages/hierarchy-analysis-page.tsx`

Complete standalone page with:
- Quick statistics cards for all hierarchy levels
- HierarchyTrendsPanel integration
- Educational content about hierarchy structure
- Usage instructions
- Chart feature documentation

### 5. TradingViewHierarchyPage
**File**: `src/components/pages/tradingview-hierarchy-page.tsx`

Integrated page combining:
- TradingView price chart
- Hierarchy trend analysis
- Symbol selection
- Correlation analysis tips
- Side-by-side visualization

## API Endpoints

### GET /api/hierarchy/trends

Fetch trend data for any hierarchy node.

**Query Parameters**:
- `nodeKey` (required): The unique key of the hierarchy node
- `level` (required): One of `dimension`, `sub-dimension`, `aspect`, `sub-aspect`
- `days` (optional): Number of days to retrieve (default: 90)
- `limit` (optional): Maximum data points to return (default: 1000, max: 10000)

**Example**:
```bash
GET /api/hierarchy/trends?nodeKey=fundamental&level=dimension&days=90
GET /api/hierarchy/trends?nodeKey=fund_valuation&level=sub-dimension&days=30
GET /api/hierarchy/trends?nodeKey=fund_val_mcap&level=aspect&days=365
```

**Response**:
```json
{
  "data": [
    {
      "date": "2026-07-01",
      "score": 6.5,
      "coefficient": 0.85,
      "volatility": 0.23,
      "coinCount": 200,
      "trend": "up"
    }
  ],
  "metadata": {
    "nodeKey": "fundamental",
    "level": "dimension",
    "daysRequested": 90,
    "pointsReturned": 90,
    "source": "market-indicator-daily"
  }
}
```

## Data Structure

### TrendDataPoint
```typescript
interface TrendDataPoint {
  date: string;              // YYYY-MM-DD format
  timestamp?: number;        // Unix timestamp (optional)
  score: number;            // 1-10 scale
  coefficient: number;       // ML weight (typically 0-1)
  volatility?: number;      // Standard deviation of scores
  coinCount?: number;       // Number of coins analyzed
  trend?: 'up' | 'down' | 'stable';  // Trend direction
}
```

## Usage Examples

### Basic Chart Display
```tsx
import { HierarchyTrendsChart } from '@/components/hierarchy-trends-chart';

export function MyComponent() {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  
  useEffect(() => {
    fetch('/api/hierarchy/trends?nodeKey=fundamental&level=dimension&days=90')
      .then(r => r.json())
      .then(result => setData(result.data));
  }, []);

  return (
    <HierarchyTrendsChart
      title="Fundamental Analysis"
      data={data}
      level="dimension"
      color="#ef4444"
    />
  );
}
```

### Full Hierarchy Browser
```tsx
import { HierarchyTrendsPanel } from '@/components/pages/hierarchy-trends-panel';

export function MyPage() {
  return <HierarchyTrendsPanel />;
}
```

### Analysis Page
```tsx
import { HierarchyAnalysisPage } from '@/components/pages/hierarchy-analysis-page';

export function AnalysisRoute() {
  return <HierarchyAnalysisPage />;
}
```

## Color Coding

The hierarchy uses consistent color coding:

| Level | Color | Hex Code |
|-------|-------|----------|
| Dimensions | Red | #ef4444 |
| Sub-Dimensions | Blue | #3b82f6 |
| Aspects | Green | #22c55e |
| Sub-Aspects | Amber | #f59e0b |

## Hierarchy Structure

### 12 Dimensions

1. **Fundamental Analysis** (#ef4444) - Valuation, blockchain metrics, supply dynamics
2. **Technical Analysis** (#3b82f6) - Price action, chart patterns, momentum
3. **On-Chain & Microstructure** (#22c55e) - Network activity, transaction patterns
4. **Market Psychology** (#f59e0b) - Investor sentiment, market cycles
5. **News & Sentiment** (#8b5cf6) - News analysis, social signals
6. **Macroeconomic** (#a855f7) - Global economic indicators
7. **Regulatory & Legal** (#94a3b8) - Compliance, regulatory status
8. **Network Security** (#ea580c) - Security audits, vulnerabilities
9. **Derivatives & Funding** (#06b6d4) - Futures, options, funding rates
10. **Whale & Smart Money** (#1e40af) - Large holder activity
11. **Ecosystem & DeFi** (#10b981) - Ecosystem health, DeFi metrics
12. **Inter-Market Correlation** (#64748b) - Cross-market relationships

## Performance Optimization

### Recommendations

1. **Use Optimized Version** for large datasets (>365 days)
   - Disable animations: `isAnimationActive={false}`
   - Use memoized components
   - Limit data points with `limit` parameter

2. **Pagination Strategy**
   - Default 90 days for quick load times
   - User can expand to full range on demand
   - Server-side aggregation for large date ranges

3. **Caching**
   - API responses cached at 3-minute intervals
   - Browser-level caching with React Query (if integrated)
   - Consider IndexedDB for offline data access

4. **Chart Rendering**
   - ResponsiveContainer handles resize efficiently
   - Recharts provides built-in performance optimizations
   - Disable unnecessary chart features (dots, tooltips when not visible)

## Integration Steps

### 1. Add to Dashboard
```tsx
// In src/app/page.tsx
const HierarchyAnalysisPage = dynamic(
  () => import('@/components/pages/hierarchy-analysis-page')
    .then(m => ({ default: m.HierarchyAnalysisPage })),
  { ssr: false }
);
```

### 2. Add Navigation Entry
```tsx
// In src/components/dashboard-sidebar.tsx
{
  key: 'hierarchy-analysis',
  label: 'Hierarchy Analysis',
  icon: TrendingUp,
  description: 'View hierarchy trends'
}
```

### 3. Add Route
```tsx
// In src/lib/site-router.tsx
export type PageKey = 
  | ... existing pages ...
  | 'hierarchy-analysis'
  | 'tradingview-hierarchy';
```

## API Implementation Details

The API endpoint (`/api/hierarchy/trends`) works with two data sources:

1. **MarketIndicatorDaily Table** (Primary)
   - Pre-aggregated daily averages
   - Fast queries
   - Updated daily

2. **ScoreHistory Table** (Fallback)
   - Per-coin per-node scores
   - Real-time calculations
   - Slower but comprehensive

The API automatically falls back to ScoreHistory if MarketIndicatorDaily doesn't have data for a specific node.

## Troubleshooting

### No Data Returned
- Verify `nodeKey` is correct (check hierarchy structure)
- Ensure `level` parameter matches the node's actual level
- Check if date range includes available data

### Performance Issues
- Reduce `days` parameter
- Use `limit` parameter to cap data points
- Switch to optimized version of component
- Enable browser dev tools Performance tab

### Chart Not Rendering
- Verify `data` array is not empty
- Check `height` prop is sufficient
- Ensure ResponsiveContainer parent has defined width
- Verify Recharts is properly installed

## Future Enhancements

- [ ] Predictive trend analysis
- [ ] Anomaly detection
- [ ] Multi-node comparison charts
- [ ] Export to CSV/PDF
- [ ] Custom alert thresholds
- [ ] Historical backtesting
- [ ] Correlation matrix visualization
- [ ] Real-time WebSocket updates

## References

- Recharts Documentation: https://recharts.org/
- React Hooks: https://react.dev/reference/react/hooks
- Tailwind CSS: https://tailwindcss.com/
- FinanceIntel Hierarchy: See `src/lib/scoring-engine-v2.ts`

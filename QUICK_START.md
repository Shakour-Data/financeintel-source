# Quick Start: Hierarchy Analysis Integration

## Overview
You've just received complete hierarchy analysis features with trend charts for all 4 levels of FinanceIntel's scoring system.

## What You Get

### 📦 Components
- ✅ `HierarchyTrendsChart` - Main chart component
- ✅ `HierarchyTrendsChartOptimized` - Performance version
- ✅ `HierarchyTrendsPanel` - Full browser + visualization
- ✅ `HierarchyAnalysisPage` - Standalone analysis page
- ✅ `TradingViewHierarchyPage` - TradingView integration

### 📡 API
- ✅ `GET /api/hierarchy/trends` - Trend data endpoint

### 📚 Documentation
- ✅ `HIERARCHY_ANALYSIS_GUIDE.md` - Complete guide
- ✅ `IMPLEMENTATION_SUMMARY.md` - Technical details

---

## 🚀 Quick Integration (5 minutes)

### Option A: Add as New Page (Recommended)

1. **Register Route** (`src/lib/site-router.tsx`):
```typescript
export type PageKey =
  | 'home'
  | 'dashboard'
  // ... existing pages ...
  | 'hierarchy-analysis';  // ADD THIS

const HASH_MAP: Record<string, PageKey> = {
  // ... existing ...
  'hierarchy-analysis': 'hierarchy-analysis',  // ADD THIS
};

const PAGE_HASH: Record<PageKey, string> = {
  // ... existing ...
  'hierarchy-analysis': 'hierarchy-analysis',  // ADD THIS
};

export const PAGE_META: Record<PageKey, { title: string; description: string }> = {
  // ... existing ...
  'hierarchy-analysis': {
    title: 'Hierarchy Analysis — FinanceIntel',
    description: 'Explore trend analysis for dimensions, sub-dimensions, aspects, and sub-aspects',
  },
};
```

2. **Add Sidebar Navigation** (`src/components/dashboard-sidebar.tsx`):
```typescript
// At top, add import
import { TrendingUp } from 'lucide-react';

// In ANALYTICS_ITEMS (or create a new ANALYSIS_ITEMS), add:
{
  key: 'hierarchy-analysis',
  label: 'Hierarchy Analysis',
  icon: TrendingUp,
  description: 'Trend analysis for 4 hierarchy levels'
}
```

3. **Add Rendering Logic** (`src/app/page.tsx`):
```typescript
// Check your current rendering logic, then add:
case 'hierarchy-analysis':
  return <HierarchyAnalysisPage />;
```

### Option B: Add as Dashboard Tab

If you prefer it as a dashboard tab instead of a separate page:

1. Add to `DashboardTab` type in `site-router.tsx`:
```typescript
export type DashboardTab =
  | ... existing tabs ...
  | 'hierarchy-analysis';
```

2. Add to `TAB_INDEX` and `TAB_META`

3. Render in dashboard view

---

## 📊 Basic Usage Examples

### Show All Hierarchy Trends
```tsx
import { HierarchyAnalysisPage } from '@/components/pages/hierarchy-analysis-page';

export default function MyPage() {
  return <HierarchyAnalysisPage />;
}
```

### Specific Node Trends
```tsx
import { HierarchyTrendsChart } from '@/components/hierarchy-trends-chart';
import { useEffect, useState } from 'react';

export function MyComponent() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/hierarchy/trends?nodeKey=fundamental&level=dimension&days=90')
      .then(r => r.json())
      .then(result => setData(result.data));
  }, []);

  return (
    <HierarchyTrendsChart
      title="Fundamental Analysis Trends"
      data={data}
      level="dimension"
      color="#ef4444"
    />
  );
}
```

### TradingView Integration
```tsx
import { TradingViewHierarchyPage } from '@/components/pages/tradingview-hierarchy-page';

export default function TradingViewPage() {
  return <TradingViewHierarchyPage />;
}
```

---

## 🔍 API Usage

### Fetch Dimension Trends
```bash
curl "http://localhost:3000/api/hierarchy/trends?nodeKey=fundamental&level=dimension&days=90"
```

### Fetch Sub-Aspect Trends
```bash
curl "http://localhost:3000/api/hierarchy/trends?nodeKey=fund_val_mcap_size&level=sub-aspect&days=30"
```

### Response Example
```json
{
  "data": [
    {
      "date": "2026-07-08",
      "score": 6.5,
      "coefficient": 0.85,
      "volatility": 0.23,
      "coinCount": 200,
      "trend": "up"
    },
    {
      "date": "2026-07-07",
      "score": 6.3,
      "coefficient": 0.83,
      "volatility": 0.25,
      "coinCount": 200,
      "trend": "stable"
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

---

## 🎯 File Locations

```
✅ Created Files:
src/components/
  ├── hierarchy-trends-chart.tsx (350 lines)
  ├── hierarchy-trends-chart-optimized.tsx (380 lines)
  └── pages/
      ├── hierarchy-analysis-page.tsx (250 lines)
      ├── hierarchy-trends-panel.tsx (450 lines)
      └── tradingview-hierarchy-page.tsx (350 lines)

src/app/api/
  └── hierarchy/
      └── trends/
          └── route.ts (160 lines)

Documentation/
  ├── HIERARCHY_ANALYSIS_GUIDE.md
  ├── IMPLEMENTATION_SUMMARY.md
  └── QUICK_START.md (this file)

Modified Files:
  └── src/app/page.tsx (added dynamic imports)
```

---

## 🧪 Testing

### Quick Test
1. Go to `http://localhost:3000/api/hierarchy/trends?nodeKey=fundamental&level=dimension&days=7`
2. Should return JSON with trend data

### Component Test
```tsx
// Create test file in your test directory
import { HierarchyTrendsChart } from '@/components/hierarchy-trends-chart';

const mockData = [
  { date: '2026-07-01', score: 6.0, coefficient: 0.8, volatility: 0.2 },
  { date: '2026-07-02', score: 6.2, coefficient: 0.82, volatility: 0.19 },
];

render(
  <HierarchyTrendsChart
    title="Test Chart"
    data={mockData}
    level="dimension"
  />
);
```

---

## 🎨 Customization

### Change Colors
```tsx
<HierarchyTrendsChart
  title="My Title"
  data={data}
  level="dimension"
  color="#custom-color"  // Override default
/>
```

### Adjust Chart Height
```tsx
<HierarchyTrendsChart
  // ...
  height={600}  // Default is 400
/>
```

### Show/Hide Coefficient
```tsx
<HierarchyTrendsChart
  // ...
  showCoefficient={false}  // Hide coefficient line
/>
```

---

## 📈 Supported Hierarchy Levels

### Node Keys by Level

#### Dimensions (12)
- fundamental
- technical
- onchain
- market_psych
- news_sentiment
- macroeconomic
- regulatory
- network_security
- derivatives
- whale_smart_money
- ecosystem_defi
- inter_market_correlation

#### Sub-Dimensions, Aspects, Sub-Aspects
Use the HierarchyTrendsPanel browser to discover available keys, or check `src/lib/scoring-engine-v2.ts`

---

## ⚡ Performance Tips

1. **For 365+ days**: Use `HierarchyTrendsChartOptimized`
2. **For real-time**: Implement React Query with 3-min cache
3. **For mobile**: Disable animations and reduce height
4. **For multiple charts**: Use pagination with `limit` parameter

---

## 🐛 Troubleshooting

### API returns 400 error
- Check `nodeKey` is valid (case-sensitive)
- Verify `level` is one of: `dimension`, `sub-dimension`, `aspect`, `sub-aspect`

### Chart not rendering
- Verify data array is not empty: `data.length > 0`
- Check parent container has defined width
- Ensure Recharts is installed

### No data returned
- Use shorter date range (default is 90 days)
- Verify node exists in hierarchy
- Check database has MarketIndicatorDaily data

---

## 📞 Support

For detailed information, see:
- **User Guide**: `HIERARCHY_ANALYSIS_GUIDE.md`
- **Technical Details**: `IMPLEMENTATION_SUMMARY.md`

---

## 🎉 You're Done!

Your hierarchy analysis feature is ready to use. Choose integration option A or B above and you're set to go.

**What You Have:**
- 5 new React components
- 1 new API endpoint
- Full trend visualization
- Comprehensive documentation
- Production-ready code

**Next Steps:**
1. Integrate routing (5 min)
2. Test with your data
3. Collect user feedback
4. Plan enhancements

Enjoy! 🚀

---

*Created: July 8, 2026*
*Ready to deploy: ✅ Yes*

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  Activity,
  Landmark,
  Globe,
  Cpu,
  BarChart3,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface NewsItem {
  sourceUrl: string;
  sourceName: string;
  title: string;
  snippet: string;
  publishedAt: string;
  sentimentScore: number;
  sentimentLabel: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  impactScore: number;
  impactCategory: string;
  autoSummary: string;
  relevantCoins: string[];
}

interface SentimentData {
  aggregateSentiment: number;
  sentimentDistribution: {
    very_positive: number;
    positive: number;
    neutral: number;
    negative: number;
    very_negative: number;
  };
  topImpactCategory: string;
  averageImpactScore: number;
  coinSpecificSentiment: Record<string, { score: number; count: number }>;
  articles: NewsItem[];
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SENTIMENT_CONFIG: Record<string, { label: string; labelFa: string; color: string; bgColor: string; icon: typeof TrendingUp }> = {
  very_positive: { label: 'Very Positive', labelFa: 'Very Positive', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/25', icon: TrendingUp },
  positive:      { label: 'Positive', labelFa: 'Positive', color: 'text-green-400', bgColor: 'bg-green-500/15 border-green-500/25', icon: TrendingUp },
  neutral:       { label: 'Neutral', labelFa: 'Neutral', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15 border-yellow-500/25', icon: Minus },
  negative:      { label: 'Negative', labelFa: 'Negative', color: 'text-orange-400', bgColor: 'bg-orange-500/15 border-orange-500/25', icon: TrendingDown },
  very_negative: { label: 'Very Negative', labelFa: 'Very Negative', color: 'text-red-400', bgColor: 'bg-red-500/15 border-red-500/25', icon: TrendingDown },
};

const CATEGORY_CONFIG: Record<string, { label: string; labelFa: string; icon: typeof Shield; color: string }> = {
  regulatory: { label: 'Regulatory', labelFa: 'Regulatory', icon: Landmark, color: '#8b5cf6' },
  technology: { label: 'Technology', labelFa: 'Technology', icon: Cpu, color: '#06b6d4' },
  market:     { label: 'Market', labelFa: 'Market', icon: BarChart3, color: '#3b82f6' },
  adoption:   { label: 'Adoption', labelFa: 'Adoption', icon: Globe, color: '#22c55e' },
  security:   { label: 'Security', labelFa: 'Security', icon: Shield, color: '#ef4444' },
  macro:      { label: 'Macro', labelFa: 'Macro', icon: Activity, color: '#f59e0b' },
};

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SentimentGauge({ score, size = 120 }: { score: number; size?: number }) {
  // score is -1 to +1, map to 0-100
  const pct = ((score + 1) / 2) * 100;
  const r = size / 2 - 8;
  const circumference = Math.PI * r;
  const progress = (pct / 100) * circumference;
  const color = pct > 65 ? '#22c55e' : pct > 45 ? '#eab308' : '#ef4444';

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size / 2 + 10} className="overflow-visible">
        <path
          d={`M 8 ${size / 2 + 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2 + 2}`}
          fill="none"
          stroke="hsl(var(--muted) / 0.4)"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <motion.path
          d={`M 8 ${size / 2 + 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2 + 2}`}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {(score * 100).toFixed(2)}
        </span>
        <span className="text-[9px] text-muted-foreground">Sentiment Score</span>
      </div>
    </div>
  );
}

function SentimentBar({ distribution }: { distribution: SentimentData['sentimentDistribution'] }) {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const segments = [
    { key: 'very_positive', value: distribution.very_positive, color: '#22c55e' },
    { key: 'positive', value: distribution.positive, color: '#4ade80' },
    { key: 'neutral', value: distribution.neutral, color: '#eab308' },
    { key: 'negative', value: distribution.negative, color: '#fb923c' },
    { key: 'very_negative', value: distribution.very_negative, color: '#ef4444' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {segments.map(seg => (
          <motion.div
            key={seg.key}
            className="rounded-full"
            style={{ backgroundColor: seg.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(seg.value / total) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        {segments.map(seg => (
          <span key={seg.key} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
            {seg.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ article, index }: { article: NewsItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sentiment = SENTIMENT_CONFIG[article.sentimentLabel] ?? SENTIMENT_CONFIG.neutral;
  const category = CATEGORY_CONFIG[article.impactCategory] ?? CATEGORY_CONFIG.market;
  const SentimentIcon = sentiment.icon;
  const CategoryIcon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        'rounded-lg border p-3 transition-colors cursor-pointer',
        'hover:bg-muted/20',
        article.sentimentScore > 0.3 ? 'border-emerald-500/10' :
        article.sentimentScore < -0.3 ? 'border-red-500/10' : 'border-border'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        {/* Sentiment indicator */}
        <div className={cn(
          'flex items-center justify-center w-7 h-7 rounded-md shrink-0 border',
          sentiment.bgColor
        )}>
          <SentimentIcon className={cn('w-3.5 h-3.5', sentiment.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-tight line-clamp-2">{article.title}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{article.sourceName}</span>
            {article.publishedAt && (
              <span className="text-[10px] text-muted-foreground">
                {formatTimeAgo(article.publishedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Impact badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border', sentiment.bgColor, sentiment.color)}>
            <CategoryIcon className="w-2.5 h-2.5 mr-0.5" style={{ color: category.color }} />
            {category.label}
          </Badge>
          <div className="flex items-center gap-0.5">
            <Zap className="w-2.5 h-2.5 text-muted-foreground" />
            <span className="text-[9px] font-mono text-muted-foreground">{article.impactScore.toFixed(2)}/10</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t space-y-2">
              {/* Auto Summary (Algorithmic NLP) */}
              {article.autoSummary && (
                <div className="flex items-start gap-2 bg-primary/5 rounded-md p-2">
                  <span className="text-[10px] text-primary font-bold shrink-0 mt-0.5">NLP</span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{article.autoSummary}</p>
                </div>
              )}

              {/* Snippet */}
              {article.snippet && (
                <p className="text-xs text-muted-foreground line-clamp-3">{article.snippet}</p>
              )}

              {/* Relevant Coins */}
              {article.relevantCoins.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] text-muted-foreground">Related:</span>
                  {article.relevantCoins.slice(0, 5).map(coin => (
                    <Badge key={coin} variant="secondary" className="text-[9px] px-1.5 py-0">
                      {coin.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Source link */}
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-2.5 h-2.5" />
                Read full article
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface NewsPanelProps {
  coinId?: string;
  coinName?: string;
}

export function NewsPanel({ coinId, coinName }: NewsPanelProps) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);  // Don't auto-load
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (coinId) params.set('coinId', coinId);
      if (coinName) params.set('coinName', coinName);

      const res = await fetch(`/api/news/sentiment?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch news');
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error ?? 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, [coinId, coinName]);

  useEffect(() => {
    if (isExpanded && !data && !loading) {
      fetchNews();
    }
  }, [isExpanded, data, loading, fetchNews]);

  // Filter articles
  const filteredArticles = (data?.articles ?? []).filter(a => {
    if (filterCategory && a.impactCategory !== filterCategory) return false;
    if (filterSentiment && a.sentimentLabel !== filterSentiment) return false;
    return true;
  });

  // Top mentioned coins
  const topCoins = data?.coinSpecificSentiment
    ? Object.entries(data.coinSpecificSentiment)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* ═══════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 px-1">
        <Newspaper className="w-5 h-5 text-purple-500" />
        <h2 className="text-lg font-bold tracking-tight">
          {coinId ? `${coinName ?? coinId} News` : 'Crypto News & Sentiment'}
        </h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-purple-500 hover:text-purple-400 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronDown className="w-4 h-4" />
              Hide News
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              Load News Analysis
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">NLP</Badge>
            </>
          )}
        </button>
        {isExpanded && (
          <button
            onClick={fetchNews}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* Collapsed preview when not expanded */}
      {!isExpanded && (
        <Card className="p-4 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Algorithmic sentiment analysis using NLP lexicon scoring</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>🟣 News Impact</span>
              <span>🟣 Social Sentiment</span>
              <span>🟣 Event Catalysts</span>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LOADING STATE
          ═══════════════════════════════════════════════════════════ */}
      {isExpanded && loading && !data && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          <p className="text-sm text-muted-foreground">Fetching & analyzing crypto news...</p>
          <p className="text-xs text-muted-foreground">Lexicon-based NLP Sentiment Analysis</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ERROR STATE
          ═══════════════════════════════════════════════════════════ */}
      {isExpanded && error && !data && (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <button
            onClick={fetchNews}
            className="text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════ */}
      {isExpanded && data && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ── Left: Sentiment Overview ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Sentiment Gauge */}
            <Card className="p-4 flex flex-col items-center border-purple-500/20 bg-purple-500/5">
              <SentimentGauge score={data.aggregateSentiment} />
              <div className="mt-2 text-center">
                <div className={cn(
                  'text-sm font-bold',
                  data.aggregateSentiment > 0.3 ? 'text-emerald-400' :
                  data.aggregateSentiment < -0.3 ? 'text-red-400' : 'text-yellow-400'
                )}>
                  {data.aggregateSentiment > 0.3 ? 'Bullish Sentiment' :
                   data.aggregateSentiment < -0.3 ? 'Bearish Sentiment' : 'Neutral Sentiment'}
                </div>
              </div>
            </Card>

            {/* Sentiment Distribution */}
            <Card className="p-4">
              <div className="text-xs font-semibold mb-3">Sentiment Distribution</div>
              <SentimentBar distribution={data.sentimentDistribution} />
              <div className="mt-3 text-xs text-muted-foreground">
                Avg Impact: <span className="font-mono font-medium text-foreground">{data.averageImpactScore.toFixed(2)}/10</span>
              </div>
            </Card>

            {/* Top Mentioned Coins */}
            {topCoins.length > 0 && (
              <Card className="p-4">
                <div className="text-xs font-semibold mb-3">Most Mentioned</div>
                <div className="space-y-2">
                  {topCoins.map(([coin, info]) => (
                    <div key={coin} className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase">{coin}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-[10px] font-mono',
                          info.score > 0.3 ? 'text-emerald-400' :
                          info.score < -0.3 ? 'text-red-400' : 'text-yellow-400'
                        )}>
                          {info.score > 0 ? '+' : ''}{(info.score * 100).toFixed(2)}
                        </span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {info.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ── Right: News Articles ── */}
          <div className="lg:col-span-3 space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              {/* Category filters */}
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const count = data.articles.filter(a => a.impactCategory === key).length;
                if (count === 0) return null;
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterCategory(filterCategory === key ? null : key)}
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors',
                      filterCategory === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label} ({count})
                  </button>
                );
              })}
              {/* Sentiment filter */}
              <div className="ml-2 w-px h-4 bg-border" />
              {['very_positive', 'positive', 'neutral', 'negative', 'very_negative'].map(key => {
                const cfg = SENTIMENT_CONFIG[key];
                const count = data.articles.filter(a => a.sentimentLabel === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterSentiment(filterSentiment === key ? null : key)}
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors',
                      filterSentiment === key
                        ? cn('border-current', cfg.color, cfg.bgColor)
                        : 'border-border hover:bg-muted/50 text-muted-foreground'
                    )}
                  >
                    {cfg.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Articles list */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No articles match the selected filters
                </div>
              ) : (
                filteredArticles.map((article, i) => (
                  <NewsCard key={article.sourceUrl} article={article} index={i} />
                ))
              )}
            </div>

            {/* Article count */}
            <div className="text-[10px] text-muted-foreground text-center">
              Showing {filteredArticles.length} of {data.articles.length} articles
              {data.articles.length > 0 && ' • Algorithmic NLP Sentiment Analysis'}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

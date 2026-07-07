'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Layers,
  Brain,
  TrendingUp,
  BarChart3,
  Activity,
  Newspaper,
  Globe,
  Scale,
  Shield,
  CandlestickChart,
  Fish,
  Zap,
  LineChart,
  Cpu,
  ChevronRight,
  ArrowRight,
  Code2,
  HelpCircle,
  CheckCircle2,
  FileText,
  Terminal,
  Sparkles,
  Target,
  Eye,
  Lightbulb,
  Workflow,
  GitBranch,
  Calculator,
  BookMarked,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DocsPageProps {
  onNavigate: (page: string) => void;
}

/* ──────────── Animation variants ──────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

/* ──────────── Data ──────────── */
const quickStartSteps = [
  {
    step: 1,
    title: 'Create Your Account',
    description: 'Sign up for free — no credit card required. Get immediate access to basic scoring data for 100+ cryptocurrencies.',
    icon: Target,
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    step: 2,
    title: 'Explore the Dashboard',
    description: 'View the 12-dimension scoring overview, market indicators, and behavioral finance panel for your favorite assets.',
    icon: Eye,
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    step: 3,
    title: 'Deep-Dive into Scores',
    description: 'Click any cryptocurrency to explore its full hierarchical breakdown — Dimensions → Sub-dimensions → Aspects → Sub-aspects.',
    icon: Layers,
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
  {
    step: 4,
    title: 'Integrate the API',
    description: 'Use our REST API to pull real-time scores, historical data, and coefficient evolution into your own tools and workflows.',
    icon: Code2,
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
  },
];

const dimensions = [
  {
    name: 'Fundamental Analysis',
    icon: BarChart3,
    description: 'Financial health, tokenomics, development activity',
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    borderColor: 'hover:border-violet-500/30',
  },
  {
    name: 'Technical Analysis',
    icon: TrendingUp,
    description: 'Price patterns, indicators, momentum',
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'hover:border-cyan-500/30',
  },
  {
    name: 'On-Chain & Microstructure',
    icon: Activity,
    description: 'Transaction volume, hash rate, network activity',
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
    borderColor: 'hover:border-amber-500/30',
  },
  {
    name: 'Market Psychology',
    icon: Brain,
    description: 'Fear & Greed, sentiment, behavioral biases',
    color: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
    borderColor: 'hover:border-rose-500/30',
  },
  {
    name: 'News & Sentiment',
    icon: Newspaper,
    description: 'News impact, social media, event analysis',
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'hover:border-emerald-500/30',
  },
  {
    name: 'Macroeconomic',
    icon: Globe,
    description: 'Interest rates, inflation, GDP correlation',
    color: 'from-sky-500/20 to-blue-500/20',
    iconColor: 'text-sky-400',
    borderColor: 'hover:border-sky-500/30',
  },
  {
    name: 'Regulatory & Legal',
    icon: Scale,
    description: 'Regulation changes, compliance, legal risk',
    color: 'from-indigo-500/20 to-violet-500/20',
    iconColor: 'text-indigo-400',
    borderColor: 'hover:border-indigo-500/30',
  },
  {
    name: 'Network Security',
    icon: Shield,
    description: 'Blockchain security, vulnerability assessment',
    color: 'from-red-500/20 to-orange-500/20',
    iconColor: 'text-red-400',
    borderColor: 'hover:border-red-500/30',
  },
  {
    name: 'Derivatives & Funding',
    icon: CandlestickChart,
    description: 'Futures, options, funding rates',
    color: 'from-fuchsia-500/20 to-pink-500/20',
    iconColor: 'text-fuchsia-400',
    borderColor: 'hover:border-fuchsia-500/30',
  },
  {
    name: 'Whale & Smart Money',
    icon: Fish,
    description: 'Large holder activity, institutional flows',
    color: 'from-teal-500/20 to-cyan-500/20',
    iconColor: 'text-teal-400',
    borderColor: 'hover:border-teal-500/30',
  },
  {
    name: 'Ecosystem & DeFi',
    icon: Zap,
    description: 'TVL, DApp activity, ecosystem growth',
    color: 'from-lime-500/20 to-green-500/20',
    iconColor: 'text-lime-400',
    borderColor: 'hover:border-lime-500/30',
  },
  {
    name: 'Inter-Market Correlation',
    icon: LineChart,
    description: 'Stock market, gold, forex correlation',
    color: 'from-orange-500/20 to-amber-500/20',
    iconColor: 'text-orange-400',
    borderColor: 'hover:border-orange-500/30',
  },
];

const hierarchyLevels = [
  { level: 'Dimensions', count: 12, description: 'Top-level analytical categories covering every aspect of crypto evaluation', icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { level: 'Sub-dimensions', count: '40+', description: 'Detailed breakdowns within each dimension for granular analysis', icon: GitBranch, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { level: 'Aspects', count: '100+', description: 'Specific measurable factors within sub-dimensions', icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { level: 'Sub-aspects', count: '264+', description: 'Atomic scoring nodes — the finest level of our analytical hierarchy', icon: Workflow, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

const behavioralBiases = [
  {
    category: 'Behavioral Finance Biases',
    count: 7,
    biases: ['Anchoring Bias', 'Availability Heuristic', 'Confirmation Bias', 'Framing Effect', 'Herd Behavior', 'Loss Aversion', 'Overconfidence Bias'],
    icon: Brain,
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    category: 'Trading Psychology Biases',
    count: 8,
    biases: ['Disposition Effect', 'Endowment Effect', 'Hindsight Bias', 'Mental Accounting', 'Recency Bias', 'Sunk Cost Fallacy', 'Self-Attribution Bias', 'Status Quo Bias'],
    icon: Lightbulb,
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
];

const referenceBooks = [
  'Thinking, Fast and Slow — Daniel Kahneman',
  'Misbehaving — Richard Thaler',
  'Nudge — Richard Thaler & Cass Sunstein',
  'The Intelligent Investor — Benjamin Graham',
  'A Random Walk Down Wall Street — Burton Malkiel',
  'Against the Gods — Peter Bernstein',
  'Behavioral Finance and Wealth Management — Michael Pompian',
  'Technical Analysis of the Financial Markets — John Murphy',
  'Market Microstructure in Practice — Lehalle & Laruelle',
  'Advances in Financial Machine Learning — Marcos López de Prado',
  'The Psychology of Trading — Brett Steenbarger',
  'Predictably Irrational — Dan Ariely',
  'Flash Boys — Michael Lewis',
  'Machine Learning for Asset Managers — Marcos López de Prado',
  'Beyond Greed and Fear — Hersh Shefrin',
];

const apiEndpoints = [
  {
    method: 'GET',
    path: '/api/market/overview',
    description: 'Retrieve the complete market overview including top coins, market indicators, and aggregate scores.',
    response: `{
  "market_cap": "$2.87T",
  "total_volume_24h": "$98.4B",
  "btc_dominance": "52.3%",
  "fear_greed_index": 62,
  "top_coins": [...],
  "market_indicators": {...}
}`,
  },
  {
    method: 'GET',
    path: '/api/crypto/:id',
    description: 'Get detailed scoring breakdown for a specific cryptocurrency across all 12 dimensions.',
    response: `{
  "id": "bitcoin",
  "name": "Bitcoin",
  "symbol": "BTC",
  "overall_score": 78.5,
  "dimensions": {
    "fundamental": { "score": 82, ... },
    "technical": { "score": 75, ... },
    ...
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/scores/history',
    description: 'Retrieve historical score data for backtesting and trend analysis.',
    response: `{
  "period": "30d",
  "data": [
    { "date": "2025-01-01", "score": 72.1 },
    { "date": "2025-01-02", "score": 73.4 },
    ...
  ],
  "metadata": { "interval": "daily" }
}`,
  },
];

/* ──────────── Component ──────────── */
export function DocsPage({ onNavigate }: DocsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08)_0%,transparent_50%)]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              <Badge
                variant="outline"
                className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-sm"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Documentation
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Documentation
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-6 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed"
            >
              Everything you need to understand and integrate the FinanceIntelligence
              12-dimension scoring platform.
            </motion.p>

            {/* Search bar */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-8 max-w-lg mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 pr-4 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-500 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 text-base rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ QUICK START GUIDE ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge
              variant="outline"
              className="mb-4 border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Quick Start
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Get Started in 4 Steps
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              From signup to API integration — start harnessing AI-powered crypto intelligence in minutes.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            {quickStartSteps.map((step, i) => (
              <motion.div key={step.step} variants={fadeUp} custom={i}>
                <Card className={cn(
                  'bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg h-full group',
                  step.borderColor || ''
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg font-bold text-white',
                        step.color
                      )}>
                        {step.step}
                      </div>
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                        step.color
                      )}>
                        <step.icon className={cn('w-4 h-4', step.iconColor)} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ SCORING SYSTEM OVERVIEW ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d1a]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge
              variant="outline"
              className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-300"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Scoring System
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                4-Level Hierarchy
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Our scoring engine uses a 4-level hierarchical structure, from broad dimensions
              down to atomic sub-aspects — each with ML-optimized coefficients.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            {hierarchyLevels.map((level, i) => (
              <motion.div key={level.level} variants={scaleIn} custom={i}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg h-full group">
                  <CardContent className="p-6 text-center">
                    <div className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300',
                      level.bg
                    )}>
                      <level.icon className={cn('w-7 h-7', level.color)} />
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                      {level.count}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{level.level}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{level.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Hierarchy visual */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            custom={1}
            className="mt-12 max-w-3xl mx-auto"
          >
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-white mb-6 text-center">Hierarchy Flow</h3>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  {hierarchyLevels.map((level, i) => (
                    <div key={level.level} className="flex items-center gap-3 sm:gap-4">
                      <div className="flex flex-col items-center text-center">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-2', level.bg)}>
                          <level.icon className={cn('w-6 h-6', level.color)} />
                        </div>
                        <span className="text-xs font-medium text-white">{level.level}</span>
                        <span className="text-[10px] text-slate-500">{level.count}</span>
                      </div>
                      {i < hierarchyLevels.length - 1 && (
                        <ChevronRight className="w-5 h-5 text-slate-600 hidden sm:block" />
                      )}
                      {i < hierarchyLevels.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-slate-600 sm:hidden" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ 12 DIMENSIONS REFERENCE ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge
              variant="outline"
              className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Dimensions Reference
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                The 12 Dimensions
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Each cryptocurrency is evaluated across 12 distinct analytical dimensions,
              covering everything from fundamentals to behavioral biases.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {dimensions.map((dim, i) => (
              <motion.div key={dim.name} variants={scaleIn} custom={i}>
                <Card className={cn(
                  'bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg h-full group',
                  dim.borderColor
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110',
                        dim.color
                      )}>
                        <dim.icon className={cn('w-6 h-6', dim.iconColor)} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white mb-1">{dim.name}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{dim.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ ML COEFFICIENT OPTIMIZATION ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d1a]/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              custom={0}
            >
              <Badge
                variant="outline"
                className="mb-4 border-violet-500/30 bg-violet-500/10 text-violet-300"
              >
                <Cpu className="w-3.5 h-3.5 mr-1.5" />
                ML Optimization
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Coefficient Optimization
                </span>
                <br />
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  via Gradient Descent
                </span>
              </h2>

              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  Every coefficient in our 264+ node hierarchy is optimized using gradient descent
                  — the same algorithm that powers deep learning. This ensures that the weight
                  assigned to each scoring factor maximizes predictive accuracy against historical
                  market data.
                </p>
                <p>
                  The optimization process runs daily, recalculating coefficients based on the
                  latest 90-day window of market data. Each coefficient is constrained to move
                  within a ±5% range per iteration, preventing wild swings and ensuring stability
                  in the scoring model.
                </p>
                <p>
                  This approach allows the platform to adapt to changing market regimes — for
                  example, increasing the weight of on-chain metrics during accumulation phases,
                  or emphasizing macro factors during risk-off environments.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              custom={1}
            >
              <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8">
                  <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-violet-400" />
                    Optimization Parameters
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Algorithm', value: 'Stochastic Gradient Descent', color: 'text-violet-400' },
                      { label: 'Constraint', value: '±5% per iteration', color: 'text-cyan-400' },
                      { label: 'Recalculation', value: 'Daily (90-day window)', color: 'text-amber-400' },
                      { label: 'Total Coefficients', value: '264+', color: 'text-emerald-400' },
                      { label: 'Backtest Period', value: '3 years historical', color: 'text-rose-400' },
                      { label: 'Convergence', value: 'Early stopping (patience=10)', color: 'text-sky-400' },
                    ].map((param) => (
                      <div key={param.label} className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">{param.label}</span>
                        <span className={cn('text-sm font-medium', param.color)}>{param.value}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-6 bg-white/[0.06]" />
                  <div className="rounded-xl bg-[#0d0d1a] p-4 font-mono text-xs text-slate-400 overflow-x-auto">
                    <div className="text-emerald-400">{'// Pseudocode'}</div>
                    <div className="mt-1">
                      <span className="text-violet-400">for</span> each coefficient w_i:
                    </div>
                    <div className="ml-4">
                      gradient = ∂Loss/∂w_i
                    </div>
                    <div className="ml-4">
                      delta = clip(gradient * lr, -0.05, 0.05)
                    </div>
                    <div className="ml-4">
                      w_i = w_i - delta
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ BEHAVIORAL FINANCE FRAMEWORK ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge
              variant="outline"
              className="mb-4 border-rose-500/30 bg-rose-500/10 text-rose-300"
            >
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              Behavioral Finance
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Behavioral Finance
              </span>
              <br />
              <span className="bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Framework
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              16 cognitive biases across 2 categories, informed by 15+ leading academic references
              in behavioral finance and trading psychology.
            </p>
          </motion.div>

          {/* Bias categories */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16"
          >
            {behavioralBiases.map((category, i) => (
              <motion.div key={category.category} variants={fadeUp} custom={i}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 h-full">
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center',
                        category.color
                      )}>
                        <category.icon className={cn('w-6 h-6', category.iconColor)} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{category.category}</h3>
                        <p className="text-sm text-slate-500">{category.count} biases detected</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {category.biases.map((bias) => (
                        <div key={bias} className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{bias}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Reference books */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            custom={0}
          >
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <BookMarked className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Academic References</h3>
                    <p className="text-sm text-slate-500">15+ foundational books informing our bias models</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {referenceBooks.map((book) => (
                    <div key={book} className="flex items-start gap-2 text-sm text-slate-400 p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{book}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ API REFERENCE ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d1a]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <Badge
              variant="outline"
              className="mb-4 border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            >
              <Terminal className="w-3.5 h-3.5 mr-1.5" />
              API Reference
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                REST API Endpoints
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Integrate FinanceIntelligence data into your own applications with our RESTful API.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {apiEndpoints.map((endpoint, i) => (
              <motion.div key={endpoint.path} variants={fadeUp} custom={i}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-xs px-3 py-1 w-fit">
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono text-white bg-white/[0.05] px-3 py-1 rounded-md">
                        {endpoint.path}
                      </code>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{endpoint.description}</p>
                    <div className="rounded-xl bg-[#0d0d1a] p-4 font-mono text-xs text-slate-400 overflow-x-auto">
                      <div className="text-slate-500 mb-1">{'// Response'}</div>
                      <pre className="whitespace-pre-wrap">{endpoint.response}</pre>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FAQ LINK ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_60%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <HelpCircle className="w-8 h-8 text-violet-400" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Still Have Questions?
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Check out our FAQ for answers to the most commonly asked questions about
              FinanceIntelligence, or reach out to our team directly.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('faq')}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-violet-500/25 cursor-pointer"
              >
                View FAQ
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('contact')}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-8 text-base cursor-pointer"
              >
                Contact Us
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">FinanceIntelligence</span>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Crypto Intelligence Platform — 12D ML Scoring + 16 Behavioral Biases — &copy; {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('faq')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                FAQ
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

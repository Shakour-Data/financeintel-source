'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Layers,
  Cpu,
  DollarSign,
  Terminal,
  Globe,
  CreditCard,
  Shield,
  Clock,
  CheckCircle2,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface FAQPageProps {
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
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: Globe,
    iconColor: 'text-violet-400',
    items: [
      {
        question: 'What is FinanceIntelligence?',
        answer: 'FinanceIntelligence is an AI-powered crypto & stock analysis platform that evaluates 100+ digital assets across 12 analytical dimensions using a 264+ node hierarchical scoring system. Our platform combines machine learning coefficient optimization with a behavioral finance framework that detects 16 cognitive biases, delivering institutional-grade intelligence to every investor — from beginners to professionals.',
      },
      {
        question: 'How accurate are the AI scores?',
        answer: 'Our scoring system uses gradient descent optimization that is backtested against 3 years of historical data. The ML coefficient optimization continuously adapts to changing market regimes, and our multi-dimensional approach provides a more robust assessment than single-factor models. While no scoring system can guarantee predictions, our backtested results show a 23% improvement in predictive accuracy over static-weight models. Scores are recalculated daily to reflect the latest market conditions.',
      },
      {
        question: 'Which cryptocurrencies are supported?',
        answer: 'We currently support 100+ cryptocurrencies including all major assets (Bitcoin, Ethereum, Solana, etc.) and a wide range of mid-cap and emerging tokens. Our coverage is continuously expanding, with new assets added based on market cap, liquidity, and community demand. If there\'s a specific asset you\'d like to see covered, you can submit a request through our contact form.',
      },
      {
        question: 'How often are scores updated?',
        answer: 'Scores are recalculated daily using a 90-day rolling window of market data. The ML coefficient optimization runs each night, adjusting the 264+ coefficients within a ±5% constraint per iteration. Real-time price and volume data feeds into the display layer continuously, but the full hierarchical scoring computation completes once per day to ensure consistency and stability.',
      },
    ],
  },
  {
    id: 'scoring',
    label: 'Scoring System',
    icon: BarChart3,
    iconColor: 'text-cyan-400',
    items: [
      {
        question: 'What are the 12 dimensions?',
        answer: 'Our 12 dimensions cover every aspect of crypto & stock evaluation: (1) Fundamental Analysis — financial health, tokenomics, development activity; (2) Technical Analysis — price patterns, indicators, momentum; (3) On-Chain & Microstructure — transaction volume, hash rate, network activity; (4) Market Psychology — Fear & Greed, sentiment, behavioral biases; (5) News & Sentiment — news impact, social media, event analysis; (6) Macroeconomic — interest rates, inflation, GDP correlation; (7) Regulatory & Legal — regulation changes, compliance, legal risk; (8) Network Security — blockchain security, vulnerability assessment; (9) Derivatives & Funding — futures, options, funding rates; (10) Whale & Smart Money — large holder activity, institutional flows; (11) Ecosystem & DeFi — TVL, DApp activity, ecosystem growth; (12) Inter-Market Correlation — stock market, gold, forex correlation.',
      },
      {
        question: 'How does the ML coefficient optimization work?',
        answer: 'Each of the 264+ coefficients in our scoring hierarchy is optimized using stochastic gradient descent. The algorithm minimizes a loss function that measures the difference between predicted and actual market outcomes over a 90-day rolling window. Each coefficient is constrained to move within ±5% per iteration, preventing wild swings and ensuring stability. The optimization runs daily, allowing the system to adapt to changing market regimes — for example, increasing on-chain metric weights during accumulation phases or emphasizing macro factors during risk-off environments.',
      },
      {
        question: 'What is the behavioral finance framework?',
        answer: 'Our behavioral finance framework detects and quantifies 16 cognitive biases that affect crypto trading decisions. These are organized into two categories: Behavioral Finance Biases (7 biases including Anchoring Bias, Availability Heuristic, Confirmation Bias, Framing Effect, Herd Behavior, Loss Aversion, and Overconfidence Bias) and Trading Psychology Biases (8 biases including Disposition Effect, Endowment Effect, Hindsight Bias, Mental Accounting, Recency Bias, Sunk Cost Fallacy, Self-Attribution Bias, and Status Quo Bias). The framework is informed by 15+ academic references from leading behavioral finance researchers.',
      },
      {
        question: 'How is the scoring hierarchy structured?',
        answer: 'Our scoring system uses a 4-level hierarchy: Dimensions (12 top-level categories) → Sub-dimensions (40+ detailed breakdowns) → Aspects (100+ measurable factors) → Sub-aspects (264+ atomic scoring nodes). Each level aggregates the scores from the level below, weighted by ML-optimized coefficients. This hierarchical approach allows us to drill down from a single overall score to the most granular factors influencing a cryptocurrency\'s evaluation.',
      },
      {
        question: 'What reference books are integrated?',
        answer: 'Our behavioral finance framework draws from 15+ foundational academic references including: "Thinking, Fast and Slow" by Daniel Kahneman, "Misbehaving" by Richard Thaler, "Nudge" by Thaler & Sunstein, "The Intelligent Investor" by Benjamin Graham, "Advances in Financial Machine Learning" by Marcos López de Prado, "Technical Analysis of the Financial Markets" by John Murphy, "The Psychology of Trading" by Brett Steenbarger, "Predictably Irrational" by Dan Ariely, "Against the Gods" by Peter Bernstein, and "Beyond Greed and Fear" by Hersh Shefrin, among others. These works inform how we detect, quantify, and weight cognitive biases in our scoring model.',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: CreditCard,
    iconColor: 'text-amber-400',
    items: [
      {
        question: 'Is there a free plan?',
        answer: 'Yes! Our free tier provides access to basic scoring data for 100+ cryptocurrencies, the market overview dashboard, and the top-level 12-dimension scores. No credit card is required to get started. The free plan is designed to give you genuine analytical power — not just a teaser — so you can make informed investment decisions before deciding to upgrade.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Absolutely. All paid plans can be canceled at any time with no cancellation fees. When you cancel, you\'ll retain access to your plan features until the end of your current billing period. We don\'t believe in lock-in contracts — if our platform isn\'t providing value, you shouldn\'t be forced to stay.',
      },
      {
        question: "What's included in the Pro plan?",
        answer: 'The Pro plan includes everything in the free tier plus: full hierarchical score drill-downs (all 4 levels), historical score data and trend analysis, coefficient evolution tracking, behavioral bias detection reports, API access with higher rate limits, email alerts for score changes, priority support, and export capabilities. It\'s designed for active traders and analysts who need the complete picture.',
      },
      {
        question: 'Do you offer enterprise solutions?',
        answer: 'Yes, we offer custom enterprise solutions for funds, trading desks, and financial institutions. Enterprise plans include: custom API rate limits, dedicated infrastructure, SLA guarantees, custom dimension weighting, white-label options, team management and role-based access, historical data bulk exports, and a dedicated account manager. Contact our team for a tailored proposal.',
      },
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: Terminal,
    iconColor: 'text-emerald-400',
    items: [
      {
        question: 'What data sources do you use?',
        answer: 'We aggregate data from 6+ premium sources including CoinGecko (price and market data), Binance (trading and order book data), Glassnode (on-chain analytics), CoinMarketCap (market overview), Santiment (social and on-chain metrics), and Messari (fundamental data). Our data pipeline ingests millions of data points daily, which are normalized, validated, and fed into our scoring engine.',
      },
      {
        question: 'How does the API work?',
        answer: 'Our RESTful API provides programmatic access to all scoring data. Key endpoints include GET /api/market/overview (complete market snapshot), GET /api/crypto/:id (detailed score breakdown for a specific asset), and GET /api/scores/history (historical score data). Authentication is via API key, which you can generate from your dashboard. Free tier includes 100 requests/day; Pro includes 10,000 requests/day; Enterprise has custom limits.',
      },
      {
        question: 'Is real-time data available?',
        answer: 'Price and volume data updates in near real-time (sub-second latency) on the dashboard. Full hierarchical scores are recalculated daily as the ML coefficient optimization completes. For enterprise clients, we offer a WebSocket-based real-time feed that pushes score updates and coefficient changes as they occur. API users can poll for the latest scores at any time.',
      },
      {
        question: 'How is historical data generated?',
        answer: 'Our historical score database is built by running our current scoring model (with its optimized coefficients) against historical market data going back 3 years. This backfill process ensures that score trends are consistent and comparable over time. The daily recalculation also appends new data points, creating a growing historical record. Note that because coefficients are continuously optimized, very old historical scores may be recalculated using the current model to maintain consistency.',
      },
    ],
  },
];

/* ──────────── Component ──────────── */
export function FAQPage({ onNavigate }: FAQPageProps) {
  const [activeTab, setActiveTab] = useState('general');

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
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                FAQ
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
                Frequently Asked
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Questions
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Find answers to common questions about FinanceIntelligence, our scoring
              system, pricing, and technical details.
            </motion.p>

            {/* Quick stats */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
            >
              {[
                { label: 'Categories', value: '4' },
                { label: 'Questions', value: '17' },
                { label: 'Dimensions', value: '12' },
                { label: 'Biases Detected', value: '16' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                >
                  <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ FAQ CATEGORIES ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Category Tabs */}
              <TabsList className="bg-white/[0.05] border border-white/[0.06] p-1 w-full grid grid-cols-4 h-auto mb-8 rounded-xl">
                {faqCategories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="py-2.5 px-3 text-xs sm:text-sm data-[state=active]:bg-white/[0.08] data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-400 rounded-lg transition-all cursor-pointer"
                  >
                    <category.icon className={cn('w-4 h-4 mr-1.5 hidden sm:block', category.iconColor)} />
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* FAQ Content */}
              {faqCategories.map((category) => (
                <TabsContent key={category.id} value={category.id}>
                  <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          category.id === 'general' ? 'bg-violet-500/10' :
                          category.id === 'scoring' ? 'bg-cyan-500/10' :
                          category.id === 'pricing' ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                        )}>
                          <category.icon className={cn('w-5 h-5', category.iconColor)} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{category.label}</h3>
                          <p className="text-sm text-slate-500">{category.items.length} questions</p>
                        </div>
                      </div>

                      <Accordion type="single" collapsible className="space-y-1">
                        {category.items.map((item, i) => (
                          <AccordionItem
                            key={i}
                            value={`${category.id}-${i}`}
                            className="border-white/[0.06] rounded-lg px-1 data-[state=open]:bg-white/[0.02] transition-colors"
                          >
                            <AccordionTrigger className="text-left text-sm sm:text-base font-medium text-white hover:text-violet-300 hover:no-underline py-4 transition-colors">
                              {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-slate-400 leading-relaxed pb-4">
                              {item.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ STILL HAVE QUESTIONS CTA ═══════════ */}
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
              <MessageSquare className="w-8 h-8 text-violet-400" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Still Have Questions?
              </span>
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Can&apos;t find the answer you&apos;re looking for? Our team is happy to help.
              Reach out and we&apos;ll get back to you within 24 hours.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('contact')}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-violet-500/25 cursor-pointer"
              >
                Contact Us
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('docs')}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-8 text-base cursor-pointer"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                View Documentation
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
                onClick={() => onNavigate('docs')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Docs
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Contact
              </button>
              <button
                onClick={() => onNavigate('blog')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Blog
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

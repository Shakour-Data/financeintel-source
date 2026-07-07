'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  BookOpen,
  ArrowRight,
  ChevronRight,
  Clock,
  User,
  Mail,
  Sparkles,
  TrendingUp,
  BarChart3,
  Layers,
  Activity,
  Globe,
  Cpu,
  Lightbulb,
  Search,
  FileText,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface BlogPageProps {
  onNavigate: (page: string) => void;
}

/* ──────────── Animation variants ──────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
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
type Category = 'Research' | 'Market Analysis' | 'Technology' | 'Education';

const categoryColors: Record<Category, { badge: string; text: string; border: string }> = {
  Research: {
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    text: 'text-violet-400',
    border: 'hover:border-violet-500/30',
  },
  'Market Analysis': {
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    text: 'text-cyan-400',
    border: 'hover:border-cyan-500/30',
  },
  Technology: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    text: 'text-emerald-400',
    border: 'hover:border-emerald-500/30',
  },
  Education: {
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    text: 'text-amber-400',
    border: 'hover:border-amber-500/30',
  },
};

const featuredArticle = {
  title: 'How ML Coefficient Optimization Improves Crypto Scoring Accuracy',
  excerpt: 'An in-depth look at how gradient descent optimization of 264+ scoring coefficients enables FinanceIntelligence to adapt to changing market regimes, improving predictive accuracy by 23% over static-weight models. We explore the ±5% constraint mechanism, daily recalculation cycle, and backtesting methodology that powers our scoring engine.',
  category: 'Research' as Category,
  author: 'Dr. Sarah Chen',
  date: 'Feb 28, 2025',
  readTime: '12 min read',
  icon: Cpu,
};

const articles = [
  {
    title: 'How ML Coefficient Optimization Improves Crypto Scoring Accuracy',
    excerpt: 'An in-depth look at how gradient descent optimization of 264+ scoring coefficients enables adaptive scoring that outperforms static models by 23%.',
    category: 'Research' as Category,
    author: 'Dr. Sarah Chen',
    date: 'Feb 28, 2025',
    readTime: '12 min read',
    icon: Cpu,
  },
  {
    title: 'Understanding Behavioral Biases in Crypto Trading',
    excerpt: 'From anchoring bias to the disposition effect — how 16 cognitive biases impact crypto trading decisions and how our framework detects and quantifies them in real time.',
    category: 'Education' as Category,
    author: 'Dr. Aisha Patel',
    date: 'Feb 20, 2025',
    readTime: '9 min read',
    icon: Brain,
  },
  {
    title: 'The 12 Dimensions of Cryptocurrency Analysis: A Complete Guide',
    excerpt: 'A comprehensive walkthrough of our multi-dimensional scoring framework — from fundamental and technical analysis to on-chain microstructure and inter-market correlation.',
    category: 'Education' as Category,
    author: 'Marcus Rivera',
    date: 'Feb 12, 2025',
    readTime: '15 min read',
    icon: Layers,
  },
  {
    title: 'Why On-Chain Metrics Matter More Than Ever',
    excerpt: 'As institutional adoption grows, on-chain data provides unprecedented transparency into market structure. We analyze transaction volume, hash rate trends, and network activity signals.',
    category: 'Market Analysis' as Category,
    author: 'James O\'Brien',
    date: 'Feb 5, 2025',
    readTime: '8 min read',
    icon: Activity,
  },
  {
    title: 'Macroeconomic Factors Affecting Crypto Markets in 2025',
    excerpt: 'Interest rates, inflation expectations, and GDP growth all influence crypto prices. Our macro dimension quantifies these relationships and their evolving correlations.',
    category: 'Market Analysis' as Category,
    author: 'Dr. Sarah Chen',
    date: 'Jan 28, 2025',
    readTime: '10 min read',
    icon: Globe,
  },
  {
    title: 'Building a Quantitative Framework for Crypto Investment',
    excerpt: 'How to combine 12-dimension scoring, behavioral bias detection, and ML-optimized coefficients into a systematic investment decision framework.',
    category: 'Technology' as Category,
    author: 'Marcus Rivera',
    date: 'Jan 20, 2025',
    readTime: '14 min read',
    icon: BarChart3,
  },
];

/* ──────────── Component ──────────── */
export function BlogPage({ onNavigate }: BlogPageProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

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
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Blog & Insights
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
                Blog & Insights
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Deep dives into crypto analysis, machine learning, behavioral finance,
              and the research powering FinanceIntelligence.
            </motion.p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ FEATURED ARTICLE ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="mb-8"
          >
            <Badge
              variant="outline"
              className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-300"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Featured
            </Badge>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            custom={1}
          >
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/5 group overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                  {/* Image / Visual placeholder */}
                  <div className="lg:col-span-2 relative min-h-[240px] lg:min-h-[340px] bg-gradient-to-br from-violet-500/10 via-cyan-500/10 to-emerald-500/10 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />
                    <div className="relative z-10 w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <featuredArticle.icon className="w-12 h-12 text-violet-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:col-span-3 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                    <Badge
                      variant="outline"
                      className={cn('w-fit mb-4', categoryColors[featuredArticle.category].badge)}
                    >
                      {featuredArticle.category}
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight group-hover:text-violet-200 transition-colors">
                      {featuredArticle.title}
                    </h2>
                    <p className="text-slate-400 leading-relaxed mb-6">
                      {featuredArticle.excerpt}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {featuredArticle.author}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {featuredArticle.date}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {featuredArticle.readTime}
                      </div>
                    </div>
                    <button className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors group/btn cursor-pointer w-fit">
                      Read More
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ ARTICLE GRID ═══════════ */}
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Latest Articles
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Research, analysis, and educational content from the FinanceIntelligence team.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {articles.map((article, i) => {
              const catStyle = categoryColors[article.category];
              return (
                <motion.div key={article.title} variants={scaleIn} custom={i}>
                  <Card className={cn(
                    'bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg h-full group flex flex-col',
                    catStyle.border
                  )}>
                    <CardContent className="p-6 flex flex-col flex-1">
                      {/* Category badge + icon */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge
                          variant="outline"
                          className={cn('text-xs', catStyle.badge)}
                        >
                          {article.category}
                        </Badge>
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110',
                          article.category === 'Research' ? 'bg-violet-500/10' :
                          article.category === 'Market Analysis' ? 'bg-cyan-500/10' :
                          article.category === 'Technology' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                        )}>
                          <article.icon className={cn('w-4 h-4', catStyle.text)} />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-white mb-2 leading-snug group-hover:text-violet-200 transition-colors line-clamp-2">
                        {article.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-sm text-slate-400 leading-relaxed mb-4 flex-1 line-clamp-3">
                        {article.excerpt}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {article.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </div>
                      </div>

                      <Separator className="bg-white/[0.06] mb-4" />

                      {/* Read More */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{article.date}</span>
                        <button className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors group/btn cursor-pointer">
                          Read More
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ NEWSLETTER CTA ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_60%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  {/* Background glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-cyan-500/5 to-emerald-500/5" />

                  <div className="relative p-8 sm:p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-violet-400" />
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                      <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                        Subscribe for Weekly Insights
                      </span>
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
                      Get the latest research, market analysis, and platform updates delivered
                      to your inbox every week. No spam, unsubscribe anytime.
                    </p>

                    {subscribed ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 text-emerald-400"
                      >
                        <Lightbulb className="w-5 h-5" />
                        <span className="text-lg font-medium">You&apos;re subscribed!</span>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-500 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 text-base rounded-xl flex-1 w-full sm:w-auto"
                        />
                        <Button
                          onClick={handleSubscribe}
                          className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white h-12 px-6 text-base font-semibold shadow-lg shadow-violet-500/25 rounded-xl w-full sm:w-auto cursor-pointer"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Subscribe
                        </Button>
                      </div>
                    )}

                    <p className="mt-4 text-xs text-slate-500">
                      By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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

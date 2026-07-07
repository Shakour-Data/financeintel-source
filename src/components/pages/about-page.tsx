'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  Eye,
  Lightbulb,
  Users,
  BarChart3,
  Layers,
  BookOpen,
  Clock,
  Cpu,
  Database,
  Activity,
  Shield,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Sparkles,
  GraduationCap,
  Microscope,
  Globe,
  Link2,
  LineChart,
  Newspaper,
  TrendingUp,
  Scale,
  Lock,
  CandlestickChart,
  Fish,
  Zap,
  Heart,
  Code2,
  Server,
  Binary,
  Workflow,
  Radio,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AboutPageProps {
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
const teamMembers = [
  {
    name: 'Dr. Sarah Chen',
    role: 'CEO & Co-Founder',
    bio: 'PhD in Machine Learning from Stanford. Former VP of Quantitative Research at Goldman Sachs, where she led AI-driven trading strategies across $4B in assets. Passionate about making institutional-grade analytics accessible to every investor.',
    icon: GraduationCap,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    accent: 'from-violet-500/20 to-purple-500/20',
    borderColor: 'hover:border-violet-500/30',
  },
  {
    name: 'Marcus Rivera',
    role: 'CTO & Co-Founder',
    bio: '15+ years in fintech engineering. Former Lead Architect at Bloomberg, where he designed real-time market data systems serving 300K+ terminals. Expert in low-latency distributed systems and scalable data pipelines.',
    icon: Code2,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    accent: 'from-cyan-500/20 to-teal-500/20',
    borderColor: 'hover:border-cyan-500/30',
  },
  {
    name: 'Dr. Aisha Patel',
    role: 'Head of Research',
    bio: 'Behavioral finance expert with 48+ published papers in top-tier journals. Former professor at London School of Economics. Pioneered the integration of cognitive bias detection into quantitative crypto scoring frameworks.',
    icon: Microscope,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    accent: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'hover:border-amber-500/30',
  },
  {
    name: "James O'Brien",
    role: 'Head of Engineering',
    bio: 'Distributed systems architect and former Staff Engineer at Stripe, where he built payment infrastructure processing $100B+ annually. Specialist in high-throughput data processing, real-time ML inference, and fault-tolerant microservices.',
    icon: Server,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    accent: 'from-emerald-500/20 to-teal-500/20',
    borderColor: 'hover:border-emerald-500/30',
  },
];

const techCategories = [
  {
    title: 'Machine Learning',
    icon: Cpu,
    items: ['Gradient Descent Optimization', 'Neural Networks', 'Coefficient Tuning', 'Backtested Models'],
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    borderColor: 'border-violet-500/20',
  },
  {
    title: 'Data Sources',
    icon: Database,
    items: ['CoinGecko', 'Binance', 'Glassnode', 'CoinMarketCap', 'Santiment', 'Messari'],
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
  },
  {
    title: '12 Dimensions Framework',
    icon: Layers,
    items: ['4-Level Hierarchy', '264+ Scoring Nodes', 'Dynamic Weighting', 'Cross-Dimensional Analysis'],
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  {
    title: '48 Reference Books',
    icon: BookOpen,
    items: ['Behavioral Finance', 'Technical Analysis', 'Machine Learning', 'Market Microstructure'],
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  {
    title: 'Real-time Processing',
    icon: Radio,
    items: ['Sub-second Updates', 'WebSocket Streams', 'Event-Driven Pipeline', 'Fault-Tolerant Ingestion'],
    color: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-500/20',
  },
];

const keyStats = [
  { value: '12', label: 'Analytical Dimensions', icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { value: '264+', label: 'Scoring Hierarchy Nodes', icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { value: '48', label: 'Academic References', icon: BookOpen, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: '16', label: 'Behavioral Biases Detected', icon: Brain, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { value: '100+', label: 'Cryptocurrencies', icon: Globe, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { value: '3 Years', label: 'Historical Data', icon: Clock, color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

const coreValues = [
  {
    title: 'Transparency',
    description: 'Every score is explainable. Our methodology is fully documented, and our AI models provide interpretable outputs so you always understand the reasoning behind each analytical conclusion.',
    icon: Eye,
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    features: ['Open Methodology', 'Explainable AI', 'Auditable Coefficients'],
  },
  {
    title: 'Accuracy',
    description: 'Machine learning-optimized scoring with rigorous backtesting against historical data. Our 264+ coefficient hierarchy is continuously refined through gradient descent to maximize predictive performance.',
    icon: Target,
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    features: ['ML-Optimized', 'Rigorously Backtested', 'Continuous Improvement'],
  },
  {
    title: 'Accessibility',
    description: 'Institutional-grade intelligence shouldn\'t be limited to institutions. Our free tier provides genuine analytical power, and our pricing ensures professionals at every level can access the insights they need.',
    icon: Heart,
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
    features: ['Free Tier Available', 'No Credit Card Required', 'Fair Pricing'],
  },
];

/* ──────────── Component ──────────── */
export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08)_0%,transparent_50%)]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              <Badge
                variant="outline"
                className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                About FinanceIntelligence
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Democratizing Crypto
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Analysis Through AI
              </span>
            </motion.h1>

            {/* Mission statement */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              We believe every investor deserves institutional-grade intelligence.
              FinanceIntelligence harnesses machine learning and behavioral finance
              to make comprehensive financial analysis accessible to all.
            </motion.p>

            {/* Platform description */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed"
            >
              Our 12-dimension scoring system evaluates cryptocurrencies across
              264+ hierarchical nodes — from fundamental and technical analysis to
              behavioral bias detection and macro trends — delivering AI-powered
              insights that were once exclusive to Wall Street quant desks.
            </motion.p>

            {/* Quick stats */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
            >
              {[
                { label: 'Dimensions', value: '12' },
                { label: 'Scoring Nodes', value: '264+' },
                { label: 'References', value: '48' },
                { label: 'Biases Detected', value: '16' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                >
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ MISSION & VISION ═══════════ */}
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
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Mission & Vision
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Why We Exist
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              custom={0}
            >
              <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:border-violet-500/20 h-full">
                <CardContent className="p-6 sm:p-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-5">
                    <Target className="w-7 h-7 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Our Mission</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Making institutional-grade financial analysis accessible to everyone.
                    We&rsquo;re building the tools that level the playing field &mdash; so that
                    whether you&rsquo;re a solo investor or managing a fund, you have the same
                    depth of analytical intelligence at your fingertips.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Vision */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              custom={1}
            >
              <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:border-cyan-500/20 h-full">
                <CardContent className="p-6 sm:p-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mb-5">
                    <Eye className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">Our Vision</h3>
                  <p className="text-slate-400 leading-relaxed">
                    A world where every investor has AI-powered intelligence at their
                    fingertips. We envision a future where data-driven decision-making
                    isn&rsquo;t a privilege &mdash; it&rsquo;s the standard, and crypto markets
                    become more efficient, transparent, and fair for all participants.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ OUR STORY ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d1a]/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text side */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              custom={0}
            >
              <Badge
                variant="outline"
                className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-300"
              >
                <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                Our Story
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Born from the Need for
                </span>
                <br />
                <span className="bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Deeper Analysis
                </span>
              </h2>

              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  FinanceIntelligence was born in 2022 from a simple frustration: existing
                  crypto analytics tools were either too simplistic or too expensive. Most
                  platforms offered basic technical indicators &mdash; RSI, MACD, moving
                  averages &mdash; but none provided the multi-dimensional intelligence
                  that institutional investors relied on daily.
                </p>
                <p>
                  Our founders, coming from quantitative finance and machine learning
                  backgrounds, knew there was a better way. They set out to build a
                  platform that didn&rsquo;t just show price charts, but evaluated every
                  cryptocurrency across 12 distinct analytical dimensions &mdash; from
                  fundamental and technical analysis to behavioral finance, macro trends,
                  and on-chain microstructure.
                </p>
                <p>
                  The result is a scoring engine with 264+ hierarchical nodes, powered by
                  gradient descent coefficient optimization and informed by 48 academic
                  references. Today, FinanceIntelligence helps thousands of investors make
                  data-driven decisions with confidence.
                </p>
              </div>
            </motion.div>

            {/* Image / Visual side */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              custom={1}
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-40" />

                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-violet-500/10">
                  <div className="bg-[#111118] p-0">
                    <img
                      src="/team-photo.png"
                      alt="FinanceIntelligence Team"
                      className="w-full h-auto object-cover"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/60 via-transparent to-transparent" />
                  </div>
                </div>

                {/* Floating stats cards */}
                <motion.div
                  variants={scaleIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={2}
                  className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6"
                >
                  <div className="rounded-xl bg-[#111118]/90 backdrop-blur-sm border border-white/[0.08] p-3 sm:p-4 shadow-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">264+</div>
                        <div className="text-[10px] text-slate-500">Scoring Nodes</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  variants={scaleIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={3}
                  className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6"
                >
                  <div className="rounded-xl bg-[#111118]/90 backdrop-blur-sm border border-white/[0.08] p-3 sm:p-4 shadow-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">16</div>
                        <div className="text-[10px] text-slate-500">Biases Detected</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ TEAM SECTION ═══════════ */}
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
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Our Team
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                The People Behind
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                the Intelligence
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              A team of researchers, engineers, and finance professionals united by
              a shared mission to transform financial analysis.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            {teamMembers.map((member, i) => (
              <motion.div key={member.name} variants={fadeUp} custom={i}>
                <Card
                  className={cn(
                    'bg-white/[0.03] border-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:shadow-lg h-full group',
                    member.borderColor
                  )}
                >
                  <CardContent className="p-6">
                    {/* Avatar with initials */}
                    <div className="mb-5">
                      <div
                        className={cn(
                          'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center transition-transform duration-300 group-hover:scale-105',
                          member.accent
                        )}
                      >
                        <span className="text-xl font-bold text-white">
                          {member.name
                            .split(' ')
                            .filter((n) => n.length > 1)
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                    </div>

                    {/* Name & role */}
                    <h3 className="text-lg font-semibold text-white mb-1">{member.name}</h3>
                    <p className={cn('text-sm font-medium mb-3', member.iconColor)}>
                      {member.role}
                    </p>

                    {/* Bio */}
                    <p className="text-sm text-slate-400 leading-relaxed">{member.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ TECHNOLOGY STACK ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d0d1a]/60 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.06)_0%,transparent_60%)]" />
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
              className="mb-4 border-violet-500/30 bg-violet-500/10 text-violet-300"
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5" />
              Technology Stack
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Powered by Cutting-Edge
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Technology
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              From data ingestion to ML inference &mdash; every layer of our platform
              is engineered for speed, accuracy, and reliability.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {techCategories.map((tech, i) => (
              <motion.div
                key={tech.title}
                variants={scaleIn}
                custom={i}
                className={cn(
                  i === 4 ? 'sm:col-span-2 lg:col-span-1' : ''
                )}
              >
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg h-full group">
                  <CardContent className="p-6">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110',
                        tech.color
                      )}
                    >
                      <tech.icon className={cn('w-6 h-6', tech.iconColor)} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white mb-3">{tech.title}</h3>

                    {/* Items */}
                    <div className="space-y-2">
                      {tech.items.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
                          <div className={cn('w-1.5 h-1.5 rounded-full', tech.iconColor.replace('text-', 'bg-'))} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ BY THE NUMBERS ═══════════ */}
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
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              By the Numbers
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                The Scale of Our
              </span>
              <br />
              <span className="bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Intelligence
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Every number represents thousands of hours of research, engineering,
              and refinement.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {keyStats.map((stat, i) => (
              <motion.div key={stat.label} variants={scaleIn} custom={i}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 group text-center">
                  <CardContent className="p-6 sm:p-8">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300',
                        stat.bg
                      )}
                    >
                      <stat.icon className={cn('w-6 h-6', stat.color)} />
                    </div>
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ VALUES SECTION ═══════════ */}
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
              className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Our Values
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                What We Stand For
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Three core principles guide every decision we make and every feature we build.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {coreValues.map((value, i) => (
              <motion.div key={value.title} variants={fadeUp} custom={i}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 h-full group">
                  <CardContent className="p-6 sm:p-8">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110',
                        value.color
                      )}
                    >
                      <value.icon className={cn('w-7 h-7', value.iconColor)} />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>

                    {/* Description */}
                    <p className="text-sm text-slate-400 leading-relaxed mb-5">
                      {value.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-2">
                      {value.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ CTA SECTION ═══════════ */}
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
              <Zap className="w-8 h-8 text-violet-400" />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Join Thousands of
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Crypto Investors
              </span>
            </h2>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
              Start making data-driven decisions with 12-dimension AI-powered intelligence.
              No credit card required &mdash; start free and upgrade when you&rsquo;re ready.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('dashboard')}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-violet-500/25 cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('pricing')}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-8 text-base cursor-pointer"
              >
                View Pricing
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>256-bit Encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-violet-500" />
                <span>14-day Free Trial</span>
              </div>
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
                onClick={() => onNavigate('privacy')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <button
                onClick={() => onNavigate('terms')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Terms
              </button>
              <button
                onClick={() => onNavigate('docs')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Docs
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AboutPage;

'use client';

import { motion } from 'framer-motion';
import {
  Check,
  X,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Shield,
  Clock,
  BarChart3,
  Brain,
  Activity,
  Layers,
  Cpu,
  Globe,
  Newspaper,
  LineChart,
  Database,
  Code2,
  Headphones,
  FileCheck,
  Server,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface PricingPageProps {
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
    transition: { duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

/* ──────────── Data ──────────── */
type FeatureItem = {
  text: string;
  included: boolean;
  icon?: React.ElementType;
};

type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ElementType;
  popular: boolean;
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  features: FeatureItem[];
  cta: string;
  ctaVariant: 'default' | 'outline';
};

const tiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Get started with core crypto intelligence — perfect for individual explorers.',
    icon: Zap,
    popular: false,
    gradient: 'from-emerald-500/10 to-teal-500/10',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    borderColor: 'border-white/[0.06]',
    features: [
      { text: '10 crypto & stock assets tracked', included: true, icon: BarChart3 },
      { text: '4 core dimensions (Fundamental, Technical, On-Chain, Market Psychology)', included: true, icon: Layers },
      { text: 'Daily score updates', included: true, icon: Clock },
      { text: 'Basic market overview', included: true, icon: Activity },
      { text: 'Community support', included: true, icon: MessageSquare },
      { text: '7-day historical data', included: true, icon: Database },
      { text: 'Behavioral finance analysis', included: false },
      { text: 'ML coefficient optimization', included: false },
      { text: 'News & sentiment analysis', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free',
    ctaVariant: 'outline',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'Full analytical power for serious traders and analysts — our most popular choice.',
    icon: Crown,
    popular: true,
    gradient: 'from-violet-500/10 via-cyan-500/10 to-emerald-500/10',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    features: [
      { text: '100+ crypto & stock assets tracked', included: true, icon: BarChart3 },
      { text: 'All 12 dimensions with full hierarchy', included: true, icon: Layers },
      { text: 'Real-time score updates', included: true, icon: Activity },
      { text: 'Advanced market indicators', included: true, icon: LineChart },
      { text: 'Behavioral finance analysis (16 biases)', included: true, icon: Brain },
      { text: 'ML coefficient optimization', included: true, icon: Cpu },
      { text: 'News & sentiment analysis', included: true, icon: Newspaper },
      { text: '3-year historical data', included: true, icon: Database },
      { text: 'Priority support', included: true, icon: Headphones },
      { text: 'API access (1,000 calls/day)', included: true, icon: Code2 },
      { text: 'Custom dimensions', included: false },
      { text: 'White-label options', included: false },
      { text: 'Dedicated account manager', included: false },
      { text: 'On-premise deployment', included: false },
    ],
    cta: 'Get Pro Access',
    ctaVariant: 'default',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'Institutional-grade intelligence with custom models and dedicated support.',
    icon: Building2,
    popular: false,
    gradient: 'from-amber-500/10 to-orange-500/10',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    borderColor: 'border-white/[0.06]',
    features: [
      { text: 'Unlimited crypto & stock assets', included: true, icon: Globe },
      { text: 'All 12 dimensions + custom dimensions', included: true, icon: Layers },
      { text: 'Real-time + predictive analytics', included: true, icon: Activity },
      { text: 'Full market intelligence suite', included: true, icon: BarChart3 },
      { text: 'Custom behavioral models', included: true, icon: Brain },
      { text: 'White-label options', included: true, icon: FileCheck },
      { text: 'Dedicated account manager', included: true, icon: Headphones },
      { text: 'Unlimited API access', included: true, icon: Code2 },
      { text: 'Custom integrations', included: true, icon: Cpu },
      { text: 'SLA guarantee', included: true, icon: Shield },
      { text: 'On-premise deployment option', included: true, icon: Server },
    ],
    cta: 'Contact Sales',
    ctaVariant: 'outline',
  },
];

const faqItems = [
  {
    question: 'Can I switch plans at any time?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features and be prorated for the remainder of your billing cycle. When downgrading, the change takes effect at the start of your next billing period.',
  },
  {
    question: 'What happens when I exceed my API call limit?',
    answer:
      'On the Pro plan, if you exceed 1,000 API calls per day, additional calls will be rate-limited rather than blocked — you\'ll experience slower response times until the next daily reset. For higher volumes, we recommend upgrading to Enterprise for unlimited API access.',
  },
  {
    question: 'How does the 12-dimension scoring system differ across plans?',
    answer:
      'The Free plan includes 4 core dimensions: Fundamental Analysis, Technical Analysis, On-Chain & Microstructure, and Market Psychology. The Pro plan unlocks all 12 dimensions including News & Sentiment, Macroeconomic, Regulatory & Legal, Network Security, Derivatives & Funding, Whale & Smart Money, Ecosystem & DeFi, and Inter-Market Correlation. Enterprise adds the ability to create custom dimensions tailored to your specific analytical needs.',
  },
  {
    question: 'Is there a free trial for the Pro plan?',
    answer:
      'Yes! We offer a 14-day free trial of the Pro plan with full access to all features, no credit card required. You can explore the complete 12-dimension scoring system, behavioral finance analysis, and API access during the trial period.',
  },
  {
    question: 'What kind of support is included with each plan?',
    answer:
      'Free plan users have access to our community forum and knowledge base. Pro plan users get priority email support with a 4-hour response time during business hours, plus access to our Slack community. Enterprise clients receive a dedicated account manager, 24/7 phone support, custom onboarding, and a guaranteed SLA with response times under 1 hour for critical issues.',
  },
];

const comparisonFeatures = [
  { name: 'Cryptocurrencies tracked', free: '10', pro: '100+', enterprise: 'Unlimited' },
  { name: 'Scoring dimensions', free: '4 core', pro: 'All 12', enterprise: '12 + custom' },
  { name: 'Score update frequency', free: 'Daily', pro: 'Real-time', enterprise: 'Real-time + predictive' },
  { name: 'Historical data', free: '7 days', pro: '3 years', enterprise: 'Full archive' },
  { name: 'Behavioral finance', free: '—', pro: '16 biases', enterprise: 'Custom models' },
  { name: 'ML coefficient optimization', free: '—', pro: '✓', enterprise: '✓ + custom' },
  { name: 'News & sentiment', free: '—', pro: '✓', enterprise: '✓ + custom feeds' },
  { name: 'API access', free: '—', pro: '1,000/day', enterprise: 'Unlimited' },
  { name: 'Support level', free: 'Community', pro: 'Priority', enterprise: 'Dedicated manager' },
  { name: 'SLA guarantee', free: '—', pro: '—', enterprise: '99.9% uptime' },
  { name: 'On-premise deployment', free: '—', pro: '—', enterprise: '✓' },
];

/* ──────────── Component ──────────── */
export function PricingPage({ onNavigate }: PricingPageProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ═══════════ HEADER SECTION ═══════════ */}
      <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.06)_0%,transparent_50%)]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <Badge
              variant="outline"
              className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Simple, Transparent Pricing
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
              Choose Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Intelligence Plan
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            From free exploration to institutional-grade analytics — unlock the right level
            of crypto intelligence for your needs.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500"
          >
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>14-day free trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-cyan-500" />
              <span>No credit card required</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-500" />
              <span>Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ PRICING CARDS ═══════════ */}
      <section className="relative py-8 sm:py-12">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start"
          >
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                variants={scaleIn}
                custom={i}
                className="relative"
              >
                {/* Popular glow effect */}
                {tier.popular && (
                  <>
                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/40 via-cyan-500/30 to-emerald-500/40 blur-sm" />
                    <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/20 via-cyan-500/15 to-emerald-500/20" />
                  </>
                )}

                <Card
                  className={cn(
                    'relative rounded-2xl bg-[#111118]/90 backdrop-blur-sm border transition-all duration-300 h-full',
                    tier.popular
                      ? 'border-violet-500/30 shadow-xl shadow-violet-500/10'
                      : 'border-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-violet-500/5'
                  )}
                >
                  {/* Popular badge */}
                  {tier.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0 px-4 py-1 text-xs font-semibold shadow-lg shadow-violet-500/30">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-2 pt-8 px-6 sm:px-8">
                    {/* Icon & name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          tier.iconBg
                        )}
                      >
                        <tier.icon className={cn('w-5 h-5', tier.iconColor)} />
                      </div>
                      <span className="text-lg font-semibold text-white">{tier.name}</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                        {tier.price}
                      </span>
                      <span className="text-slate-500 text-base">{tier.period}</span>
                    </div>

                    <CardDescription className="text-slate-400 text-sm mt-2 leading-relaxed">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 sm:px-8 pb-2">
                    <Separator className="bg-white/[0.06] mb-5" />

                    {/* Feature list */}
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li
                          key={feature.text}
                          className={cn(
                            'flex items-start gap-2.5 text-sm',
                            feature.included ? 'text-slate-200' : 'text-slate-600'
                          )}
                        >
                          {feature.included ? (
                            <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-white/[0.03] flex items-center justify-center">
                              <X className="w-3 h-3 text-slate-600" />
                            </div>
                          )}
                          <span className={cn(!feature.included && 'line-through opacity-60')}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="px-6 sm:px-8 pt-4 pb-8">
                    <Button
                      className={cn(
                        'w-full h-11 text-sm font-semibold cursor-pointer',
                        tier.popular
                          ? 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/25'
                          : 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white'
                      )}
                      variant={tier.popular ? 'default' : 'outline'}
                      onClick={() => onNavigate(tier.name === 'Enterprise' ? 'contact' : 'dashboard')}
                    >
                      {tier.cta}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FEATURE COMPARISON TABLE ═══════════ */}
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a]/50 to-[#0a0a0f]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center mb-12"
          >
            <Badge
              variant="outline"
              className="mb-4 border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Feature Comparison
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Compare Plans Side by Side
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              A detailed breakdown to help you find the perfect fit.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            custom={1}
          >
            <div className="rounded-2xl border border-white/[0.06] bg-[#111118]/60 backdrop-blur-sm overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-4 gap-0 border-b border-white/[0.06]">
                <div className="p-4 sm:p-5 text-sm font-medium text-slate-400">
                  Feature
                </div>
                <div className="p-4 sm:p-5 text-center text-sm font-medium text-emerald-400">
                  Free
                </div>
                <div className="p-4 sm:p-5 text-center text-sm font-medium text-violet-400 bg-violet-500/[0.03]">
                  Pro
                </div>
                <div className="p-4 sm:p-5 text-center text-sm font-medium text-amber-400">
                  Enterprise
                </div>
              </div>

              {/* Table rows */}
              {comparisonFeatures.map((row, idx) => (
                <div
                  key={row.name}
                  className={cn(
                    'grid grid-cols-4 gap-0 border-b border-white/[0.04] last:border-b-0',
                    idx % 2 === 0 ? 'bg-white/[0.01]' : ''
                  )}
                >
                  <div className="p-4 sm:p-5 text-sm text-slate-300 flex items-center">
                    {row.name}
                  </div>
                  <div className="p-4 sm:p-5 text-center text-sm text-slate-500 flex items-center justify-center">
                    {row.free}
                  </div>
                  <div className="p-4 sm:p-5 text-center text-sm text-slate-200 bg-violet-500/[0.03] flex items-center justify-center">
                    {row.pro}
                  </div>
                  <div className="p-4 sm:p-5 text-center text-sm text-slate-200 flex items-center justify-center">
                    {row.enterprise}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FAQ SECTION ═══════════ */}
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.06)_0%,transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
            className="text-center mb-12"
          >
            <Badge
              variant="outline"
              className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-300"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Everything you need to know about our pricing and plans.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            custom={1}
          >
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqItems.map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm px-6 data-[state=open]:bg-white/[0.04] data-[state=open]:border-white/[0.1] transition-all duration-300 overflow-hidden"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-medium text-slate-200 hover:text-white hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-slate-400 leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ CUSTOM PLAN CTA ═══════════ */}
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.1)_0%,transparent_60%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            custom={0}
          >
            <Card className="relative rounded-2xl border border-white/[0.08] bg-[#111118]/80 backdrop-blur-sm overflow-hidden">
              {/* Gradient border glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-emerald-500/20 -z-10 blur-sm" />

              <CardContent className="p-8 sm:p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-7 h-7 text-violet-400" />
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                    Need a Custom Plan?
                  </span>
                </h2>

                <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                  Whether you need higher API limits, custom dimensions, specialized integrations,
                  or on-premise deployment — our team will design a solution tailored to your
                  organization&apos;s requirements.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => onNavigate('contact')}
                    className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-violet-500/25 cursor-pointer"
                  >
                    Contact Sales
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => onNavigate('docs')}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-8 text-base cursor-pointer"
                  >
                    View Documentation
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Enterprise-grade Security</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-violet-500" />
                    <span>24/7 Priority Support</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-cyan-500" />
                    <span>Custom SLA Available</span>
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
              <span className="text-sm font-semibold text-white">FinanceIntel</span>
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

export default PricingPage;

'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  ArrowLeft,
  Scale,
  FileText,
  Shield,
  AlertTriangle,
  UserCheck,
  Lock,
  Ban,
  Gavel,
  RefreshCw,
  MapPin,
  Mail,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface TermsPageProps {
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

/* ──────────── Section Data ──────────── */
interface LegalSection {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  content: React.ReactNode;
}

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    number: 1,
    title: 'Acceptance of Terms',
    icon: UserCheck,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    content: (
      <div className="space-y-4">
        <p>
          By accessing or using the FinanceIntelligence platform (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to all of these Terms, you may not access or use the Service.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you (&ldquo;User&rdquo;, &ldquo;you&rdquo;, or &ldquo;your&rdquo;) and FinanceIntelligence Inc. (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an account, accessing, or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
        </p>
        <p>
          You must be at least 18 years of age to use this Service. By using the Service, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
        </p>
      </div>
    ),
  },
  {
    id: 'description',
    number: 2,
    title: 'Description of Service',
    icon: FileText,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    content: (
      <div className="space-y-4">
        <p>
          FinanceIntelligence provides an AI-powered crypto & stock analysis platform that evaluates digital assets across 12 analytical dimensions using a 264+ node hierarchical scoring system. The Service includes, but is not limited to:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Multi-dimensional cryptocurrency scoring across fundamental, technical, on-chain, behavioral, and macro dimensions</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Machine learning-optimized coefficient analysis with daily recalibration</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Behavioral finance bias detection covering 16 cognitive biases</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Market indicators, trend analysis, and sentiment tracking</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Historical score data, coefficient evolution charts, and analytical reports</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Application Programming Interface (API) access for programmatic data retrieval</span>
          </li>
        </ul>
        <p>
          We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, including the availability of any feature, database, or content, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
        </p>
      </div>
    ),
  },
  {
    id: 'registration',
    number: 3,
    title: 'Account Registration',
    icon: UserCheck,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    content: (
      <div className="space-y-4">
        <p>
          To access certain features of the Service, you must create an account. When creating an account, you agree to:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span>Provide accurate, current, and complete information during registration</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span>Maintain and promptly update your account information to keep it accurate, current, and complete</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span>Maintain the security and confidentiality of your login credentials</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span>Accept responsibility for all activities that occur under your account</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span>Notify us immediately of any unauthorized use of your account</span>
          </li>
        </ul>
        <p>
          You may not create multiple accounts for the purpose of abusing the Service or circumventing rate limits. We reserve the right to suspend or terminate accounts that violate this provision. Free tier accounts are subject to usage limits as described on our pricing page.
        </p>
      </div>
    ),
  },
  {
    id: 'acceptable-use',
    number: 4,
    title: 'Acceptable Use',
    icon: Ban,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    content: (
      <div className="space-y-4">
        <p>
          You agree not to use the Service in any way that violates applicable laws, regulations, or these Terms. Without limiting the foregoing, you agree not to:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Use the Service for any unlawful purpose or in violation of any local, state, national, or international law</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Scrape, crawl, or use automated means to access the Service beyond the expressly provided API</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Exceed API rate limits or attempt to circumvent usage restrictions</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Share, resell, or redistribute access to the Service without written authorization</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Interfere with or disrupt the integrity or performance of the Service</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Attempt to gain unauthorized access to any portion of the Service, other accounts, or computer systems</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span>Use the Service to manipulate market prices, engage in market abuse, or facilitate fraudulent activities</span>
          </li>
        </ul>
        <p>
          We reserve the right to investigate and take appropriate legal action against anyone who, in our sole discretion, violates this provision, including removing offending content, suspending or terminating the accounts of such violators, and reporting violations to law enforcement authorities.
        </p>
      </div>
    ),
  },
  {
    id: 'intellectual-property',
    number: 5,
    title: 'Intellectual Property',
    icon: Lock,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    content: (
      <div className="space-y-4">
        <p>
          The Service and its original content (excluding content provided by users or third-party data sources), features, and functionality are and shall remain the exclusive property of FinanceIntelligence Inc. and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
        </p>
        <p>
          Our trademarks, service marks, and trade dress may not be used in connection with any product or service without the prior written consent of FinanceIntelligence Inc. The &ldquo;FinanceIntelligence&rdquo; name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of FinanceIntelligence Inc.
        </p>
        <p>
          Our proprietary scoring methodology, including but not limited to the 12-dimension framework, 264+ hierarchical node structure, ML coefficient optimization algorithms, and behavioral bias detection models, constitutes trade secrets and proprietary intellectual property. You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or use any content from the Service for commercial purposes without our express written permission.
        </p>
        <p>
          Any feedback, comments, or suggestions you provide regarding the Service shall be deemed non-confidential and may be used by us without restriction or obligation.
        </p>
      </div>
    ),
  },
  {
    id: 'disclaimer',
    number: 6,
    title: 'Data & Analytics Disclaimer',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    content: (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-300 mb-1">Important Disclaimer</p>
              <p className="text-sm text-amber-200/80">
                The information provided by FinanceIntelligence is for <strong>informational and educational purposes only</strong> and does not constitute financial, investment, trading, or other professional advice. You should not treat any analytical output, score, or report as a specific recommendation or solicitation to buy, sell, or hold any cryptocurrency, stock, or digital asset.
              </p>
            </div>
          </div>
        </div>
        <p>
          Cryptocurrency markets are highly volatile and unpredictable. Past performance, historical scores, and backtested results are not indicative of future outcomes. Our AI-powered scoring system, while sophisticated, cannot guarantee the accuracy, completeness, or timeliness of any analytical output.
        </p>
        <p>
          Specifically, you acknowledge and agree that:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>All scores, indicators, and analytical outputs are provided &ldquo;as is&rdquo; and should not be the sole basis for any investment decision</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>The Service does not provide personalized financial advice tailored to your individual financial situation, risk tolerance, or investment objectives</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>ML-optimized coefficients and scoring models may contain inherent biases, limitations, and errors</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>Behavioral bias detection is analytical in nature and should not be construed as psychological or medical advice</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>You bear full responsibility for your own investment decisions and should consult a qualified financial advisor before making any investment</span>
          </li>
        </ul>
        <p>
          We make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability of the information, products, services, or related graphics contained on the Service for any purpose. Any reliance you place on such information is therefore strictly at your own risk.
        </p>
      </div>
    ),
  },
  {
    id: 'liability',
    number: 7,
    title: 'Limitation of Liability',
    icon: Shield,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    content: (
      <div className="space-y-4">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CRYPTOINTELLIGENCE INC., ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span>Loss of profits, data, use, goodwill, or other intangible losses</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span>Financial losses resulting from investment decisions made based on Service data</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span>Damages resulting from unauthorized access to or use of our servers or any personal information stored therein</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span>Damages resulting from any interruption or cessation of transmission to or from the Service</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span>Damages resulting from any bugs, viruses, or similar harmful code that may be transmitted to or through the Service</span>
          </li>
        </ul>
        <p>
          This limitation of liability applies whether the alleged liability is based on contract, tort, negligence, strict liability, or any other basis, even if FinanceIntelligence Inc. has been advised of the possibility of such damage. In jurisdictions that do not allow the exclusion or limitation of liability for consequential or incidental damages, our liability shall be limited to the maximum extent permitted by law, but in no event shall our total aggregate liability exceed the amount you paid to us in the twelve (12) months preceding the claim.
        </p>
      </div>
    ),
  },
  {
    id: 'indemnification',
    number: 8,
    title: 'Indemnification',
    icon: Gavel,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    content: (
      <div className="space-y-4">
        <p>
          You agree to defend, indemnify, and hold harmless FinanceIntelligence Inc. and its officers, directors, employees, agents, licensors, and suppliers from and against any claims, actions, or demands, including without limitation reasonable legal and accounting fees, arising or resulting from:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Your breach of these Terms of Service</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Your use of or access to the Service</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Your violation of any rights of another party</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <span>Any content you submit, post, or transmit through the Service</span>
          </li>
        </ul>
        <p>
          FinanceIntelligence Inc. shall provide notice to you of any such claim, suit, or demand. We reserve the right to assume the exclusive defense and control of any matter subject to indemnification by you, in which event you will cooperate with us in asserting any available defenses.
        </p>
      </div>
    ),
  },
  {
    id: 'termination',
    number: 9,
    title: 'Termination',
    icon: Ban,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
        <p>
          Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so through your account settings or by contacting us at{' '}
          <a href="mailto:legal@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            legal@cryptointelligence.io
          </a>.
        </p>
        <p>
          All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnification clauses, and limitations of liability. We shall not be liable to you or any third party for any termination of your access to the Service.
        </p>
        <p>
          If you have a paid subscription and terminate your account, you will retain access until the end of your current billing period. No prorated refunds will be issued for partial billing periods, except as required by applicable law.
        </p>
      </div>
    ),
  },
  {
    id: 'changes',
    number: 10,
    title: 'Changes to Terms',
    icon: RefreshCw,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will make reasonable efforts to provide at least 30 days&apos; notice prior to any new terms taking effect by posting the updated Terms on our website and, where applicable, sending a notification to the email address associated with your account.
        </p>
        <p>
          What constitutes a material change will be determined at our sole discretion, but may include changes to our liability disclaimers, acceptable use policies, or data handling practices. We encourage you to review these Terms periodically for any changes.
        </p>
        <p>
          Your continued use of the Service after the effective date of any revised Terms constitutes your acceptance of such changes. If you do not agree with the new Terms, you must stop using the Service before the changes become effective.
        </p>
      </div>
    ),
  },
  {
    id: 'governing-law',
    number: 11,
    title: 'Governing Law',
    icon: MapPin,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    content: (
      <div className="space-y-4">
        <p>
          These Terms shall be governed and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
        </p>
        <p>
          Any disputes arising out of or relating to these Terms or the Service shall be resolved exclusively in the federal or state courts located in Delaware, and you consent to the personal jurisdiction and venue of such courts.
        </p>
        <p>
          If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish its objectives to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
        </p>
      </div>
    ),
  },
  {
    id: 'contact',
    number: 12,
    title: 'Contact Information',
    icon: Mail,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    content: (
      <div className="space-y-4">
        <p>
          If you have any questions about these Terms of Service, please contact us:
        </p>
        <div className="space-y-3 ml-4">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <p className="text-slate-300 font-medium">Email</p>
              <a href="mailto:legal@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 text-sm">
                legal@cryptointelligence.io
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <p className="text-slate-300 font-medium">Mailing Address</p>
              <p className="text-sm text-slate-400">
                FinanceIntelligence Inc.<br />
                1200 Market Street, Suite 400<br />
                Wilmington, DE 19801<br />
                United States
              </p>
            </div>
          </div>
        </div>
        <p>
          For general support inquiries, please visit our{' '}
          <button onClick={() => {}} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            Contact page
          </button>
          {' '}or refer to our{' '}
          <button onClick={() => {}} className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            FAQ section
          </button>.
        </p>
      </div>
    ),
  },
];

/* ──────────── Component ──────────── */
export function TermsPage({ onNavigate }: TermsPageProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          {/* Back button */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </button>
          </motion.div>

          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              <Badge
                variant="outline"
                className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-sm"
              >
                <Scale className="w-3.5 h-3.5 mr-1.5" />
                Legal Document
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Terms of
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Service
              </span>
            </motion.h1>

            {/* Last updated */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-6 text-base text-slate-400 max-w-xl mx-auto leading-relaxed"
            >
              Last updated: March 2025
            </motion.p>

            {/* Template notice */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This is a template document provided for informational purposes only.</span>
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ TABLE OF CONTENTS ═══════════ */}
      <section className="relative py-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-violet-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Table of Contents</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sections.map((section, i) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.05] transition-colors group cursor-pointer"
                    >
                      <span className="text-xs font-mono text-slate-500 group-hover:text-violet-400 transition-colors w-6 shrink-0">
                        {String(section.number).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                        {section.title}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ LEGAL SECTIONS ═══════════ */}
      <section className="relative py-12 sm:py-16">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 sm:space-y-12">
            {sections.map((section, i) => (
              <motion.div
                key={section.id}
                id={section.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                custom={i}
              >
                <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] transition-colors duration-300 scroll-mt-24">
                  <CardContent className="p-6 sm:p-8">
                    {/* Section header */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${section.iconBg} flex items-center justify-center shrink-0`}>
                        <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                      </div>
                      <div>
                        <span className="text-xs font-mono text-slate-500 block mb-1">
                          Section {String(section.number).padStart(2, '0')}
                        </span>
                        <h3 className="text-lg sm:text-xl font-semibold text-white leading-tight">
                          {section.title}
                        </h3>
                      </div>
                    </div>

                    {/* Section content */}
                    <div className="text-sm sm:text-base text-slate-400 leading-relaxed ml-0 sm:ml-14">
                      {section.content}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ACKNOWLEDGMENT ═══════════ */}
      <section className="relative py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.10)_0%,transparent_60%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Scale className="w-8 h-8 text-violet-400" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Questions About Our Terms?
              </span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
              If you have any questions or concerns about these Terms of Service,
              our team is here to help. We typically respond within 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('contact')}
                className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-violet-500/25 cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('privacy')}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-8 text-base cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Privacy Policy
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
                onClick={() => onNavigate('privacy')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Contact
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

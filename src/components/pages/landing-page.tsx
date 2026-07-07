'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  BarChart3,
  Shield,
  TrendingUp,
  Globe,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Zap,
  Flame,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1.0] } },
};

const FEATURES = [
  { icon: Brain, title: '12D ML Scoring', desc: 'Dual scoring system: 12 dimensions for crypto + 12 for stocks across 6 markets.', color: '#C62828' },
  { icon: BarChart3, title: 'Market Intelligence', desc: 'Real-time data for 200+ cryptocurrencies and 300 stocks from 6 countries.', color: '#1565C0' },
  { icon: Shield, title: 'Risk Analysis', desc: 'ML-optimized coefficients with prediction error tracking and auto-adjustment.', color: '#FFD54F' },
  { icon: TrendingUp, title: 'Predictions', desc: 'Machine learning-powered predictions with confidence calibration.', color: '#10b981' },
  { icon: Globe, title: '6 Markets', desc: 'US, Japan, UK, Germany, France, India — stock market analysis worldwide.', color: '#8b5cf6' },
  { icon: Zap, title: 'Live Data', desc: 'Auto-refreshing market data with Fear & Greed, DeFi, and derivatives feeds.', color: '#f59e0b' },
];

const STATS = [
  { value: '200+', label: 'Cryptocurrencies' },
  { value: '300', label: 'Stocks Tracked' },
  { value: '12', label: 'Scoring Dimensions' },
  { value: '6', label: 'Markets Covered' },
];

const DIMENSIONS = [
  'Technical', 'Fundamental', 'On-Chain', 'Market',
  'Sentiment', 'Macro', 'Regulatory', 'Security',
  'Derivatives', 'Whale Activity', 'Ecosystem', 'Inter-Market',
];

export function LandingPage({ onNavigate }: LandingPageProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadSource = useCallback(async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download-source');
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : 'financeintel-source.zip';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[#C62828]/5 via-transparent to-[#1565C0]/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD54F]/10 border border-[#FFD54F]/20 text-sm text-[#FFD54F] mb-8">
              <Sparkles className="w-4 h-4" />
              AI-Powered Financial Intelligence
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-[#C62828] via-[#FFD54F] to-[#1565C0] bg-clip-text text-transparent">
                FinanceIntel
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Advanced dual 12-dimension ML scoring system for cryptocurrency and stock market analysis across 6 countries.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => onNavigate('dashboard')}
                size="lg"
                className="bg-gradient-to-r from-[#C62828] to-[#D84315] hover:from-[#EF5350] hover:to-[#C62828] text-white shadow-lg shadow-[#C62828]/20 text-base px-8"
              >
                <Flame className="w-5 h-5 mr-2" />
                Open Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={handleDownloadSource}
                disabled={isDownloading}
                variant="outline"
                size="lg"
                className="border-[#1565C0]/30 text-base px-8"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Download className="w-5 h-5 mr-2" />
                )}
                {isDownloading ? 'Preparing ZIP...' : 'Download Source Code'}
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#C62828] via-[#FFD54F] to-[#1565C0] bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Intelligent Analytics Platform</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our 12-dimension ML scoring engine evaluates every asset across technical, fundamental, on-chain, sentiment, and macro factors.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-t-2" style={{ borderTopColor: feature.color }}>
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${feature.color}15` }}>
                      <feature.icon className="w-5 h-5" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 12 Dimensions */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">12 Scoring Dimensions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each asset is scored 1-10 across 12 dimensions, aggregated through ML-optimized coefficients with a 4-level hierarchy.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {DIMENSIONS.map((dim, i) => (
              <motion.div
                key={dim}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium">{dim}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#C62828]/5 via-[#FFD54F]/5 to-[#1565C0]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Start Analyzing Now</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Access real-time AI scores, market indicators, and ML predictions — all in one dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => onNavigate('dashboard')}
              size="lg"
              className="bg-gradient-to-r from-[#C62828] to-[#D84315] hover:from-[#EF5350] hover:to-[#C62828] text-white shadow-lg shadow-[#C62828]/20 text-base px-8"
            >
              <Flame className="w-5 h-5 mr-2" />
              Open Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={handleDownloadSource}
              disabled={isDownloading}
              variant="outline"
              size="lg"
              className="border-[#C62828]/30 text-base px-8"
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Download className="w-5 h-5 mr-2" />
              )}
              {isDownloading ? 'Preparing ZIP...' : 'Download Source Code'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

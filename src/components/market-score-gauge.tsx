'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MarketScoreGaugeProps {
  score: number;
  previousScore?: number;
  size?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  /** Maximum value for the scale. Default: 100. Use 10 for AI scores on 1-10 scale. */
  maxValue?: number;
}

function getScoreColor(score: number): string {
  if (score > 80) return '#22c55e';      // bright green
  if (score >= 65) return '#4ade80';     // green
  if (score >= 55) return '#facc15';     // yellow
  if (score >= 40) return '#fb923c';     // orange
  return '#ef4444';                      // red
}

function getScoreGradient(score: number): { start: string; end: string } {
  if (score > 80) return { start: '#22c55e', end: '#16a34a' };
  if (score >= 65) return { start: '#4ade80', end: '#22c55e' };
  if (score >= 55) return { start: '#facc15', end: '#eab308' };
  if (score >= 40) return { start: '#fb923c', end: '#f97316' };
  return { start: '#f87171', end: '#ef4444' };
}

export function MarketScoreGauge({
  score,
  previousScore,
  size = 200,
  label,
  sublabel,
  className,
  maxValue = 100,
}: MarketScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedPrevScore, setAnimatedPrevScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
      if (previousScore !== undefined) setAnimatedPrevScore(previousScore);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, previousScore]);

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / maxValue) * circumference;
  const gap = circumference - progress;

  const delta = score - (previousScore ?? score);
  // Normalize score to 0-100 scale for color thresholds
  const normalizedScore = (score / maxValue) * 100;
  const colors = getScoreGradient(normalizedScore);
  const color = getScoreColor(normalizedScore);

  const center = size / 2;
  const gradientId = `gauge-gradient-${label?.replace(/\s/g, '') ?? 'default'}`;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.start} />
              <stop offset="100%" stopColor={colors.end} />
            </linearGradient>
            {/* Glow filter */}
            <filter id={`glow-${gradientId}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted) / 0.3)"
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: gap }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            filter={`url(#glow-${gradientId})`}
          />

          {/* Tick marks */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const innerR = radius - strokeWidth / 2 - 4;
            const outerR = radius - strokeWidth / 2 - (i % 5 === 0 ? 12 : 8);
            const x1 = center + innerR * Math.cos(rad);
            const y1 = center + innerR * Math.sin(rad);
            const x2 = center + outerR * Math.cos(rad);
            const y2 = center + outerR * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground) / 0.2)"
                strokeWidth={i % 5 === 0 ? 1.5 : 0.5}
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-bold tabular-nums leading-none"
            style={{ fontSize: size * 0.22, color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {animatedScore.toFixed(2)}
          </motion.span>

          {delta !== 0 && previousScore !== undefined && (
            <motion.span
              className={cn(
                'text-xs font-semibold mt-1 flex items-center gap-0.5',
                delta > 0 ? 'text-emerald-400' : 'text-red-400'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {delta > 0 ? '▲' : '▼'} {delta > 0 ? '+' : ''}{delta.toFixed(2)}
            </motion.span>
          )}

          {label && (
            <span className="text-[10px] text-muted-foreground mt-1 text-center px-2 leading-tight">
              {label}
            </span>
          )}
        </div>
      </div>

      {sublabel && (
        <span className="text-xs text-muted-foreground text-center">{sublabel}</span>
      )}
    </div>
  );
}

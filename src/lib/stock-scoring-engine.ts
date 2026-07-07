/**
 * Stock Scoring Engine — 12-Dimension Hierarchical Scoring for Equities
 *
 * Complete 4-level hierarchy for stock analysis:
 *   Dimension → Sub-Dimension → Aspect → Sub-Aspect
 *
 * Each sub-aspect has a scoring function (scoreFn) that takes a StockQuote
 * and SectorDefaults and returns a score from 1 to 10.
 *
 * Scores roll up: sub-aspect → aspect → sub-dimension → dimension → AI Score
 * Country-specific weight adjustments are applied to the composite score.
 *
 * When a data point is missing (undefined), the sector default value is used as proxy.
 * Confidence = 'high' if >70% of data points available, 'medium' if 40-70%, 'low' if <40%.
 */

import type { StockQuote } from './stock-data-engine';

// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

/** Clamp a value to the 1–10 score range, guarding NaN/Infinity */
function clamp(score: number): number {
  if (Number.isNaN(score) || !Number.isFinite(score)) return 5;
  return Math.max(1, Math.min(10, score));
}

/** Normalize a value from [min, max] → [1, 10], with zero-division guard */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 5;
  const norm = (value - min) / (max - min);
  return clamp(Math.round(norm * 9 + 1));
}

/** Normalize a value from [min, max] → [1, 10] with smooth (non-rounded) output */
function normalizeSmooth(value: number, min: number, max: number): number {
  if (max === min) return 5;
  const norm = (value - min) / (max - min);
  return clamp(norm * 9 + 1);
}

/** Simple percentage-change safe division */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  const result = ((current - previous) / previous) * 100;
  if (Number.isNaN(result) || !Number.isFinite(result)) return 0;
  return result;
}

/** Average an array of numbers, returning 5 on empty */
function avg(arr: number[]): number {
  if (arr.length === 0) return 5;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

/** Safe getter with fallback */
function safeNum(val: number | undefined, fallback: number): number {
  if (val === undefined || val === null || Number.isNaN(val) || !Number.isFinite(val)) return fallback;
  return val;
}

/** Compute upside from analyst target price vs current price as percentage */
function computeTargetUpside(quote: StockQuote): number | undefined {
  if (quote.analystTargetPrice === undefined || quote.price === 0) return undefined;
  return ((quote.analystTargetPrice - quote.price) / quote.price) * 100;
}

/** Compute price position relative to 52-week range (0=at low, 1=at high) */
function compute52wPosition(quote: StockQuote): number | undefined {
  if (quote.high52w === undefined || quote.low52w === undefined) return undefined;
  if (quote.high52w === quote.low52w) return 0.5;
  return (quote.price - quote.low52w) / (quote.high52w - quote.low52w);
}

/** Derive gross margin estimate from ROE, net margin, and leverage */
function estimateGrossMargin(quote: StockQuote, sd: SectorDefaults): number {
  // Gross margin is typically 15-25pp above net margin
  const netM = safeNum(quote.netMargin, sd.netMargin);
  return netM + 20;
}

/** Derive operating margin estimate from net margin */
function estimateOperatingMargin(quote: StockQuote, sd: SectorDefaults): number {
  const netM = safeNum(quote.netMargin, sd.netMargin);
  return netM + 5;
}

/** Derive ROIC from ROE and D/E ratio */
function estimateRoic(quote: StockQuote, sd: SectorDefaults): number {
  const roe = safeNum(quote.roe, sd.roe);
  const de = safeNum(quote.debtToEquity, sd.debtToEquity);
  // ROIC ≈ ROE * (1 / (1 + D/E))
  const totalCapitalRatio = 1 / (1 + de);
  return roe * totalCapitalRatio;
}

/** Derive interest coverage from net margin and D/E */
function estimateInterestCoverage(quote: StockQuote, sd: SectorDefaults): number {
  const de = safeNum(quote.debtToEquity, sd.debtToEquity);
  // Higher D/E → lower coverage; rough estimate
  if (de <= 0.5) return 8;
  if (de <= 1.0) return 5;
  if (de <= 2.0) return 3;
  if (de <= 3.0) return 2;
  return 1;
}

/** Compute RSI-based signal */
function rsiSignal(rsi: number): number {
  // Oversold (RSI<30) = bullish opportunity (high score)
  // Overbought (RSI>70) = caution (low score)
  // Neutral zone (40-60) = moderate
  if (rsi < 20) return 9;
  if (rsi < 30) return 8;
  if (rsi < 40) return 7;
  if (rsi <= 60) return 5;
  if (rsi <= 70) return 4;
  if (rsi <= 80) return 3;
  return 2;
}

/** Estimate 3Y CAGR from 1Y growth (conservative: dampen by 0.6) */
function estimate3yCagr(oneYearGrowth: number | undefined, fallback: number): number {
  if (oneYearGrowth === undefined) return fallback;
  // 3Y CAGR is typically lower than 1Y growth due to regression to mean
  return oneYearGrowth * 0.6;
}

/** Estimate 5Y dividend growth from current yield and sector default */
function estimate5yDivGrowth(yield3y: number): number {
  // Conservative: assume 5Y slightly lower than 3Y
  return yield3y * 0.8;
}

// ═══════════════════════════════════════════════════════════════
// SECTOR DEFAULTS
// ═══════════════════════════════════════════════════════════════

export interface SectorDefaults {
  roe: number;
  netMargin: number;
  peRatio: number;
  dividendYield: number;
  debtToEquity: number;
  beta: number;
  institutionalOwnership: number;
}

export const SECTOR_DEFAULTS: Record<string, SectorDefaults> = {
  Technology: { roe: 18, netMargin: 15, peRatio: 28, dividendYield: 1, debtToEquity: 0.5, beta: 1.3, institutionalOwnership: 75 },
  Healthcare: { roe: 15, netMargin: 12, peRatio: 22, dividendYield: 1.5, debtToEquity: 0.8, beta: 0.9, institutionalOwnership: 70 },
  Financial: { roe: 12, netMargin: 20, peRatio: 14, dividendYield: 2.5, debtToEquity: 3.0, beta: 1.1, institutionalOwnership: 65 },
  Consumer: { roe: 20, netMargin: 8, peRatio: 20, dividendYield: 2, debtToEquity: 0.7, beta: 0.7, institutionalOwnership: 60 },
  Energy: { roe: 10, netMargin: 8, peRatio: 12, dividendYield: 3.5, debtToEquity: 0.6, beta: 1.2, institutionalOwnership: 55 },
  Industrial: { roe: 14, netMargin: 8, peRatio: 18, dividendYield: 2, debtToEquity: 0.8, beta: 1.0, institutionalOwnership: 60 },
  Materials: { roe: 12, netMargin: 10, peRatio: 15, dividendYield: 2.5, debtToEquity: 0.7, beta: 1.1, institutionalOwnership: 55 },
  Utilities: { roe: 9, netMargin: 15, peRatio: 18, dividendYield: 4, debtToEquity: 1.2, beta: 0.5, institutionalOwnership: 60 },
  'Real Estate': { roe: 8, netMargin: 20, peRatio: 30, dividendYield: 4, debtToEquity: 1.5, beta: 0.6, institutionalOwnership: 65 },
  Communication: { roe: 16, netMargin: 15, peRatio: 20, dividendYield: 2, debtToEquity: 1.0, beta: 1.0, institutionalOwnership: 70 },
  Default: { roe: 13, netMargin: 10, peRatio: 18, dividendYield: 2, debtToEquity: 0.8, beta: 1.0, institutionalOwnership: 60 },
};

function getSectorDefaults(sector?: string): SectorDefaults {
  if (!sector) return SECTOR_DEFAULTS.Default;
  return SECTOR_DEFAULTS[sector] ?? SECTOR_DEFAULTS.Default;
}

// ═══════════════════════════════════════════════════════════════
// COUNTRY-SPECIFIC WEIGHT ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════

export const COUNTRY_WEIGHTS: Record<string, Record<string, number>> = {
  US: { profitability: 1.0, valuation: 1.0, growth: 1.1, financialHealth: 1.0, dividend: 0.9, technical: 1.0, momentum: 1.0, analyst: 1.1, institutional: 1.0, marketSentiment: 1.0, sectorRotation: 1.0, macro: 1.0 },
  JP: { profitability: 1.0, valuation: 1.0, growth: 0.8, financialHealth: 1.2, dividend: 1.2, technical: 1.0, momentum: 0.9, analyst: 0.9, institutional: 0.8, marketSentiment: 0.9, sectorRotation: 1.0, macro: 1.1 },
  GB: { profitability: 1.0, valuation: 1.1, growth: 0.9, financialHealth: 1.1, dividend: 1.3, technical: 0.9, momentum: 0.9, analyst: 0.9, institutional: 1.0, marketSentiment: 0.9, sectorRotation: 1.0, macro: 1.1 },
  DE: { profitability: 1.0, valuation: 1.1, growth: 0.8, financialHealth: 1.2, dividend: 1.2, technical: 0.9, momentum: 0.9, analyst: 0.8, institutional: 0.9, marketSentiment: 0.9, sectorRotation: 1.0, macro: 1.2 },
  FR: { profitability: 1.0, valuation: 1.1, growth: 0.8, financialHealth: 1.1, dividend: 1.3, technical: 0.9, momentum: 0.9, analyst: 0.8, institutional: 0.9, marketSentiment: 0.9, sectorRotation: 1.0, macro: 1.2 },
  IN: { profitability: 1.0, valuation: 0.9, growth: 1.3, financialHealth: 1.0, dividend: 0.8, technical: 1.1, momentum: 1.2, analyst: 1.0, institutional: 0.8, marketSentiment: 1.1, sectorRotation: 1.1, macro: 1.1 },
};

function getCountryWeight(country: string | undefined, dimKey: string): number {
  if (!country) return 1.0;
  const weights = COUNTRY_WEIGHTS[country];
  if (!weights) return 1.0;
  return weights[dimKey] ?? 1.0;
}

// ═══════════════════════════════════════════════════════════════
// HIERARCHY TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface StockSubAspect {
  key: string;
  name: string;
  nameFa: string;
  scoreFn: (quote: StockQuote, sectorDefaults: SectorDefaults) => number;
}

export interface StockAspect {
  key: string;
  name: string;
  nameFa: string;
  subAspects: StockSubAspect[];
}

export interface StockSubDimension {
  key: string;
  name: string;
  nameFa: string;
  aspects: StockAspect[];
}

export interface StockDimension {
  key: string;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  subDimensions: StockSubDimension[];
}

// ═══════════════════════════════════════════════════════════════
// RESULT TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface StockSubAspectScore {
  key: string;
  name: string;
  score: number;
}

export interface StockAspectScore {
  key: string;
  name: string;
  score: number;
  subAspects: StockSubAspectScore[];
}

export interface StockSubDimensionScore {
  key: string;
  name: string;
  score: number;
  aspects: StockAspectScore[];
}

export interface StockDimensionScore {
  key: string;
  name: string;
  score: number;
  previousScore?: number;
  subDimensions: StockSubDimensionScore[];
}

export interface StockScoreResult {
  aiScore: number;           // 1-10 composite
  confidence: 'high' | 'medium' | 'low';
  dimensions: StockDimensionScore[];
  profitabilityScore: number;
  valuationScore: number;
  growthScore: number;
  financialHealthScore: number;
  dividendScore: number;
  technicalScore: number;
  momentumScore: number;
  analystScore: number;
  institutionalScore: number;
  marketSentimentScore: number;
  sectorRotationScore: number;
  macroScore: number;
}

// ═══════════════════════════════════════════════════════════════
// 12 STOCK DIMENSIONS — FULL 4-LEVEL HIERARCHY
// ═══════════════════════════════════════════════════════════════

export const STOCK_DIMENSIONS: StockDimension[] = [
  // ─────────────── Dimension 1: Profitability ───────────────
  {
    key: 'profitability',
    name: 'Profitability',
    nameFa: 'سودآوری',
    color: '#10b981',
    icon: 'TrendingUp',
    subDimensions: [
      {
        key: 'returnMetrics',
        name: 'Return Metrics',
        nameFa: 'شاخص‌های بازده',
        aspects: [
          {
            key: 'roe',
            name: 'ROE',
            nameFa: 'بازده حقوق صاحبان سهام',
            subAspects: [
              {
                key: 'roe_vs_industry',
                name: 'ROE vs Industry',
                nameFa: 'بازده سهام در مقابل صنعت',
                scoreFn: (q, sd) => {
                  const roe = safeNum(q.roe, sd.roe);
                  const industryRoe = sd.roe;
                  if (industryRoe === 0) return 5;
                  const ratio = roe / industryRoe;
                  // ratio 1.0 = at industry level → score 6
                  // ratio > 1 = above industry → higher
                  // ratio < 1 = below → lower
                  return clamp(normalizeSmooth(ratio, 0.3, 2.0));
                },
              },
              {
                key: 'roe_trend',
                name: 'ROE Trend',
                nameFa: 'روند بازده سهام',
                scoreFn: (q, sd) => {
                  const roe = safeNum(q.roe, sd.roe);
                  // Use changePct as proxy for ROE trend direction
                  // If price is rising, assume improving ROE trend
                  const trendProxy = safeNum(q.changePct, 0);
                  // Map: -5% to +5% price change as proxy for ROE trend
                  return clamp(normalizeSmooth(trendProxy, -5, 5));
                },
              },
            ],
          },
          {
            key: 'roa',
            name: 'ROA',
            nameFa: 'بازده دارایی‌ها',
            subAspects: [
              {
                key: 'roa_level',
                name: 'ROA Level',
                nameFa: 'سطح بازده دارایی‌ها',
                scoreFn: (q, sd) => {
                  const roa = safeNum(q.roa, sd.roe * 0.4);
                  // ROA typically ranges 0-20%
                  return clamp(normalizeSmooth(roa, 0, 20));
                },
              },
              {
                key: 'roa_trend',
                name: 'ROA Trend',
                nameFa: 'روند بازده دارایی‌ها',
                scoreFn: (q, sd) => {
                  const roa = safeNum(q.roa, sd.roe * 0.4);
                  // Use price momentum as proxy for ROA trend
                  const trendProxy = safeNum(q.changePct, 0) * 0.5;
                  return clamp(normalizeSmooth(trendProxy, -3, 3));
                },
              },
            ],
          },
          {
            key: 'roic',
            name: 'ROIC',
            nameFa: 'بازده سرمایه invested',
            subAspects: [
              {
                key: 'roic_level',
                name: 'ROIC Level',
                nameFa: 'سطح بازده سرمایه',
                scoreFn: (q, sd) => {
                  const roic = estimateRoic(q, sd);
                  // ROIC typically ranges 0-25%
                  return clamp(normalizeSmooth(roic, 0, 25));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'marginAnalysis',
        name: 'Margin Analysis',
        nameFa: 'تحلیل حاشیه سود',
        aspects: [
          {
            key: 'netMargin',
            name: 'Net Margin',
            nameFa: 'حاشیه سود خالص',
            subAspects: [
              {
                key: 'net_margin_level',
                name: 'Net Margin Level',
                nameFa: 'سطح حاشیه سود خالص',
                scoreFn: (q, sd) => {
                  const margin = safeNum(q.netMargin, sd.netMargin);
                  // Net margin ranges: -5% to 30%
                  return clamp(normalizeSmooth(margin, -5, 30));
                },
              },
              {
                key: 'net_margin_trend',
                name: 'Net Margin Trend',
                nameFa: 'روند حاشیه سود خالص',
                scoreFn: (q, sd) => {
                  const margin = safeNum(q.netMargin, sd.netMargin);
                  // Use price change % as proxy for margin trend
                  const trendProxy = safeNum(q.changePct, 0) * 0.4;
                  return clamp(normalizeSmooth(trendProxy, -3, 3));
                },
              },
            ],
          },
          {
            key: 'grossMargin',
            name: 'Gross Margin',
            nameFa: 'حاشیه سود ناخالص',
            subAspects: [
              {
                key: 'gross_margin_vs_industry',
                name: 'Gross Margin vs Industry',
                nameFa: 'حاشیه ناخالص در مقابل صنعت',
                scoreFn: (q, sd) => {
                  const gm = estimateGrossMargin(q, sd);
                  const industryGm = sd.netMargin + 20;
                  if (industryGm === 0) return 5;
                  const ratio = gm / industryGm;
                  return clamp(normalizeSmooth(ratio, 0.5, 2.0));
                },
              },
            ],
          },
          {
            key: 'operatingMargin',
            name: 'Operating Margin',
            nameFa: 'حاشیه سود عملیاتی',
            subAspects: [
              {
                key: 'op_margin_level',
                name: 'Op Margin Level',
                nameFa: 'سطح حاشیه عملیاتی',
                scoreFn: (q, sd) => {
                  const opMargin = estimateOperatingMargin(q, sd);
                  // Operating margin ranges: -5% to 35%
                  return clamp(normalizeSmooth(opMargin, -5, 35));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 2: Valuation ───────────────
  {
    key: 'valuation',
    name: 'Valuation',
    nameFa: 'ارزش‌گذاری',
    color: '#3b82f6',
    icon: 'Calculator',
    subDimensions: [
      {
        key: 'priceRatios',
        name: 'Price Ratios',
        nameFa: 'نسبت‌های قیمتی',
        aspects: [
          {
            key: 'peRatio',
            name: 'P/E Ratio',
            nameFa: 'نسبت قیمت به سود',
            subAspects: [
              {
                key: 'pe_vs_industry',
                name: 'PE vs Industry',
                nameFa: 'نسبت P/E در مقابل صنعت',
                scoreFn: (q, sd) => {
                  const pe = safeNum(q.peRatio, sd.peRatio);
                  const industryPe = sd.peRatio;
                  if (industryPe === 0) return 5;
                  const ratio = pe / industryPe;
                  // Lower PE vs industry = better value → higher score
                  return clamp(normalizeSmooth(2.0 - ratio, -0.5, 2.0));
                },
              },
              {
                key: 'pe_vs_historical',
                name: 'PE vs Historical',
                nameFa: 'نسبت P/E در مقابل تاریخی',
                scoreFn: (q, sd) => {
                  const pe = safeNum(q.peRatio, sd.peRatio);
                  // Use sector default as "historical average" proxy
                  const pe5yAvg = sd.peRatio;
                  if (pe5yAvg === 0) return 5;
                  const ratio = pe / pe5yAvg;
                  // Below historical average = undervalued → higher score
                  return clamp(normalizeSmooth(2.0 - ratio, -0.5, 2.0));
                },
              },
            ],
          },
          {
            key: 'pbRatio',
            name: 'P/B Ratio',
            nameFa: 'نسبت قیمت به دفتری',
            subAspects: [
              {
                key: 'pb_level',
                name: 'PB Level',
                nameFa: 'سطح نسبت P/B',
                scoreFn: (q, _sd) => {
                  const pb = safeNum(q.pbRatio, 2.0);
                  // Lower PB = better value for most stocks; range 0.5-5
                  return clamp(normalizeSmooth(5.0 - pb, -2, 5));
                },
              },
            ],
          },
          {
            key: 'psRatio',
            name: 'P/S Ratio',
            nameFa: 'نسبت قیمت به فروش',
            subAspects: [
              {
                key: 'ps_level',
                name: 'PS Level',
                nameFa: 'سطح نسبت P/S',
                scoreFn: (q, sd) => {
                  const ps = safeNum(q.psRatio, sd.peRatio * 0.3);
                  // Lower PS = better value; range 0.5-8
                  return clamp(normalizeSmooth(8.0 - ps, -2, 8));
                },
              },
            ],
          },
          {
            key: 'evEbitda',
            name: 'EV/EBITDA',
            nameFa: 'نسبت EV/EBITDA',
            subAspects: [
              {
                key: 'ev_ebitda_vs_sector',
                name: 'EV/EBITDA vs Sector',
                nameFa: 'EV/EBITDA در مقابل بخش',
                scoreFn: (q, sd) => {
                  // Derive EV/EBITDA from PE (roughly PE * 0.6)
                  const pe = safeNum(q.peRatio, sd.peRatio);
                  const evEbitda = pe * 0.6;
                  const sectorEvEbitda = sd.peRatio * 0.6;
                  if (sectorEvEbitda === 0) return 5;
                  const ratio = evEbitda / sectorEvEbitda;
                  return clamp(normalizeSmooth(2.0 - ratio, -0.5, 2.0));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'relativeValuation',
        name: 'Relative Valuation',
        nameFa: 'ارزش‌گذاری نسبی',
        aspects: [
          {
            key: 'peRelative',
            name: 'P/E Relative',
            nameFa: 'نسبت P/E نسبی',
            subAspects: [
              {
                key: 'pe_vs_industry_rel',
                name: 'PE vs Industry (Relative)',
                nameFa: 'نسبت P/E نسبی با صنعت',
                scoreFn: (q, sd) => {
                  const pe = safeNum(q.peRatio, sd.peRatio);
                  const industryPe = sd.peRatio;
                  if (industryPe === 0) return 5;
                  const discount = (industryPe - pe) / industryPe;
                  // Positive discount = undervalued
                  return clamp(normalizeSmooth(discount + 0.5, -0.5, 1.5));
                },
              },
            ],
          },
          {
            key: 'pbRelative',
            name: 'P/B Relative',
            nameFa: 'نسبت P/B نسبی',
            subAspects: [
              {
                key: 'pb_vs_industry_rel',
                name: 'PB vs Industry (Relative)',
                nameFa: 'نسبت P/B نسبی با صنعت',
                scoreFn: (q, sd) => {
                  const pb = safeNum(q.pbRatio, 2.0);
                  // Industry PB roughly correlated with sector leverage
                  const industryPb = sd.debtToEquity > 1.0 ? 1.0 : 2.5;
                  if (industryPb <= 0) return 5;
                  const discount = (industryPb - pb) / industryPb;
                  return clamp(normalizeSmooth(discount + 0.5, -0.5, 1.5));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 3: Growth ───────────────
  {
    key: 'growth',
    name: 'Growth',
    nameFa: 'رشد',
    color: '#8b5cf6',
    icon: 'Sprout',
    subDimensions: [
      {
        key: 'revenueGrowth',
        name: 'Revenue Growth',
        nameFa: 'رشد درآمد',
        aspects: [
          {
            key: 'revenueGrowthRate',
            name: 'Revenue Growth Rate',
            nameFa: 'نرخ رشد درآمد',
            subAspects: [
              {
                key: 'revenue_1y_growth',
                name: 'Revenue 1Y Growth',
                nameFa: 'رشد درآمد یک‌ساله',
                scoreFn: (q, sd) => {
                  const growth = safeNum(q.revenueGrowth, 8);
                  // Revenue growth ranges: -10% to 40%
                  return clamp(normalizeSmooth(growth, -10, 40));
                },
              },
              {
                key: 'revenue_3y_cagr',
                name: 'Revenue 3Y CAGR',
                nameFa: 'میانگین رشد درآمد ۳ ساله',
                scoreFn: (q, sd) => {
                  const growth1y = safeNum(q.revenueGrowth, 8);
                  const cagr3y = estimate3yCagr(q.revenueGrowth, 7);
                  // If we have real 1Y data, use the estimate; otherwise fallback
                  const cagr = q.revenueGrowth !== undefined ? cagr3y : 7;
                  return clamp(normalizeSmooth(cagr, -5, 30));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'earningsGrowth',
        name: 'Earnings Growth',
        nameFa: 'رشد سود',
        aspects: [
          {
            key: 'epsGrowth',
            name: 'EPS Growth',
            nameFa: 'رشد سود هر سهم',
            subAspects: [
              {
                key: 'eps_1y_growth',
                name: 'EPS 1Y Growth',
                nameFa: 'رشد سود هر سهم یک‌ساله',
                scoreFn: (q, sd) => {
                  const growth = safeNum(q.epsGrowth, 10);
                  // EPS growth ranges: -20% to 50%
                  return clamp(normalizeSmooth(growth, -20, 50));
                },
              },
              {
                key: 'eps_3y_cagr',
                name: 'EPS 3Y CAGR',
                nameFa: 'میانگین رشد سود ۳ ساله',
                scoreFn: (q, sd) => {
                  const cagr3y = estimate3yCagr(q.epsGrowth, 8);
                  const cagr = q.epsGrowth !== undefined ? cagr3y : 8;
                  return clamp(normalizeSmooth(cagr, -10, 35));
                },
              },
            ],
          },
          {
            key: 'forwardGrowth',
            name: 'Forward Growth',
            nameFa: 'رشد آینده',
            subAspects: [
              {
                key: 'forward_pe_growth',
                name: 'Forward PE Growth',
                nameFa: 'رشد نسبت P/E آینده',
                scoreFn: (q, sd) => {
                  const pe = safeNum(q.peRatio, sd.peRatio);
                  // Forward PE estimate: use sector default as "forward" proxy
                  // If current PE < sector PE, market expects growth
                  const fwdPe = sd.peRatio;
                  if (pe === 0) return 5;
                  const ratio = fwdPe / pe;
                  // Forward PE < Trailing PE → expected growth (higher score)
                  return clamp(normalizeSmooth(ratio, 0.5, 2.0));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 4: Financial Health ───────────────
  {
    key: 'financialHealth',
    name: 'Financial Health',
    nameFa: 'سلامت مالی',
    color: '#06b6d4',
    icon: 'Shield',
    subDimensions: [
      {
        key: 'leverage',
        name: 'Leverage',
        nameFa: 'اهرم مالی',
        aspects: [
          {
            key: 'debtToEquity',
            name: 'Debt/Equity',
            nameFa: 'نسبت بدهی به حقوق سهام',
            subAspects: [
              {
                key: 'de_vs_industry',
                name: 'D/E vs Industry',
                nameFa: 'نسبت D/E در مقابل صنعت',
                scoreFn: (q, sd) => {
                  const de = safeNum(q.debtToEquity, sd.debtToEquity);
                  const industryDe = sd.debtToEquity;
                  if (industryDe === 0) return 7;
                  const ratio = de / industryDe;
                  // Lower D/E than industry = better
                  return clamp(normalizeSmooth(2.0 - ratio, -1, 2));
                },
              },
              {
                key: 'de_trend',
                name: 'D/E Trend',
                nameFa: 'روند نسبت D/E',
                scoreFn: (q, sd) => {
                  const de = safeNum(q.debtToEquity, sd.debtToEquity);
                  // Use price change as proxy: rising stock may indicate de-leveraging
                  const trendProxy = safeNum(q.changePct, 0) * 0.2;
                  // Decreasing D/E = positive trend
                  return clamp(normalizeSmooth(trendProxy, -2, 2));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'liquidity',
        name: 'Liquidity',
        nameFa: 'نقدینگی',
        aspects: [
          {
            key: 'currentRatio',
            name: 'Current Ratio',
            nameFa: 'نسبت جاری',
            subAspects: [
              {
                key: 'current_ratio_level',
                name: 'Current Ratio Level',
                nameFa: 'سطح نسبت جاری',
                scoreFn: (q, _sd) => {
                  const cr = safeNum(q.currentRatio, 1.5);
                  // 1.5-2.5 is healthy; below 1 is risky, above 3 is very safe
                  return clamp(normalizeSmooth(cr, 0.5, 3.5));
                },
              },
            ],
          },
          {
            key: 'interestCoverage',
            name: 'Interest Coverage',
            nameFa: 'پوشش بهره',
            subAspects: [
              {
                key: 'interest_coverage_level',
                name: 'Interest Coverage Level',
                nameFa: 'سطح پوشش بهره',
                scoreFn: (q, sd) => {
                  const ic = estimateInterestCoverage(q, sd);
                  // Higher is better: <1.5 = risky, >6 = strong
                  return clamp(normalizeSmooth(ic, 0, 12));
                },
              },
            ],
          },
          {
            key: 'cashFlowAdequacy',
            name: 'Cash Flow Adequacy',
            nameFa: 'کفایت جریان نقد',
            subAspects: [
              {
                key: 'cash_flow_adequacy_level',
                name: 'Cash Flow Adequacy',
                nameFa: 'سطح کفایت جریان نقد',
                scoreFn: (q, sd) => {
                  // Use net margin and current ratio as proxies for cash flow adequacy
                  const netM = safeNum(q.netMargin, sd.netMargin);
                  const cr = safeNum(q.currentRatio, 1.5);
                  // Combined score: healthy margins + good liquidity
                  const combined = (netM / 10) + (cr / 3);
                  return clamp(normalizeSmooth(combined, 0, 2));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 5: Dividend ───────────────
  {
    key: 'dividend',
    name: 'Dividend',
    nameFa: 'سود سهام',
    color: '#f59e0b',
    icon: 'Coins',
    subDimensions: [
      {
        key: 'yield',
        name: 'Yield',
        nameFa: 'بازده سود',
        aspects: [
          {
            key: 'dividendYield',
            name: 'Dividend Yield',
            nameFa: 'بازده سود سهام',
            subAspects: [
              {
                key: 'yield_vs_market',
                name: 'Yield vs Market',
                nameFa: 'بازده در مقابل بازار',
                scoreFn: (q, _sd) => {
                  const yieldVal = safeNum(q.dividendYield, 1.8);
                  // Average market yield ~1.8%
                  const marketYield = 1.8;
                  const ratio = yieldVal / marketYield;
                  return clamp(normalizeSmooth(ratio, 0, 3));
                },
              },
              {
                key: 'yield_vs_sector',
                name: 'Yield vs Sector',
                nameFa: 'بازده در مقابل بخش',
                scoreFn: (q, sd) => {
                  const yieldVal = safeNum(q.dividendYield, sd.dividendYield);
                  const sectorYield = sd.dividendYield;
                  if (sectorYield === 0) return 5;
                  const ratio = yieldVal / sectorYield;
                  return clamp(normalizeSmooth(ratio, 0, 2.5));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'sustainability',
        name: 'Sustainability',
        nameFa: 'پایداری',
        aspects: [
          {
            key: 'payoutRatio',
            name: 'Payout Ratio',
            nameFa: 'نسبت پرداخت',
            subAspects: [
              {
                key: 'payout_level',
                name: 'Payout Level',
                nameFa: 'سطح نسبت پرداخت',
                scoreFn: (q, _sd) => {
                  const payout = safeNum(q.payoutRatio, 50);
                  // 30-60% ideal; >80% risky; <20% stingy
                  if (payout <= 0) return 3;
                  if (payout > 100) return 2;
                  if (payout >= 30 && payout <= 60) return 9;
                  if (payout >= 20 && payout < 30) return 7;
                  if (payout > 60 && payout <= 80) return 6;
                  if (payout > 80 && payout <= 100) return 4;
                  return 5;
                },
              },
            ],
          },
          {
            key: 'dividendGrowth',
            name: 'Dividend Growth',
            nameFa: 'رشد سود سهام',
            subAspects: [
              {
                key: 'div_growth_3y',
                name: 'Div Growth 3Y',
                nameFa: 'رشد سود ۳ ساله',
                scoreFn: (q, _sd) => {
                  // Use dividend yield + payout stability as proxy for div growth
                  const yieldVal = safeNum(q.dividendYield, 1.8);
                  const payout = safeNum(q.payoutRatio, 50);
                  // Moderate payout + reasonable yield suggests growing dividends
                  const growthProxy = (payout >= 20 && payout <= 60) ? yieldVal * 1.5 : yieldVal * 0.5;
                  return clamp(normalizeSmooth(growthProxy, -2, 10));
                },
              },
              {
                key: 'div_growth_5y',
                name: 'Div Growth 5Y',
                nameFa: 'رشد سود ۵ ساله',
                scoreFn: (q, _sd) => {
                  const yieldVal = safeNum(q.dividendYield, 1.8);
                  const payout = safeNum(q.payoutRatio, 50);
                  const growthProxy = (payout >= 20 && payout <= 60) ? yieldVal * 1.2 : yieldVal * 0.3;
                  // 5Y growth typically lower than 3Y
                  return clamp(normalizeSmooth(growthProxy, -2, 8));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 6: Technical Analysis ───────────────
  {
    key: 'technical',
    name: 'Technical Analysis',
    nameFa: 'تحلیل تکنیکال',
    color: '#ef4444',
    icon: 'CandlestickChart',
    subDimensions: [
      {
        key: 'trendIndicators',
        name: 'Trend Indicators',
        nameFa: 'شاخص‌های روند',
        aspects: [
          {
            key: 'sma',
            name: 'SMA 20/50/200',
            nameFa: 'میانگین متحرک ۲۰/۵۰/۲۰۰',
            subAspects: [
              {
                key: 'price_vs_sma20',
                name: 'Price vs SMA20',
                nameFa: 'قیمت در مقابل SMA20',
                scoreFn: (q, _sd) => {
                  const price = q.price;
                  const sma20 = safeNum(q.sma20, price);
                  if (sma20 === 0) return 5;
                  const pct = ((price - sma20) / sma20) * 100;
                  // Slightly above SMA20 is bullish; too far = overextended
                  return clamp(normalizeSmooth(pct, -10, 10));
                },
              },
              {
                key: 'price_vs_sma50',
                name: 'Price vs SMA50',
                nameFa: 'قیمت در مقابل SMA50',
                scoreFn: (q, _sd) => {
                  const price = q.price;
                  const sma50 = safeNum(q.sma50, price);
                  if (sma50 === 0) return 5;
                  const pct = ((price - sma50) / sma50) * 100;
                  return clamp(normalizeSmooth(pct, -15, 15));
                },
              },
              {
                key: 'price_vs_sma200',
                name: 'Price vs SMA200',
                nameFa: 'قیمت در مقابل SMA200',
                scoreFn: (q, _sd) => {
                  const price = q.price;
                  const sma200 = safeNum(q.sma200, price);
                  if (sma200 === 0) return 5;
                  const pct = ((price - sma200) / sma200) * 100;
                  return clamp(normalizeSmooth(pct, -20, 20));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'oscillators',
        name: 'Oscillators',
        nameFa: 'نوسان‌گرها',
        aspects: [
          {
            key: 'rsi',
            name: 'RSI',
            nameFa: 'شاخص قدرت نسبی',
            subAspects: [
              {
                key: 'rsi_level',
                name: 'RSI Level',
                nameFa: 'سطح RSI',
                scoreFn: (q, _sd) => {
                  const rsi = safeNum(q.rsi14, 50);
                  return rsiSignal(rsi);
                },
              },
            ],
          },
          {
            key: 'macd',
            name: 'MACD',
            nameFa: 'MACD',
            subAspects: [
              {
                key: 'macd_signal',
                name: 'MACD Signal',
                nameFa: 'سیگنال MACD',
                scoreFn: (q, _sd) => {
                  // Derive MACD signal from SMA crossover and RSI
                  const price = q.price;
                  const sma20 = safeNum(q.sma20, price);
                  const sma50 = safeNum(q.sma50, price);
                  const rsi = safeNum(q.rsi14, 50);
                  // SMA20 > SMA50 = bullish crossover
                  const smaDiff = sma50 > 0 ? ((sma20 - sma50) / sma50) * 100 : 0;
                  // RSI confirmation
                  const rsiFactor = (rsi - 50) / 50; // -1 to 1
                  const combined = smaDiff * 0.7 + rsiFactor * 3;
                  return clamp(normalizeSmooth(combined, -5, 5));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 7: Momentum ───────────────
  {
    key: 'momentum',
    name: 'Momentum',
    nameFa: 'مومنتوم',
    color: '#f97316',
    icon: 'Zap',
    subDimensions: [
      {
        key: 'priceMomentum',
        name: 'Price Momentum',
        nameFa: 'مومنتوم قیمت',
        aspects: [
          {
            key: 'returns',
            name: '1M/3M/6M Returns',
            nameFa: 'بازده ۱/۳/۶ ماهه',
            subAspects: [
              {
                key: '1m_return',
                name: '1M Return',
                nameFa: 'بازده یک‌ماهه',
                scoreFn: (q, _sd) => {
                  // Use changePct as 1M proxy
                  const ret = safeNum(q.changePct, 0);
                  return clamp(normalizeSmooth(ret, -15, 15));
                },
              },
              {
                key: '3m_return',
                name: '3M Return',
                nameFa: 'بازده سه‌ماهه',
                scoreFn: (q, _sd) => {
                  // Use 52w position and changePct as 3M proxy
                  const pos52w = compute52wPosition(q);
                  const changePct = safeNum(q.changePct, 0);
                  // Blend: 60% recent change + 40% 52w position
                  const ret3m = pos52w !== undefined
                    ? changePct * 0.6 + (pos52w - 0.5) * 30 * 0.4
                    : changePct * 1.5;
                  return clamp(normalizeSmooth(ret3m, -25, 25));
                },
              },
              {
                key: '6m_return',
                name: '6M Return',
                nameFa: 'بازده شش‌ماهه',
                scoreFn: (q, _sd) => {
                  // Use 52w position as 6M proxy
                  const pos52w = compute52wPosition(q);
                  if (pos52w === undefined) {
                    // Fallback: use changePct amplified
                    const changePct = safeNum(q.changePct, 0);
                    return clamp(normalizeSmooth(changePct * 2, -35, 35));
                  }
                  // Map 52w position to a 6M return estimate
                  const ret6m = (pos52w - 0.5) * 60;
                  return clamp(normalizeSmooth(ret6m, -35, 35));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'relativeStrength',
        name: 'Relative Strength',
        nameFa: 'قدرت نسبی',
        aspects: [
          {
            key: 'vsSector',
            name: 'vs Sector',
            nameFa: 'در مقابل بخش',
            subAspects: [
              {
                key: 'relative_strength_vs_sector',
                name: 'Relative Strength vs Sector',
                nameFa: 'قدرت نسبی در مقابل بخش',
                scoreFn: (q, _sd) => {
                  // Use ROE vs sector as proxy for relative strength
                  // Companies with high ROE tend to outperform sector
                  const roe = safeNum(q.roe, 10);
                  const eps = safeNum(q.eps, 5);
                  // Blend fundamentals with recent performance
                  const strength = (roe / 20) * 3 + safeNum(q.changePct, 0) * 0.3;
                  return clamp(normalizeSmooth(strength, -5, 5));
                },
              },
            ],
          },
          {
            key: 'vsMarket',
            name: 'vs Market',
            nameFa: 'در مقابل بازار',
            subAspects: [
              {
                key: 'alpha_vs_market',
                name: 'Alpha vs Market',
                nameFa: 'آلفا در مقابل بازار',
                scoreFn: (q, _sd) => {
                  const stockReturn = safeNum(q.changePct, 0);
                  const beta = safeNum(q.beta, 1.0);
                  // Assume market return ~0 (daily/weekly view)
                  // Alpha = stock return - beta * market return
                  // When market ~0: alpha ≈ stock return - 0
                  const alpha = stockReturn;
                  return clamp(normalizeSmooth(alpha, -10, 10));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 8: Analyst Coverage ───────────────
  {
    key: 'analyst',
    name: 'Analyst Coverage',
    nameFa: 'پوشش تحلیلگران',
    color: '#6366f1',
    icon: 'Users',
    subDimensions: [
      {
        key: 'ratings',
        name: 'Ratings',
        nameFa: 'رتبه‌بندی',
        aspects: [
          {
            key: 'consensusRating',
            name: 'Consensus Rating',
            nameFa: 'رتبه‌بندی اجماع',
            subAspects: [
              {
                key: 'buy_pct',
                name: 'Buy %',
                nameFa: 'درصد خرید',
                scoreFn: (q, _sd) => {
                  // analystRating: 1=Strong Buy, 2=Buy, 3=Hold, 4=Sell, 5=Strong Sell
                  const rating = safeNum(q.analystRating, 3);
                  // Map 1-5 rating to buy percentage: 1→80%, 2→60%, 3→40%, 4→20%, 5→10%
                  const buyPct = rating <= 1 ? 80 : rating <= 2 ? 60 : rating <= 3 ? 40 : rating <= 4 ? 20 : 10;
                  return clamp(normalizeSmooth(buyPct, 0, 80));
                },
              },
              {
                key: 'hold_pct',
                name: 'Hold %',
                nameFa: 'درصد نگهداری',
                scoreFn: (q, _sd) => {
                  const rating = safeNum(q.analystRating, 3);
                  // Hold is typically highest for rating 3
                  const holdPct = rating <= 2 ? 20 : rating <= 3 ? 40 : rating <= 4 ? 30 : 20;
                  // Moderate hold % is neutral, too high suggests uncertainty
                  const score = 50 - Math.abs(holdPct - 30);
                  return clamp(normalizeSmooth(score, 0, 50));
                },
              },
              {
                key: 'sell_pct',
                name: 'Sell %',
                nameFa: 'درصد فروش',
                scoreFn: (q, _sd) => {
                  const rating = safeNum(q.analystRating, 3);
                  const sellPct = rating <= 2 ? 5 : rating <= 3 ? 15 : rating <= 4 ? 35 : 50;
                  // Lower sell % = better
                  return clamp(normalizeSmooth(30 - sellPct, 0, 30));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'targetPrices',
        name: 'Target Prices',
        nameFa: 'قیمت‌های هدف',
        aspects: [
          {
            key: 'targetUpside',
            name: 'Target Upside',
            nameFa: 'پتانسیل رشد',
            subAspects: [
              {
                key: 'target_upside_pct',
                name: 'Target Upside %',
                nameFa: 'درصد پتانسیل رشد',
                scoreFn: (q, _sd) => {
                  const upside = computeTargetUpside(q);
                  if (upside === undefined) {
                    // Fallback: use analyst rating as proxy
                    const rating = safeNum(q.analystRating, 3);
                    const proxyUpside = rating <= 1 ? 25 : rating <= 2 ? 15 : rating <= 3 ? 5 : rating <= 4 ? -10 : -20;
                    return clamp(normalizeSmooth(proxyUpside, -20, 40));
                  }
                  return clamp(normalizeSmooth(upside, -20, 40));
                },
              },
            ],
          },
          {
            key: 'ratingTrend',
            name: 'Rating Trend',
            nameFa: 'روند رتبه‌بندی',
            subAspects: [
              {
                key: 'rating_trend_direction',
                name: 'Rating Trend Direction',
                nameFa: 'جهت روند رتبه‌بندی',
                scoreFn: (q, _sd) => {
                  // Use analyst rating + price momentum as proxy for rating trend
                  const rating = safeNum(q.analystRating, 3);
                  const changePct = safeNum(q.changePct, 0);
                  // Low rating (buy) + rising price = upgrades likely
                  // High rating (sell) + falling price = downgrades likely
                  const ratingFactor = (3 - rating); // -2 to +2
                  const trend = ratingFactor * 1.5 + changePct * 0.2;
                  return clamp(normalizeSmooth(trend, -5, 5));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 9: Institutional Ownership ───────────────
  {
    key: 'institutional',
    name: 'Institutional Ownership',
    nameFa: 'مالکیت نهادی',
    color: '#14b8a6',
    icon: 'Building2',
    subDimensions: [
      {
        key: 'ownershipLevel',
        name: 'Ownership Level',
        nameFa: 'سطح مالکیت',
        aspects: [
          {
            key: 'institutionalPct',
            name: 'Institutional %',
            nameFa: 'درصد مالکیت نهادی',
            subAspects: [
              {
                key: 'institutional_pct_level',
                name: 'Institutional % Level',
                nameFa: 'سطح درصد نهادی',
                scoreFn: (q, sd) => {
                  const pct = safeNum(q.institutionalOwnership, sd.institutionalOwnership);
                  // Higher institutional ownership = more confidence
                  return clamp(normalizeSmooth(pct, 20, 90));
                },
              },
            ],
          },
          {
            key: 'topHolders',
            name: 'Top Holders',
            nameFa: 'بزرگ‌ترین سهامداران',
            subAspects: [
              {
                key: 'concentration',
                name: 'Concentration',
                nameFa: 'تمرکز مالکیت',
                scoreFn: (q, sd) => {
                  // Estimate concentration from institutional ownership
                  const instPct = safeNum(q.institutionalOwnership, sd.institutionalOwnership);
                  // Higher institutional = likely higher concentration among top holders
                  // Moderate concentration (20-40%) is healthy
                  const conc = instPct * 0.5; // rough estimate: top 10 hold ~50% of institutional
                  if (conc >= 20 && conc <= 40) return 8;
                  if (conc >= 10 && conc < 20) return 6;
                  if (conc > 40 && conc <= 60) return 5;
                  if (conc > 60) return 3;
                  return 5;
                },
              },
            ],
          },
        ],
      },
      {
        key: 'insiderActivity',
        name: 'Insider Activity',
        nameFa: 'فعالیت افراد داخل',
        aspects: [
          {
            key: 'insiderBuyingSelling',
            name: 'Insider Buying/Selling',
            nameFa: 'خرید/فروش افراد داخل',
            subAspects: [
              {
                key: 'net_insider_buying',
                name: 'Net Insider Buying',
                nameFa: 'خرید خالص افراد داخل',
                scoreFn: (q, _sd) => {
                  // Use price momentum + analyst rating as proxy for insider sentiment
                  // Rising prices + good analyst ratings suggest positive insider activity
                  const rating = safeNum(q.analystRating, 3);
                  const changePct = safeNum(q.changePct, 0);
                  const insiderProxy = (3 - rating) * 0.5 + changePct * 0.2;
                  return clamp(normalizeSmooth(insiderProxy, -3, 3));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 10: Market Sentiment ───────────────
  {
    key: 'marketSentiment',
    name: 'Market Sentiment',
    nameFa: 'احساسات بازار',
    color: '#ec4899',
    icon: 'Heart',
    subDimensions: [
      {
        key: 'newsSentiment',
        name: 'News Sentiment',
        nameFa: 'احساسات خبری',
        aspects: [
          {
            key: 'newsScore',
            name: 'News Score',
            nameFa: 'امتیاز خبری',
            subAspects: [
              {
                key: 'news_sentiment_score',
                name: 'News Sentiment Score',
                nameFa: 'امتیاز احساسات خبری',
                scoreFn: (q, _sd) => {
                  // Use price change and volume as news sentiment proxy
                  const changePct = safeNum(q.changePct, 0);
                  const vol = safeNum(q.avgVolume, q.volume);
                  const volRatio = vol > 0 ? q.volume / vol : 1;
                  // Positive price + high volume = strong positive sentiment
                  const sentiment = changePct * 0.5 + (volRatio - 1) * 5;
                  // Normalize to 0-100 scale then to 1-10
                  const score = 50 + sentiment * 3;
                  return clamp(normalizeSmooth(score, 20, 80));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'socialSignals',
        name: 'Social Signals',
        nameFa: 'سیگنال‌های اجتماعی',
        aspects: [
          {
            key: 'socialMention',
            name: 'Social Mention',
            nameFa: 'اشاره‌های اجتماعی',
            subAspects: [
              {
                key: 'mention_volume',
                name: 'Mention Volume',
                nameFa: 'حجم اشارات',
                scoreFn: (q, _sd) => {
                  // Use volume vs avg volume as proxy for social attention
                  const vol = safeNum(q.avgVolume, q.volume);
                  const volRatio = vol > 0 ? q.volume / vol : 1;
                  // Higher volume ratio = more attention
                  const mentionProxy = Math.min(volRatio * 30, 90);
                  return clamp(normalizeSmooth(mentionProxy, 10, 90));
                },
              },
            ],
          },
          {
            key: 'sentimentTrend',
            name: 'Sentiment Trend',
            nameFa: 'روند احساسات',
            subAspects: [
              {
                key: 'sentiment_direction',
                name: 'Sentiment Direction',
                nameFa: 'جهت احساسات',
                scoreFn: (q, _sd) => {
                  // Use price change as sentiment direction proxy
                  const changePct = safeNum(q.changePct, 0);
                  return clamp(normalizeSmooth(changePct, -5, 5));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 11: Sector Rotation ───────────────
  {
    key: 'sectorRotation',
    name: 'Sector Rotation',
    nameFa: 'چرخش بخشی',
    color: '#84cc16',
    icon: 'RotateCw',
    subDimensions: [
      {
        key: 'sectorPerformance',
        name: 'Sector Performance',
        nameFa: 'عملکرد بخش',
        aspects: [
          {
            key: 'sectorVsMarket',
            name: 'Sector vs Market',
            nameFa: 'بخش در مقابل بازار',
            subAspects: [
              {
                key: 'sector_relative_performance',
                name: 'Sector Relative Performance',
                nameFa: 'عملکرد نسبی بخش',
                scoreFn: (q, _sd) => {
                  // Use sector-specific beta and price change
                  // High-beta sectors outperform in bull markets
                  const changePct = safeNum(q.changePct, 0);
                  const beta = safeNum(q.beta, 1.0);
                  // Sector-relative: stock performance vs implied sector move
                  const sectorMove = changePct / (beta || 1);
                  return clamp(normalizeSmooth(sectorMove, -10, 10));
                },
              },
            ],
          },
          {
            key: 'sectorMomentum',
            name: 'Sector Momentum',
            nameFa: 'مومنتوم بخش',
            subAspects: [
              {
                key: 'sector_momentum_score',
                name: 'Sector Momentum Score',
                nameFa: 'امتیاز مومنتوم بخش',
                scoreFn: (q, _sd) => {
                  // Use 52w position and price change as sector momentum proxy
                  const pos52w = compute52wPosition(q);
                  const changePct = safeNum(q.changePct, 0);
                  const momentum = pos52w !== undefined
                    ? pos52w * 60 + changePct
                    : 50 + changePct * 3;
                  return clamp(normalizeSmooth(momentum, 20, 80));
                },
              },
            ],
          },
        ],
      },
      {
        key: 'capitalFlow',
        name: 'Capital Flow',
        nameFa: 'جریان سرمایه',
        aspects: [
          {
            key: 'capitalInflowOutflow',
            name: 'Capital Inflow/Outflow',
            nameFa: 'ورود/خروج سرمایه',
            subAspects: [
              {
                key: 'capital_flow_direction',
                name: 'Capital Flow Direction',
                nameFa: 'جهت جریان سرمایه',
                scoreFn: (q, _sd) => {
                  // Use volume ratio and price change as capital flow proxy
                  const vol = safeNum(q.avgVolume, q.volume);
                  const volRatio = vol > 0 ? q.volume / vol : 1;
                  const changePct = safeNum(q.changePct, 0);
                  // Rising price + high volume = inflow
                  // Falling price + high volume = outflow
                  const flow = changePct * 0.5 * volRatio;
                  return clamp(normalizeSmooth(flow, -5, 5));
                },
              },
            ],
          },
        ],
      },
    ],
  },

  // ─────────────── Dimension 12: Macroeconomic ───────────────
  {
    key: 'macro',
    name: 'Macroeconomic',
    nameFa: 'اقتصاد کلان',
    color: '#78716c',
    icon: 'Globe',
    subDimensions: [
      {
        key: 'interestRates',
        name: 'Interest Rates',
        nameFa: 'نرخ بهره',
        aspects: [
          {
            key: 'rateEnvironment',
            name: 'Rate Environment',
            nameFa: 'محیط نرخ بهره',
            subAspects: [
              {
                key: 'real_rate_level',
                name: 'Real Rate Level',
                nameFa: 'سطح نرخ واقعی',
                scoreFn: (q, sd) => {
                  // Use P/E ratio and dividend yield to infer rate environment impact
                  // High P/E + low yield = low rate environment (bullish for growth)
                  // Low P/E + high yield = high rate environment (headwind)
                  const pe = safeNum(q.peRatio, sd.peRatio);
                  const divYield = safeNum(q.dividendYield, sd.dividendYield);
                  // Higher PE relative to sector = benefits from low rates
                  const peRatio = sd.peRatio > 0 ? pe / sd.peRatio : 1;
                  // Low rates favor high PE stocks
                  const rateProxy = peRatio > 1.2 ? 7 : peRatio < 0.8 ? 4 : 5;
                  // Dividend yield factor: high yield stocks benefit in high-rate env
                  const divFactor = divYield > 3 ? 6 : 5;
                  return clamp((rateProxy + divFactor) / 2);
                },
              },
            ],
          },
        ],
      },
      {
        key: 'economicIndicators',
        name: 'Economic Indicators',
        nameFa: 'شاخص‌های اقتصادی',
        aspects: [
          {
            key: 'gdpGrowth',
            name: 'GDP Growth',
            nameFa: 'رشد تولید ناخالص داخلی',
            subAspects: [
              {
                key: 'gdp_growth_impact',
                name: 'GDP Growth Impact',
                nameFa: 'تأثیر رشد تولید ناخالص داخلی',
                scoreFn: (q, sd) => {
                  // Cyclical sectors (Financial, Industrial, Consumer) benefit from GDP growth
                  // Defensive sectors (Utilities, Healthcare) are less correlated
                  const beta = safeNum(q.beta, sd.beta);
                  const changePct = safeNum(q.changePct, 0);
                  // High-beta stocks are more GDP-sensitive
                  const gdpSensitivity = beta * changePct * 0.3;
                  // Base score by sector defensiveness
                  const sector = q.sector;
                  const defensiveSectors = ['Utilities', 'Healthcare', 'Consumer'];
                  const isDefensive = defensiveSectors.includes(sector);
                  const baseScore = isDefensive ? 6 : 5;
                  return clamp(baseScore + gdpSensitivity);
                },
              },
            ],
          },
          {
            key: 'inflation',
            name: 'Inflation',
            nameFa: 'تورم',
            subAspects: [
              {
                key: 'inflation_impact',
                name: 'Inflation Impact',
                nameFa: 'تأثیر تورم',
                scoreFn: (q, sd) => {
                  // Inflation impacts: Energy/Materials benefit, Growth/Tech suffer
                  const sector = q.sector;
                  const inflationWinners = ['Energy', 'Materials', 'Financial'];
                  const inflationLosers = ['Technology', 'Communication', 'Real Estate'];
                  const isWinner = inflationWinners.includes(sector);
                  const isLoser = inflationLosers.includes(sector);
                  if (isWinner) return 7;
                  if (isLoser) return 4;
                  return 5;
                },
              },
            ],
          },
          {
            key: 'currency',
            name: 'Currency',
            nameFa: 'ارز',
            subAspects: [
              {
                key: 'currency_impact',
                name: 'Currency Impact',
                nameFa: 'تأثیر ارز',
                scoreFn: (q, _sd) => {
                  // Multinational exporters benefit from weak domestic currency
                  // Import-focused companies benefit from strong currency
                  // Use beta and change as proxy
                  const beta = safeNum(q.beta, 1.0);
                  const changePct = safeNum(q.changePct, 0);
                  // Low beta + positive change = stable currency environment
                  // High beta + volatile = uncertain currency impact
                  const stability = 10 - (beta * 2);
                  const momentum = changePct > 0 ? 1 : -1;
                  return clamp(normalizeSmooth(stability + momentum, -5, 10));
                },
              },
            ],
          },
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL DIMENSION SCORERS
// ═══════════════════════════════════════════════════════════════

/**
 * Compute a single dimension score by evaluating its full hierarchy.
 * Returns a structured StockDimensionScore with all levels.
 */
function computeDimensionScore(
  dimension: StockDimension,
  quote: StockQuote,
  sectorDefaults: SectorDefaults
): StockDimensionScore {
  const subDimensionScores: StockSubDimensionScore[] = [];

  for (const subDim of dimension.subDimensions) {
    const aspectScores: StockAspectScore[] = [];

    for (const aspect of subDim.aspects) {
      const subAspectScores: StockSubAspectScore[] = [];

      for (const subAspect of aspect.subAspects) {
        const rawScore = subAspect.scoreFn(quote, sectorDefaults);
        const score = clamp(rawScore);
        subAspectScores.push({
          key: subAspect.key,
          name: subAspect.name,
          score,
        });
      }

      // Aspect score = average of sub-aspect scores
      const aspectScore = clamp(avg(subAspectScores.map(s => s.score)));
      aspectScores.push({
        key: aspect.key,
        name: aspect.name,
        score: aspectScore,
        subAspects: subAspectScores,
      });
    }

    // Sub-dimension score = average of aspect scores
    const subDimScore = clamp(avg(aspectScores.map(a => a.score)));
    subDimensionScores.push({
      key: subDim.key,
      name: subDim.name,
      score: subDimScore,
      aspects: aspectScores,
    });
  }

  // Dimension score = average of sub-dimension scores
  const dimScore = clamp(avg(subDimensionScores.map(sd => sd.score)));

  return {
    key: dimension.key,
    name: dimension.name,
    score: dimScore,
    subDimensions: subDimensionScores,
  };
}

/** Score Profitability dimension (1-10) */
export function scoreProfitability(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'profitability');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Valuation dimension (1-10) */
export function scoreValuation(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'valuation');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Growth dimension (1-10) */
export function scoreGrowth(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'growth');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Financial Health dimension (1-10) */
export function scoreFinancialHealth(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'financialHealth');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Dividend dimension (1-10) */
export function scoreDividend(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'dividend');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Technical Analysis dimension (1-10) */
export function scoreTechnical(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'technical');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Momentum dimension (1-10) */
export function scoreMomentum(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'momentum');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Analyst Coverage dimension (1-10) */
export function scoreAnalyst(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'analyst');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Institutional Ownership dimension (1-10) */
export function scoreInstitutional(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'institutional');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Market Sentiment dimension (1-10) */
export function scoreMarketSentiment(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'marketSentiment');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Sector Rotation dimension (1-10) */
export function scoreSectorRotation(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'sectorRotation');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

/** Score Macroeconomic dimension (1-10) */
export function scoreMacro(quote: StockQuote, sectorDefaults: SectorDefaults): number {
  const dim = STOCK_DIMENSIONS.find(d => d.key === 'macro');
  if (!dim) return 5;
  return computeDimensionScore(dim, quote, sectorDefaults).score;
}

// ═══════════════════════════════════════════════════════════════
// DATA AVAILABILITY TRACKER
// ═══════════════════════════════════════════════════════════════

/**
 * Count how many StockQuote optional fields are actually populated (not undefined).
 * Used to determine confidence level.
 */
function countAvailableDataPoints(quote: StockQuote): { available: number; total: number } {
  const fieldsToCheck: (keyof StockQuote)[] = [
    'peRatio', 'pbRatio', 'psRatio', 'eps',
    'roe', 'roa', 'netMargin', 'debtToEquity', 'currentRatio',
    'dividendYield', 'payoutRatio', 'revenueGrowth', 'epsGrowth',
    'beta', 'high52w', 'low52w', 'avgVolume',
    'institutionalOwnership', 'analystRating', 'analystTargetPrice',
    'sma20', 'sma50', 'sma200', 'rsi14',
  ];

  let available = 0;
  for (const field of fieldsToCheck) {
    const val = quote[field];
    if (val !== undefined && val !== null) {
      available++;
    }
  }

  return { available, total: fieldsToCheck.length };
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate the comprehensive stock score across all 12 dimensions.
 *
 * @param quote - The stock quote data to score
 * @param country - Optional country code for weight adjustments (US, JP, GB, DE, FR, IN)
 * @returns Complete scoring result with all dimension scores and hierarchy
 */
export function calculateStockScore(
  quote: StockQuote,
  country?: string
): StockScoreResult {
  // 1. Get sector defaults for the stock's sector
  const sectorDefaults = getSectorDefaults(quote.sector);

  // 2. Compute each dimension score with full hierarchy
  const dimensionScores: StockDimensionScore[] = STOCK_DIMENSIONS.map(dim => {
    return computeDimensionScore(dim, quote, sectorDefaults);
  });

  // 3. Apply country-specific weight adjustments
  const weightedScores: { key: string; score: number; weight: number }[] = dimensionScores.map(ds => {
    const weight = getCountryWeight(country, ds.key);
    return {
      key: ds.key,
      score: ds.score,
      weight,
    };
  });

  // 4. Compute the weighted composite AI score (1-10)
  const totalWeight = weightedScores.reduce((sum, ws) => sum + ws.weight, 0) || 1;
  const weightedSum = weightedScores.reduce((sum, ws) => sum + ws.score * ws.weight, 0);
  const aiScore = clamp(weightedSum / totalWeight);

  // 5. Determine confidence level based on data availability
  const { available, total } = countAvailableDataPoints(quote);
  const dataAvailabilityPct = total > 0 ? available / total : 0;
  const confidence: 'high' | 'medium' | 'low' =
    dataAvailabilityPct > 0.7 ? 'high' :
    dataAvailabilityPct > 0.4 ? 'medium' : 'low';

  // 6. Extract individual dimension scores for convenience
  const getDimScore = (key: string): number => {
    const ds = dimensionScores.find(d => d.key === key);
    return ds ? ds.score : 5;
  };

  return {
    aiScore,
    confidence,
    dimensions: dimensionScores,
    profitabilityScore: getDimScore('profitability'),
    valuationScore: getDimScore('valuation'),
    growthScore: getDimScore('growth'),
    financialHealthScore: getDimScore('financialHealth'),
    dividendScore: getDimScore('dividend'),
    technicalScore: getDimScore('technical'),
    momentumScore: getDimScore('momentum'),
    analystScore: getDimScore('analyst'),
    institutionalScore: getDimScore('institutional'),
    marketSentimentScore: getDimScore('marketSentiment'),
    sectorRotationScore: getDimScore('sectorRotation'),
    macroScore: getDimScore('macro'),
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all sub-aspect keys for a given dimension.
 * Useful for iterating over all scorers.
 */
export function getSubAspectKeysForDimension(dimKey: string): string[] {
  const dim = STOCK_DIMENSIONS.find(d => d.key === dimKey);
  if (!dim) return [];
  const keys: string[] = [];
  for (const subDim of dim.subDimensions) {
    for (const aspect of subDim.aspects) {
      for (const subAspect of aspect.subAspects) {
        keys.push(subAspect.key);
      }
    }
  }
  return keys;
}

/**
 * Get total count of all sub-aspects across all dimensions.
 */
export function getTotalSubAspectCount(): number {
  let count = 0;
  for (const dim of STOCK_DIMENSIONS) {
    for (const subDim of dim.subDimensions) {
      for (const aspect of subDim.aspects) {
        count += aspect.subAspects.length;
      }
    }
  }
  return count;
}

/**
 * Get a breakdown of hierarchy counts per dimension.
 */
export function getHierarchyBreakdown(): {
  dimension: string;
  subDimensions: number;
  aspects: number;
  subAspects: number;
}[] {
  return STOCK_DIMENSIONS.map(dim => {
    let aspects = 0;
    let subAspects = 0;
    for (const subDim of dim.subDimensions) {
      aspects += subDim.aspects.length;
      for (const aspect of subDim.aspects) {
        subAspects += aspect.subAspects.length;
      }
    }
    return {
      dimension: dim.key,
      subDimensions: dim.subDimensions.length,
      aspects,
      subAspects,
    };
  });
}

/**
 * Evaluate a single sub-aspect scorer by key.
 * Useful for targeted re-evaluation or debugging.
 */
export function evaluateSubAspect(
  subAspectKey: string,
  quote: StockQuote,
  sectorDefaults?: SectorDefaults
): number | null {
  const sd = sectorDefaults ?? getSectorDefaults(quote.sector);
  for (const dim of STOCK_DIMENSIONS) {
    for (const subDim of dim.subDimensions) {
      for (const aspect of subDim.aspects) {
        for (const subAspect of aspect.subAspects) {
          if (subAspect.key === subAspectKey) {
            return clamp(subAspect.scoreFn(quote, sd));
          }
        }
      }
    }
  }
  return null;
}

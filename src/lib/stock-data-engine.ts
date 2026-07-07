/**
 * FinanceIntel — Stock Data Engine
 * Core data fetching, caching, and enrichment for 6-country stock market data.
 * Handles Yahoo Finance API integration with graceful fallback to realistic mock data.
 */

// ─── Mock Mode Flag ──────────────────────────────────────────────────────────
// Yahoo Finance API has CORS issues in browser contexts; backend uses mock data for now.
const MOCK_MODE = true;

// ─── Cache Configuration ─────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const stockCache = new Map<string, CacheEntry<StockQuote[]>>();
const summaryCache = new Map<string, CacheEntry<CountryMarketSummary>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── StockCountry Interface & Data ───────────────────────────────────────────
export interface StockCountry {
  code: 'US' | 'JP' | 'GB' | 'DE' | 'FR' | 'IN';
  name: string;
  nameFa: string;
  flag: string;
  exchanges: string[];
  currency: string;
  yahooSuffix: string;
}

export const STOCK_COUNTRIES: StockCountry[] = [
  {
    code: 'US',
    name: 'United States',
    nameFa: 'ایالات متحده',
    flag: '🇺🇸',
    exchanges: ['NYSE', 'NASDAQ'],
    currency: 'USD',
    yahooSuffix: '',
  },
  {
    code: 'JP',
    name: 'Japan',
    nameFa: 'ژاپن',
    flag: '🇯🇵',
    exchanges: ['Tokyo Stock Exchange'],
    currency: 'JPY',
    yahooSuffix: '.T',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    nameFa: 'بریتانیا',
    flag: '🇬🇧',
    exchanges: ['London Stock Exchange'],
    currency: 'GBP',
    yahooSuffix: '.L',
  },
  {
    code: 'DE',
    name: 'Germany',
    nameFa: 'آلمان',
    flag: '🇩🇪',
    exchanges: ['XETRA'],
    currency: 'EUR',
    yahooSuffix: '.DE',
  },
  {
    code: 'FR',
    name: 'France',
    nameFa: 'فرانسه',
    flag: '🇫🇷',
    exchanges: ['Euronext Paris'],
    currency: 'EUR',
    yahooSuffix: '.PA',
  },
  {
    code: 'IN',
    name: 'India',
    nameFa: 'هند',
    flag: '🇮🇳',
    exchanges: ['NSE', 'BSE'],
    currency: 'INR',
    yahooSuffix: '.NS',
  },
];

// ─── StockDefinition Interface ───────────────────────────────────────────────
export interface StockDefinition {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
}

// ─── StockQuote Interface ────────────────────────────────────────────────────
export interface StockQuote {
  symbol: string;
  name: string;
  country: string;
  exchange: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePct: number;
  marketCap: number;
  volume: number;
  peRatio?: number;
  pbRatio?: number;
  psRatio?: number;
  eps?: number;
  roe?: number;
  roa?: number;
  netMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
  dividendYield?: number;
  payoutRatio?: number;
  revenueGrowth?: number;
  epsGrowth?: number;
  beta?: number;
  high52w?: number;
  low52w?: number;
  avgVolume?: number;
  institutionalOwnership?: number;
  analystRating?: number;
  analystTargetPrice?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi14?: number;
}

// ─── CountryMarketSummary Interface ──────────────────────────────────────────
export interface CountryMarketSummary {
  country: StockCountry;
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  avgChangePct: number;
  totalMarketCap: number;
  totalVolume: number;
  topGainer: StockQuote | null;
  topLoser: StockQuote | null;
  sectorBreakdown: Record<string, number>;
}

// ─── MarketCapTier ───────────────────────────────────────────────────────────
export type MarketCapTier = 'mega' | 'large' | 'mid' | 'small' | 'micro';

export function getMarketCapTier(marketCap: number): MarketCapTier {
  if (marketCap > 200_000_000_000) return 'mega';
  if (marketCap >= 10_000_000_000) return 'large';
  if (marketCap >= 2_000_000_000) return 'mid';
  if (marketCap >= 300_000_000) return 'small';
  return 'micro';
}

// ─── COUNTRY_STOCKS — 50 stocks per country (300 total) ──────────────────────

const US_STOCKS: StockDefinition[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', industry: 'E-Commerce' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication', industry: 'Social Media' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', sector: 'Financial', industry: 'Conglomerates' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', industry: 'Banking' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', industry: 'Payment Processing' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', industry: 'Health Insurance' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer', industry: 'Household Products' },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financial', industry: 'Payment Processing' },
  { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer', industry: 'Home Improvement' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'MRK', name: 'Merck & Co.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer', industry: 'Beverages' },
  { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer', industry: 'Beverages' },
  { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financial', industry: 'Banking' },
  { symbol: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Healthcare', industry: 'Life Sciences' },
  { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Consumer', industry: 'Restaurants' },
  { symbol: 'ADP', name: 'Automatic Data Processing', sector: 'Technology', industry: 'HR Software' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Technology', industry: 'Networking' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', industry: 'Cloud Software' },
  { symbol: 'ACN', name: 'Accenture plc', sector: 'Technology', industry: 'IT Consulting' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication', industry: 'Streaming' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication', industry: 'Media' },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer', industry: 'Apparel' },
  { symbol: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', industry: 'Database Software' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', sector: 'Financial', industry: 'Payment Processing' },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'VZ', name: 'Verizon Communications', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'TXN', name: 'Texas Instruments Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'HON', name: 'Honeywell International', sector: 'Industrial', industry: 'Conglomerates' },
  { symbol: 'LOW', name: "Lowe's Companies", sector: 'Consumer', industry: 'Home Improvement' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer', industry: 'Restaurants' },
  { symbol: 'IBM', name: 'International Business Machines', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'MDLZ', name: 'Mondelez International', sector: 'Consumer', industry: 'Food Processing' },
  { symbol: 'INTU', name: 'Intuit Inc.', sector: 'Technology', industry: 'Financial Software' },
  { symbol: 'ISRG', name: 'Intuitive Surgical Inc.', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Technology', industry: 'Cloud Software' },
];

const JP_STOCKS: StockDefinition[] = [
  { symbol: '7203.T', name: 'Toyota Motor Corporation', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: '6758.T', name: 'Sony Group Corporation', sector: 'Technology', industry: 'Consumer Electronics' },
  { symbol: '6861.T', name: 'Keyence Corporation', sector: 'Industrial', industry: 'Automation' },
  { symbol: '9984.T', name: 'SoftBank Group Corp.', sector: 'Communication', industry: 'Telecom' },
  { symbol: '8306.T', name: 'MUFG', sector: 'Financial', industry: 'Banking' },
  { symbol: '7974.T', name: 'Nintendo Co. Ltd.', sector: 'Communication', industry: 'Gaming' },
  { symbol: '6501.T', name: 'Hitachi Ltd.', sector: 'Industrial', industry: 'Conglomerates' },
  { symbol: '6702.T', name: 'NEC Corporation', sector: 'Technology', industry: 'IT Services' },
  { symbol: '8316.T', name: 'Sumitomo Mitsui Financial', sector: 'Financial', industry: 'Banking' },
  { symbol: '4063.T', name: 'Shin-Etsu Chemical', sector: 'Materials', industry: 'Chemicals' },
  { symbol: '6503.T', name: 'Mitsubishi Electric', sector: 'Industrial', industry: 'Electrical Equipment' },
  { symbol: '8035.T', name: 'Tokyo Electron Ltd.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: '8411.T', name: 'Mizuho Financial Group', sector: 'Financial', industry: 'Banking' },
  { symbol: '4502.T', name: 'Takeda Pharmaceutical', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: '6902.T', name: 'Denso Corporation', sector: 'Consumer', industry: 'Auto Parts' },
  { symbol: '8058.T', name: 'Mitsubishi Corporation', sector: 'Industrial', industry: 'Trading' },
  { symbol: '9433.T', name: 'KDDI Corporation', sector: 'Communication', industry: 'Telecom' },
  { symbol: '8766.T', name: 'Tokio Marine Holdings', sector: 'Financial', industry: 'Insurance' },
  { symbol: '9020.T', name: 'East Japan Railway', sector: 'Industrial', industry: 'Transportation' },
  { symbol: '9022.T', name: 'Central Japan Railway', sector: 'Industrial', industry: 'Transportation' },
  { symbol: '7267.T', name: 'Honda Motor Co.', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: '4901.T', name: 'Fujifilm Holdings', sector: 'Technology', industry: 'Imaging' },
  { symbol: '6857.T', name: 'Advantest Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: '7733.T', name: 'Olympus Corporation', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: '8252.T', name: 'Seven & i Holdings', sector: 'Consumer', industry: 'Retail' },
  { symbol: '6965.T', name: 'Hamamatsu Photonics', sector: 'Technology', industry: 'Electronics' },
  { symbol: '9432.T', name: 'NTT Data Corporation', sector: 'Technology', industry: 'IT Services' },
  { symbol: '5401.T', name: 'Nippon Steel Corporation', sector: 'Materials', industry: 'Steel' },
  { symbol: '5108.T', name: 'Bridgestone Corporation', sector: 'Consumer', industry: 'Tires' },
  { symbol: '4507.T', name: 'Shionogi & Co.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: '6273.T', name: 'SMC Corporation', sector: 'Industrial', industry: 'Automation' },
  { symbol: '1963.T', name: 'Shimizu Corporation', sector: 'Real Estate', industry: 'Construction' },
  { symbol: '4519.T', name: 'Chugai Pharmaceutical', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: '8591.T', name: 'ORIX Corporation', sector: 'Financial', industry: 'Diversified Financials' },
  { symbol: '9501.T', name: 'Tokyo Electric Power', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: '9503.T', name: 'Kansai Electric Power', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: '8331.T', name: 'Chuo Mitsui Trust', sector: 'Financial', industry: 'Trust Banking' },
  { symbol: '4151.T', name: 'Kyowa Kirin Co.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: '6098.T', name: 'Recruit Holdings', sector: 'Technology', industry: 'HR Services' },
  { symbol: '9101.T', name: 'Nippon Yusen KK', sector: 'Industrial', industry: 'Shipping' },
  { symbol: '6367.T', name: 'Daikin Industries', sector: 'Industrial', industry: 'HVAC' },
  { symbol: '8801.T', name: 'Mitsui Estate Co.', sector: 'Real Estate', industry: 'Property Development' },
  { symbol: '5233.T', name: 'Taiheiyo Cement', sector: 'Materials', industry: 'Cement' },
  { symbol: '4324.T', name: 'Dentsu Group Inc.', sector: 'Communication', industry: 'Advertising' },
  { symbol: '7751.T', name: 'Canon Inc.', sector: 'Technology', industry: 'Imaging' },
  { symbol: '2503.T', name: 'Kirin Holdings', sector: 'Consumer', industry: 'Beverages' },
  { symbol: '4523.T', name: 'Eisai Co. Ltd.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: '1605.T', name: 'INPEX Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: '9735.T', name: 'Secom Co. Ltd.', sector: 'Industrial', industry: 'Security Services' },
  { symbol: '6674.T', name: 'GS Yuasa Corporation', sector: 'Industrial', industry: 'Batteries' },
];

const GB_STOCKS: StockDefinition[] = [
  { symbol: 'HSBA.L', name: 'HSBC Holdings plc', sector: 'Financial', industry: 'Banking' },
  { symbol: 'SHEL.L', name: 'Shell plc', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'AZN.L', name: 'AstraZeneca plc', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'BP.L', name: 'BP plc', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'ULVR.L', name: 'Unilever plc', sector: 'Consumer', industry: 'Household Products' },
  { symbol: 'GSK.L', name: 'GSK plc', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'RIO.L', name: 'Rio Tinto plc', sector: 'Materials', industry: 'Mining' },
  { symbol: 'GLEN.L', name: 'Glencore plc', sector: 'Materials', industry: 'Mining' },
  { symbol: 'BT-A.L', name: 'BT Group plc', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'VOD.L', name: 'Vodafone Group plc', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'BARC.L', name: 'Barclays plc', sector: 'Financial', industry: 'Banking' },
  { symbol: 'LLOY.L', name: 'Lloyds Banking Group', sector: 'Financial', industry: 'Banking' },
  { symbol: 'NG.L', name: 'National Grid plc', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: 'DGE.L', name: 'Diageo plc', sector: 'Consumer', industry: 'Beverages' },
  { symbol: 'REL.L', name: 'Relx plc', sector: 'Technology', industry: 'Information Services' },
  { symbol: 'RKT.L', name: 'Reckitt Benckiser Group', sector: 'Consumer', industry: 'Household Products' },
  { symbol: 'BLND.L', name: 'British Land Company', sector: 'Real Estate', industry: 'Property Development' },
  { symbol: 'CPG.L', name: 'Compass Group plc', sector: 'Consumer', industry: 'Food Services' },
  { symbol: 'BAB.L', name: 'Babcock International', sector: 'Industrial', industry: 'Engineering' },
  { symbol: 'AVST.L', name: 'Avast plc', sector: 'Technology', industry: 'Cybersecurity' },
  { symbol: 'SVT.L', name: 'Severn Trent plc', sector: 'Utilities', industry: 'Water Utilities' },
  { symbol: 'TSCO.L', name: 'Tesco plc', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'BNZL.L', name: 'Bunzl plc', sector: 'Industrial', industry: 'Distribution' },
  { symbol: 'HLMA.L', name: 'Halma plc', sector: 'Industrial', industry: 'Safety Equipment' },
  { symbol: 'SMDS.L', name: 'DS Smith plc', sector: 'Materials', industry: 'Packaging' },
  { symbol: 'SSE.L', name: 'SSE plc', sector: 'Utilities', industry: 'Energy Utilities' },
  { symbol: 'TW.L', name: 'Taylor Wimpey plc', sector: 'Real Estate', industry: 'Homebuilding' },
  { symbol: 'CNA.L', name: 'Centrica plc', sector: 'Energy', industry: 'Energy Services' },
  { symbol: 'WPP.L', name: 'WPP plc', sector: 'Communication', industry: 'Advertising' },
  { symbol: 'LAND.L', name: 'Land Securities Group', sector: 'Real Estate', industry: 'REIT' },
  { symbol: 'EXPN.L', name: 'Experian plc', sector: 'Financial', industry: 'Credit Services' },
  { symbol: 'ANTO.L', name: 'Antofagasta plc', sector: 'Materials', industry: 'Mining' },
  { symbol: 'KGF.L', name: 'Kingfisher plc', sector: 'Consumer', industry: 'Home Improvement' },
  { symbol: 'SDR.L', name: 'Schroders plc', sector: 'Financial', industry: 'Asset Management' },
  { symbol: 'AV.L', name: 'Aviva plc', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'PHNX.L', name: 'Phoenix Group Holdings', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'ADN.L', name: 'AVEVA Group plc', sector: 'Technology', industry: 'Industrial Software' },
  { symbol: 'PRU.L', name: 'Prudential plc', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'SGE.L', name: 'Sage Group plc', sector: 'Technology', industry: 'Business Software' },
  { symbol: 'ABF.L', name: 'Associated British Foods', sector: 'Consumer', industry: 'Food Processing' },
  { symbol: 'MNG.L', name: 'M&G plc', sector: 'Financial', industry: 'Asset Management' },
  { symbol: 'AUTO.L', name: 'Auto Trader Group', sector: 'Consumer', industry: 'Classifieds' },
  { symbol: 'RR.L', name: 'Rolls-Royce Holdings', sector: 'Industrial', industry: 'Aerospace' },
  { symbol: 'BA.L', name: 'BAE Systems plc', sector: 'Industrial', industry: 'Defense' },
  { symbol: 'PSON.L', name: 'Pearson plc', sector: 'Communication', industry: 'Education' },
  { symbol: 'NWG.L', name: 'NatWest Group plc', sector: 'Financial', industry: 'Banking' },
  { symbol: 'III.L', name: '3i Group plc', sector: 'Financial', industry: 'Private Equity' },
  { symbol: 'SPX.L', name: 'Spirax-Sarco Engineering', sector: 'Industrial', industry: 'Engineering' },
  { symbol: 'CTY.L', name: 'City of London Investment', sector: 'Financial', industry: 'Asset Management' },
  { symbol: 'FCIT.L', name: 'F&C Investment Trust', sector: 'Financial', industry: 'Investment Trust' },
];

const DE_STOCKS: StockDefinition[] = [
  { symbol: 'SAP.DE', name: 'SAP SE', sector: 'Technology', industry: 'Enterprise Software' },
  { symbol: 'SIE.DE', name: 'Siemens AG', sector: 'Industrial', industry: 'Conglomerates' },
  { symbol: 'ALV.DE', name: 'Allianz SE', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'DTE.DE', name: 'Deutsche Telekom AG', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'AIR.DE', name: 'Airbus SE', sector: 'Industrial', industry: 'Aerospace' },
  { symbol: 'BAS.DE', name: 'BASF SE', sector: 'Materials', industry: 'Chemicals' },
  { symbol: 'BMW.DE', name: 'BMW AG', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'BAYN.DE', name: 'Bayer AG', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'ADS.DE', name: 'Adidas AG', sector: 'Consumer', industry: 'Apparel' },
  { symbol: 'DBK.DE', name: 'Deutsche Bank AG', sector: 'Financial', industry: 'Banking' },
  { symbol: 'DB1.DE', name: 'Deutsche Börse AG', sector: 'Financial', industry: 'Exchanges' },
  { symbol: 'RWE.DE', name: 'RWE AG', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: 'EOAN.DE', name: 'E.ON SE', sector: 'Utilities', industry: 'Energy Utilities' },
  { symbol: 'VNA.DE', name: 'Vonovia SE', sector: 'Real Estate', industry: 'Property Development' },
  { symbol: 'HEN3.DE', name: 'Henkel AG & Co.', sector: 'Consumer', industry: 'Household Products' },
  { symbol: 'IFX.DE', name: 'Infineon Technologies', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'MTX.DE', name: 'MTU Aero Engines', sector: 'Industrial', industry: 'Aerospace' },
  { symbol: 'SHL.DE', name: 'Siemens Healthineers', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'HEI.DE', name: 'Heidelberg Materials', sector: 'Materials', industry: 'Cement' },
  { symbol: 'BEI.DE', name: 'Beiersdorf AG', sector: 'Consumer', industry: 'Personal Care' },
  { symbol: 'SYM.DE', name: 'Symrise AG', sector: 'Materials', industry: 'Fragrances' },
  { symbol: 'QIA.DE', name: 'Qiagen N.V.', sector: 'Healthcare', industry: 'Life Sciences' },
  { symbol: 'FME.DE', name: 'Fresenius Medical Care', sector: 'Healthcare', industry: 'Dialysis' },
  { symbol: 'FRE.DE', name: 'Fresenius SE & Co.', sector: 'Healthcare', industry: 'Healthcare Services' },
  { symbol: 'HNR1.DE', name: 'Hannover Rück SE', sector: 'Financial', industry: 'Reinsurance' },
  { symbol: 'TKA.DE', name: 'Thyssenkrupp AG', sector: 'Industrial', industry: 'Steel' },
  { symbol: 'CON.DE', name: 'Continental AG', sector: 'Consumer', industry: 'Auto Parts' },
  { symbol: 'LEO.DE', name: 'LEONI AG', sector: 'Industrial', industry: 'Cable Systems' },
  { symbol: 'SRT3.DE', name: 'Sartorius AG', sector: 'Healthcare', industry: 'Lab Equipment' },
  { symbol: 'ZAL.DE', name: 'Zalando SE', sector: 'Consumer', industry: 'E-Commerce' },
  { symbol: '1COV.DE', name: 'Covestro AG', sector: 'Materials', industry: 'Polymers' },
  { symbol: 'PAH3.DE', name: 'Porsche Automobil Holding', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'VOW3.DE', name: 'Volkswagen AG', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'LIN.DE', name: 'Linde plc', sector: 'Materials', industry: 'Industrial Gas' },
  { symbol: 'MUV2.DE', name: 'Münchener Rück', sector: 'Financial', industry: 'Reinsurance' },
  { symbol: 'CBK.DE', name: 'Commerzbank AG', sector: 'Financial', industry: 'Banking' },
  { symbol: 'DEQ.DE', name: 'D+E Immobilien', sector: 'Real Estate', industry: 'REIT' },
  { symbol: 'G1A.DE', name: 'Gerresheimer AG', sector: 'Healthcare', industry: 'Packaging' },
  { symbol: 'EVK.DE', name: 'Evonik Industries', sector: 'Materials', industry: 'Specialty Chemicals' },
  { symbol: 'ARL.DE', name: 'Aareal Bank AG', sector: 'Financial', industry: 'Banking' },
  { symbol: 'NEM.DE', name: 'Nemetschek SE', sector: 'Technology', industry: 'Construction Software' },
  { symbol: 'WRD2.DE', name: 'Warimpex Finanz', sector: 'Real Estate', industry: 'Hotel Investment' },
  { symbol: 'KRN.DE', name: 'Krones AG', sector: 'Industrial', industry: 'Packaging Machinery' },
  { symbol: 'SIX2.DE', name: 'Sixt SE', sector: 'Consumer', industry: 'Car Rental' },
  { symbol: 'P911.DE', name: 'Dr. Ing. h.c. F. Porsche', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'TEG.DE', name: 'TAG Immobilien AG', sector: 'Real Estate', industry: 'Property Development' },
  { symbol: 'FPE3.DE', name: 'Fielmann Group', sector: 'Consumer', industry: 'Eyewear' },
  { symbol: 'BOSS.DE', name: 'Hugo Boss AG', sector: 'Consumer', industry: 'Apparel' },
  { symbol: 'GYC.DE', name: 'Gebr. Knaus', sector: 'Industrial', industry: 'RV Manufacturing' },
  { symbol: 'JEN.DE', name: 'Jenoptik AG', sector: 'Industrial', industry: 'Optics' },
];

const FR_STOCKS: StockDefinition[] = [
  { symbol: 'MC.PA', name: 'LVMH Moët Hennessy Louis Vuitton', sector: 'Consumer', industry: 'Luxury Goods' },
  { symbol: 'TTE.PA', name: 'TotalEnergies SE', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'OR.PA', name: "L'Oréal SA", sector: 'Consumer', industry: 'Personal Care' },
  { symbol: 'RMS.PA', name: 'Hermès International', sector: 'Consumer', industry: 'Luxury Goods' },
  { symbol: 'SAP.PA', name: 'Sanofi SA', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'BNP.PA', name: 'BNP Paribas SA', sector: 'Financial', industry: 'Banking' },
  { symbol: 'GLE.PA', name: 'Société Générale SA', sector: 'Financial', industry: 'Banking' },
  { symbol: 'ACA.PA', name: 'Crédit Agricole SA', sector: 'Financial', industry: 'Banking' },
  { symbol: 'CS.PA', name: 'AXA SA', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'AI.PA', name: 'Air Liquide SA', sector: 'Materials', industry: 'Industrial Gas' },
  { symbol: 'RI.PA', name: 'Pernod Ricard SA', sector: 'Consumer', industry: 'Beverages' },
  { symbol: 'EN.PA', name: 'Bouygues SA', sector: 'Industrial', industry: 'Construction' },
  { symbol: 'CAP.PA', name: 'Capgemini SE', sector: 'Technology', industry: 'IT Consulting' },
  { symbol: 'SU.PA', name: 'Schneider Electric SE', sector: 'Industrial', industry: 'Electrical Equipment' },
  { symbol: 'KER.PA', name: 'Kering SA', sector: 'Consumer', industry: 'Luxury Goods' },
  { symbol: 'DG.PA', name: 'Vinci SA', sector: 'Industrial', industry: 'Construction' },
  { symbol: 'ATO.PA', name: 'Atos SE', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'ALO.PA', name: 'Alstom SA', sector: 'Industrial', industry: 'Rail Transport' },
  { symbol: 'WLN.PA', name: 'Worldline SA', sector: 'Technology', industry: 'Payment Processing' },
  { symbol: 'LR.PA', name: 'Legrand SA', sector: 'Industrial', industry: 'Electrical Components' },
  { symbol: 'MT.PA', name: 'ArcelorMittal SA', sector: 'Materials', industry: 'Steel' },
  { symbol: 'VIE.PA', name: 'Veolia Environnement', sector: 'Utilities', industry: 'Water & Waste' },
  { symbol: 'FP.PA', name: 'Eiffage SA', sector: 'Industrial', industry: 'Construction' },
  { symbol: 'GFI.PA', name: 'Ingenico Group', sector: 'Technology', industry: 'Payment Terminals' },
  { symbol: 'SW.PA', name: 'Sodexo SA', sector: 'Consumer', industry: 'Food Services' },
  { symbol: 'HO.PA', name: 'Thales SA', sector: 'Industrial', industry: 'Defense' },
  { symbol: 'ENGI.PA', name: 'Engie SA', sector: 'Utilities', industry: 'Energy Utilities' },
  { symbol: 'STM.PA', name: 'STMicroelectronics NV', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'CO.PA', name: 'Casino Guichard-Perrachon', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'CA.PA', name: 'Carrefour SA', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'RNO.PA', name: 'Renault SA', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'UG.PA', name: 'Ubisoft Entertainment', sector: 'Communication', industry: 'Gaming' },
  { symbol: 'DSY.PA', name: 'Dassault Systèmes', sector: 'Technology', industry: 'CAD Software' },
  { symbol: 'CDI.PA', name: 'Christian Dior SE', sector: 'Consumer', industry: 'Luxury Goods' },
  { symbol: 'TUP.PA', name: 'Tarkett SA', sector: 'Materials', industry: 'Flooring' },
  { symbol: 'BN.PA', name: 'Danone SA', sector: 'Consumer', industry: 'Food Processing' },
  { symbol: 'ML.PA', name: 'Michelin SA', sector: 'Consumer', industry: 'Tires' },
  { symbol: 'SEV.PA', name: 'Suez SA', sector: 'Utilities', industry: 'Water Services' },
  { symbol: 'KKO.PA', name: 'Korian SA', sector: 'Healthcare', industry: 'Elderly Care' },
  { symbol: 'PEUG.PA', name: 'Peugeot SA', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'FR.PA', name: 'Faurecia SA', sector: 'Consumer', industry: 'Auto Parts' },
  { symbol: 'VIRB.PA', name: 'Virbac SA', sector: 'Healthcare', industry: 'Animal Health' },
  { symbol: 'GTT.PA', name: 'Gaztransport & Technigaz', sector: 'Energy', industry: 'LNG Engineering' },
  { symbol: 'NEOEN.PA', name: 'Neoen SA', sector: 'Utilities', industry: 'Renewable Energy' },
  { symbol: 'AKW.PA', name: 'Akka Technologies', sector: 'Technology', industry: 'Engineering Services' },
  { symbol: 'FGR.PA', name: 'Eramet SA', sector: 'Materials', industry: 'Mining' },
  { symbol: 'DBV.PA', name: 'DBV Technologies', sector: 'Healthcare', industry: 'Biotechnology' },
  { symbol: 'LKOH.PA', name: 'Valkyrie Industries', sector: 'Industrial', industry: 'Manufacturing' },
  { symbol: 'ALSPA.PA', name: 'Alstom Power', sector: 'Industrial', industry: 'Power Generation' },
  { symbol: 'RXL.PA', name: 'Rexel SA', sector: 'Industrial', industry: 'Electrical Distribution' },
];

const IN_STOCKS: StockDefinition[] = [
  { symbol: 'INFY.NS', name: 'Infosys Limited', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', sector: 'Energy', industry: 'Conglomerates' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', sector: 'Financial', industry: 'Banking' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited', sector: 'Financial', industry: 'Banking' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.', sector: 'Consumer', industry: 'Household Products' },
  { symbol: 'ITC.NS', name: 'ITC Limited', sector: 'Consumer', industry: 'Tobacco & FMCG' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'Financial', industry: 'Banking' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited', sector: 'Communication', industry: 'Telecom' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'Financial', industry: 'Banking' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd.', sector: 'Industrial', industry: 'Engineering' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank Limited', sector: 'Financial', industry: 'Banking' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Limited', sector: 'Financial', industry: 'Consumer Finance' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Limited', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'WIPRO.NS', name: 'Wipro Limited', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd.', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd.', sector: 'Materials', industry: 'Cement' },
  { symbol: 'TITAN.NS', name: 'Titan Company Limited', sector: 'Consumer', industry: 'Jewelry & Watches' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd.', sector: 'Industrial', industry: 'Conglomerates' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Limited', sector: 'Materials', industry: 'Paints' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corp.', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'NTPC.NS', name: 'NTPC Limited', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Limited', sector: 'Materials', industry: 'Steel' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra Limited', sector: 'Technology', industry: 'IT Services' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Limited', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'DRREDDY.NS', name: "Dr. Reddy's Laboratories", sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'CIPLA.NS', name: 'Cipla Limited', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'DIVISLAB.NS', name: "Divi's Laboratories", sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', sector: 'Healthcare', industry: 'Hospital Services' },
  { symbol: 'COALINDIA.NS', name: 'Coal India Limited', sector: 'Energy', industry: 'Coal Mining' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries', sector: 'Materials', industry: 'Adhesives' },
  { symbol: 'GRASIM.NS', name: 'Grasim Industries Ltd.', sector: 'Materials', industry: 'Cement & Fibers' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Limited', sector: 'Consumer', industry: 'Motorcycles' },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum Corp.', sector: 'Energy', industry: 'Oil Refining' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors Limited', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'SHREECEM.NS', name: 'Shree Cement Limited', sector: 'Materials', industry: 'Cement' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Limited', sector: 'Materials', industry: 'Steel' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance', sector: 'Financial', industry: 'Insurance' },
  { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products', sector: 'Consumer', industry: 'Food Processing' },
  { symbol: 'DABUR.NS', name: 'Dabur India Limited', sector: 'Consumer', industry: 'FMCG' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia Industries', sector: 'Consumer', industry: 'Food Processing' },
  { symbol: 'GODREJCP.NS', name: 'Godrej Consumer Products', sector: 'Consumer', industry: 'FMCG' },
  { symbol: 'M_M.NS', name: 'Mahindra & Mahindra Ltd.', sector: 'Consumer', industry: 'Auto Manufacturers' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank Limited', sector: 'Financial', industry: 'Banking' },
  { symbol: 'BANDHANBNK.NS', name: 'Bandhan Bank Limited', sector: 'Financial', industry: 'Banking' },
  { symbol: 'MINDTREE.NS', name: 'LTIMindtree Limited', sector: 'Technology', industry: 'IT Services' },
];

export const COUNTRY_STOCKS: Record<string, StockDefinition[]> = {
  US: US_STOCKS,
  JP: JP_STOCKS,
  GB: GB_STOCKS,
  DE: DE_STOCKS,
  FR: FR_STOCKS,
  IN: IN_STOCKS,
};

// ─── Seeded Pseudo-Random Number Generator ───────────────────────────────────
// Uses a simple hash-based PRNG so the same symbol always yields the same mock data.
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // Mulberry32
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Sector Default Multipliers ──────────────────────────────────────────────
const SECTOR_DEFAULTS: Record<string, {
  peRange: [number, number];
  pbRange: [number, number];
  psRange: [number, number];
  marginRange: [number, number];
  roeRange: [number, number];
  divYieldRange: [number, number];
  betaRange: [number, number];
  debtEquityRange: [number, number];
  marketCapBase: number;
}> = {
  Technology:   { peRange: [18, 45], pbRange: [3, 15], psRange: [3, 15], marginRange: [0.12, 0.35], roeRange: [0.12, 0.35], divYieldRange: [0.005, 0.02], betaRange: [0.9, 1.6], debtEquityRange: [0.2, 1.0], marketCapBase: 120_000_000_000 },
  Healthcare:   { peRange: [12, 30], pbRange: [2, 8],  psRange: [2, 8],  marginRange: [0.10, 0.30], roeRange: [0.10, 0.25], divYieldRange: [0.01, 0.04],  betaRange: [0.6, 1.1], debtEquityRange: [0.3, 1.5], marketCapBase: 80_000_000_000 },
  Financial:    { peRange: [8, 18],  pbRange: [0.8, 3],psRange: [1, 4],  marginRange: [0.15, 0.35], roeRange: [0.08, 0.20], divYieldRange: [0.02, 0.05],  betaRange: [0.7, 1.3], debtEquityRange: [1.0, 5.0], marketCapBase: 90_000_000_000 },
  Consumer:     { peRange: [15, 30], pbRange: [3, 10], psRange: [1, 4],  marginRange: [0.08, 0.25], roeRange: [0.15, 0.40], divYieldRange: [0.01, 0.04],  betaRange: [0.5, 1.0], debtEquityRange: [0.3, 2.0], marketCapBase: 70_000_000_000 },
  Energy:       { peRange: [6, 15],  pbRange: [0.5, 2],psRange: [0.3, 1.5], marginRange: [0.05, 0.20], roeRange: [0.08, 0.20], divYieldRange: [0.03, 0.07],  betaRange: [0.8, 1.4], debtEquityRange: [0.5, 2.5], marketCapBase: 100_000_000_000 },
  Industrial:   { peRange: [12, 25], pbRange: [1.5, 5],psRange: [1, 3],  marginRange: [0.06, 0.18], roeRange: [0.10, 0.22], divYieldRange: [0.015, 0.04], betaRange: [0.8, 1.3], debtEquityRange: [0.4, 2.0], marketCapBase: 50_000_000_000 },
  Materials:    { peRange: [8, 20],  pbRange: [1, 4],  psRange: [0.5, 2], marginRange: [0.05, 0.18], roeRange: [0.08, 0.20], divYieldRange: [0.02, 0.05],  betaRange: [0.8, 1.4], debtEquityRange: [0.5, 2.0], marketCapBase: 30_000_000_000 },
  Utilities:    { peRange: [12, 22], pbRange: [1, 3],  psRange: [1, 3],  marginRange: [0.10, 0.22], roeRange: [0.08, 0.15], divYieldRange: [0.03, 0.06],  betaRange: [0.3, 0.7], debtEquityRange: [1.0, 3.0], marketCapBase: 25_000_000_000 },
  'Real Estate':{ peRange: [15, 35], pbRange: [0.8, 2.5], psRange: [2, 8], marginRange: [0.15, 0.40], roeRange: [0.05, 0.12], divYieldRange: [0.03, 0.07],  betaRange: [0.5, 1.0], debtEquityRange: [1.5, 4.0], marketCapBase: 15_000_000_000 },
  Communication:{ peRange: [10, 25], pbRange: [1.5, 5],psRange: [1, 4],  marginRange: [0.08, 0.25], roeRange: [0.10, 0.25], divYieldRange: [0.02, 0.05],  betaRange: [0.6, 1.2], debtEquityRange: [0.5, 2.5], marketCapBase: 60_000_000_000 },
};

function getSectorDefaults(sector: string) {
  return SECTOR_DEFAULTS[sector] || SECTOR_DEFAULTS['Industrial'];
}

// ─── Currency Price Multiplier ───────────────────────────────────────────────
// JPY-denominated stocks trade in thousands; others in standard units.
const CURRENCY_PRICE_SCALE: Record<string, number> = {
  US: 1,
  JP: 1,    // JPY prices are already high (e.g., Toyota ~2800 JPY)
  GB: 1,
  DE: 1,
  FR: 1,
  IN: 1,
};

// ─── generateMockQuote ───────────────────────────────────────────────────────
/**
 * Generate a realistic mock StockQuote for a given stock definition and country.
 * Uses a seeded PRNG so the same symbol always yields the same data (within a cache TTL window).
 */
export function generateMockQuote(
  stock: StockDefinition,
  countryCode: string,
): StockQuote {
  const rng = seededRandom(`${stock.symbol}-${countryCode}-${new Date().toISOString().slice(0, 10)}`);
  const country = STOCK_COUNTRIES.find(c => c.code === countryCode)!;
  const defaults = getSectorDefaults(stock.sector);
  const priceScale = CURRENCY_PRICE_SCALE[countryCode] || 1;

  // Base price — varies by sector and currency
  const isJPY = countryCode === 'JP';
  const isINR = countryCode === 'IN';
  let basePrice: number;
  if (isJPY) {
    basePrice = 500 + rng() * 9500; // JPY stocks: 500-10000
  } else if (isINR) {
    basePrice = 100 + rng() * 4900; // INR stocks: 100-5000
  } else {
    basePrice = 20 + rng() * 480 * priceScale; // USD/EUR/GBP: 20-500
  }

  const price = +basePrice.toFixed(2);
  const changePct = (rng() - 0.48) * 6; // slight upward bias, range ~ -3% to +3%
  const change = +(price * changePct / 100).toFixed(2);

  const marketCapVariance = 0.01 + rng() * 20; // 0.01x to 20x of base
  const marketCap = Math.round(defaults.marketCapBase * marketCapVariance);
  const volume = Math.round(1_000_000 + rng() * 49_000_000);

  const range = (r: [number, number]) => r[0] + rng() * (r[1] - r[0]);

  const peRatio = +range(defaults.peRange).toFixed(2);
  const pbRatio = +range(defaults.pbRange).toFixed(2);
  const psRatio = +range(defaults.psRange).toFixed(2);
  const netMargin = +range(defaults.marginRange).toFixed(4);
  const roe = +range(defaults.roeRange).toFixed(4);
  const roa = +(roe * (0.3 + rng() * 0.5)).toFixed(4); // roa < roe
  const eps = +(price / peRatio).toFixed(2);
  const debtToEquity = +range(defaults.debtEquityRange).toFixed(2);
  const currentRatio = +(1.0 + rng() * 2.5).toFixed(2);
  const dividendYield = +range(defaults.divYieldRange).toFixed(4);
  const payoutRatio = +(dividendYield * peRatio * 100).toFixed(2); // derived
  const revenueGrowth = +((rng() - 0.35) * 30).toFixed(2); // -10.5% to +19.5%
  const epsGrowth = +((rng() - 0.3) * 35).toFixed(2);
  const beta = +range(defaults.betaRange).toFixed(2);
  const high52w = +(price * (1.1 + rng() * 0.3)).toFixed(2); // 10-40% above current
  const low52w = +(price * (0.6 + rng() * 0.25)).toFixed(2); // 15-40% below current
  const avgVolume = Math.round(volume * (0.7 + rng() * 0.6));
  const institutionalOwnership = +(0.3 + rng() * 0.55).toFixed(4);
  const analystRating = +(1 + rng() * 4).toFixed(1); // 1.0 - 5.0
  const analystTargetPrice = +(price * (0.8 + rng() * 0.5)).toFixed(2);

  // Technical indicators
  const sma20 = +(price * (0.97 + rng() * 0.06)).toFixed(2);
  const sma50 = +(price * (0.94 + rng() * 0.12)).toFixed(2);
  const sma200 = +(price * (0.88 + rng() * 0.24)).toFixed(2);
  const rsi14 = +(20 + rng() * 60).toFixed(1); // 20-80 range

  const exchange = country.exchanges[Math.floor(rng() * country.exchanges.length)];

  return {
    symbol: stock.symbol,
    name: stock.name,
    country: countryCode,
    exchange,
    sector: stock.sector,
    industry: stock.industry,
    price,
    change,
    changePct: +changePct.toFixed(2),
    marketCap,
    volume,
    peRatio,
    pbRatio,
    psRatio,
    eps,
    roe,
    roa,
    netMargin,
    debtToEquity,
    currentRatio,
    dividendYield,
    payoutRatio,
    revenueGrowth,
    epsGrowth,
    beta,
    high52w,
    low52w,
    avgVolume,
    institutionalOwnership,
    analystRating,
    analystTargetPrice,
    sma20,
    sma50,
    sma200,
    rsi14,
  };
}

// ─── Yahoo Finance Fetching ──────────────────────────────────────────────────
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const YAHOO_BATCH_SIZE = 10; // Yahoo limits batch sizes
const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<Record<string, unknown>>;
    error?: string | null;
  };
}

function mapYahooQuote(raw: Record<string, unknown>, stock: StockDefinition, countryCode: string): StockQuote {
  const country = STOCK_COUNTRIES.find(c => c.code === countryCode)!;
  const price = (raw.regularMarketPrice as number) || 0;
  const change = (raw.regularMarketChange as number) || 0;
  const changePct = (raw.regularMarketChangePercent as number) || 0;
  const marketCap = (raw.marketCap as number) || 0;
  const volume = (raw.regularMarketVolume as number) || 0;

  return {
    symbol: stock.symbol,
    name: (raw.shortName as string) || stock.name,
    country: countryCode,
    exchange: (raw.fullExchangeName as string) || country.exchanges[0],
    sector: (raw.sector as string) || stock.sector,
    industry: (raw.industry as string) || stock.industry,
    price,
    change,
    changePct: +changePct.toFixed(2),
    marketCap,
    volume,
    peRatio: (raw.trailingPE as number) || undefined,
    pbRatio: (raw.priceToBook as number) || undefined,
    psRatio: (raw.priceToSalesTrailing12Months as number) || undefined,
    eps: (raw.trailingEps as number) || undefined,
    roe: undefined, // not directly available from Yahoo quote
    roa: undefined,
    netMargin: undefined,
    debtToEquity: undefined,
    currentRatio: undefined,
    dividendYield: ((raw.dividendYield as number) || undefined) !== undefined
      ? (raw.dividendYield as number) * 100
      : undefined,
    payoutRatio: (raw.payoutRatio as number) || undefined,
    revenueGrowth: undefined,
    epsGrowth: (raw.earningsGrowth as number) || undefined,
    beta: (raw.beta as number) || undefined,
    high52w: (raw.fiftyTwoWeekHigh as number) || undefined,
    low52w: (raw.fiftyTwoWeekLow as number) || undefined,
    avgVolume: (raw.averageDailyVolume3Month as number) || undefined,
    institutionalOwnership: undefined,
    analystRating: undefined,
    analystTargetPrice: (raw.targetMeanPrice as number) || undefined,
    sma20: undefined,
    sma50: (raw.fiftyDayAverage as number) || undefined,
    sma200: (raw.twoHundredDayAverage as number) || undefined,
    rsi14: undefined,
  };
}

/**
 * Batch-fetch stock quotes from Yahoo Finance API.
 * Falls back to mock data for any symbol that fails.
 */
export async function fetchYahooQuotes(
  stocks: StockDefinition[],
  countryCode: string,
): Promise<StockQuote[]> {
  if (MOCK_MODE) {
    return stocks.map(s => generateMockQuote(s, countryCode));
  }

  const results: StockQuote[] = [];
  const symbolToStock = new Map(stocks.map(s => [s.symbol, s]));

  // Process in batches
  for (let i = 0; i < stocks.length; i += YAHOO_BATCH_SIZE) {
    const batch = stocks.slice(i, i + YAHOO_BATCH_SIZE);
    const symbolsParam = batch.map(s => s.symbol).join(',');

    let retries = 0;
    let success = false;

    while (retries <= MAX_RETRIES && !success) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(
          `${YAHOO_QUOTE_URL}?symbols=${encodeURIComponent(symbolsParam)}`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; FinanceIntel/1.0)',
            },
          },
        );

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited — wait and retry
          const waitMs = 2000 * (retries + 1);
          await new Promise(r => setTimeout(r, waitMs));
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Yahoo API returned ${response.status}`);
        }

        const data: YahooQuoteResponse = await response.json();

        if (data.quoteResponse?.error) {
          throw new Error(data.quoteResponse.error);
        }

        const yahooResults = data.quoteResponse?.result || [];
        const foundSymbols = new Set<string>();

        for (const raw of yahooResults) {
          const sym = raw.symbol as string;
          foundSymbols.add(sym);
          const stockDef = symbolToStock.get(sym);
          if (stockDef) {
            results.push(mapYahooQuote(raw, stockDef, countryCode));
          }
        }

        // Fall back to mock for any symbols not found
        for (const stock of batch) {
          if (!foundSymbols.has(stock.symbol)) {
            results.push(generateMockQuote(stock, countryCode));
          }
        }

        success = true;
      } catch (err) {
        retries++;
        if (retries > MAX_RETRIES) {
          // All retries exhausted — use mock data for this batch
          console.warn(
            `[FinanceIntel] Yahoo Finance fetch failed for batch starting at ${batch[0]?.symbol}: ${err instanceof Error ? err.message : String(err)}. Falling back to mock data.`,
          );
          for (const stock of batch) {
            results.push(generateMockQuote(stock, countryCode));
          }
          success = true; // Continue with next batch
        }
      }
    }
  }

  return results;
}

// ─── fetchCountryStocks ──────────────────────────────────────────────────────
/**
 * Fetch all 50 stocks for a given country code.
 * Uses 5-minute TTL cache.
 */
export async function fetchCountryStocks(countryCode: string): Promise<StockQuote[]> {
  const cached = getCached(stockCache, countryCode);
  if (cached) return cached;

  const stocks = COUNTRY_STOCKS[countryCode];
  if (!stocks) {
    throw new Error(`Unknown country code: ${countryCode}`);
  }

  const quotes = await fetchYahooQuotes(stocks, countryCode);
  setCache(stockCache, countryCode, quotes);
  return quotes;
}

// ─── fetchAllCountriesStocks ─────────────────────────────────────────────────
/**
 * Fetch stocks for all 6 countries in parallel.
 */
export async function fetchAllCountriesStocks(): Promise<Record<string, StockQuote[]>> {
  const results: Record<string, StockQuote[]> = {};

  const promises = STOCK_COUNTRIES.map(async (country) => {
    results[country.code] = await fetchCountryStocks(country.code);
  });

  await Promise.all(promises);
  return results;
}

// ─── Stock Scoring Integration ───────────────────────────────────────────────
// Import scoring engine lazily to avoid circular dependencies at module load time.
// The scoring engine returns StockScoreResult which we convert to the legacy
// Record<string, number> & { overall: number } format for EnrichedStockQuote.

import type { StockScoreResult } from './stock-scoring-engine';

let _calculateStockScore: ((quote: StockQuote, country?: string) => StockScoreResult) | null = null;

function convertScoreResult(result: StockScoreResult): Record<string, number> & { overall: number } {
  return {
    profitability: result.profitabilityScore,
    valuation: result.valuationScore,
    growth: result.growthScore,
    financialHealth: result.financialHealthScore,
    dividend: result.dividendScore,
    technical: result.technicalScore,
    momentum: result.momentumScore,
    analyst: result.analystScore,
    institutional: result.institutionalScore,
    marketSentiment: result.marketSentimentScore,
    sectorRotation: result.sectorRotationScore,
    macro: result.macroScore,
    overall: result.aiScore,
  };
}

async function getScoringFunction() {
  if (!_calculateStockScore) {
    try {
      const mod = await import('./stock-scoring-engine');
      _calculateStockScore = mod.calculateStockScore;
    } catch {
      // Scoring engine not available — provide a simple fallback
      _calculateStockScore = (quote: StockQuote, _country?: string) => {
        // Return a StockScoreResult-compatible object
        const valueScore = quote.peRatio ? Math.max(0, Math.min(10, 10 - quote.peRatio / 5)) : 5;
        const growthScore = quote.revenueGrowth ? Math.max(0, Math.min(10, 5 + quote.revenueGrowth / 10)) : 5;
        const qualityScore = quote.roe ? Math.max(0, Math.min(10, quote.roe / 3)) : 5;
        const momentumScore = quote.rsi14 ? Math.max(0, Math.min(10, quote.rsi14 / 10)) : 5;
        const overall = +(valueScore * 0.25 + growthScore * 0.25 + qualityScore * 0.25 + momentumScore * 0.25).toFixed(1);

        return {
          aiScore: overall,
          confidence: 'low' as const,
          dimensions: [],
          profitabilityScore: qualityScore,
          valuationScore: valueScore,
          growthScore,
          financialHealthScore: 5,
          dividendScore: quote.dividendYield ? Math.min(10, quote.dividendYield * 2) : 0,
          technicalScore: momentumScore,
          momentumScore,
          analystScore: 5,
          institutionalScore: 5,
          marketSentimentScore: 5,
          sectorRotationScore: 5,
          macroScore: 5,
        };
      };
    }
  }
  return _calculateStockScore;
}

// ─── enrichStockWithScore ────────────────────────────────────────────────────
export interface EnrichedStockQuote extends StockQuote {
  scores: Record<string, number> & { overall: number };
  marketCapTier: MarketCapTier;
}

/**
 * Enrich a StockQuote with computed scoring dimensions and market cap tier.
 */
export async function enrichStockWithScore(quote: StockQuote, country?: string): Promise<EnrichedStockQuote> {
  const calculateScore = await getScoringFunction();
  const result = calculateScore(quote, country);
  const scores = convertScoreResult(result);
  const marketCapTier = getMarketCapTier(quote.marketCap);

  return {
    ...quote,
    scores,
    marketCapTier,
  };
}

// ─── getCountryMarketSummary ─────────────────────────────────────────────────
/**
 * Compute aggregate market health statistics for a country.
 */
export async function getCountryMarketSummary(countryCode: string): Promise<CountryMarketSummary> {
  const cached = getCached(summaryCache, `summary-${countryCode}`);
  if (cached) return cached;

  const country = STOCK_COUNTRIES.find(c => c.code === countryCode)!;
  const quotes = await fetchCountryStocks(countryCode);

  let gainers = 0;
  let losers = 0;
  let unchanged = 0;
  let totalChangePct = 0;
  let totalMarketCap = 0;
  let totalVolume = 0;
  let topGainer: StockQuote | null = null;
  let topLoser: StockQuote | null = null;
  const sectorBreakdown: Record<string, number> = {};

  for (const q of quotes) {
    if (q.changePct > 0.01) gainers++;
    else if (q.changePct < -0.01) losers++;
    else unchanged++;

    totalChangePct += q.changePct;
    totalMarketCap += q.marketCap;
    totalVolume += q.volume;

    if (!topGainer || q.changePct > topGainer.changePct) topGainer = q;
    if (!topLoser || q.changePct < topLoser.changePct) topLoser = q;

    sectorBreakdown[q.sector] = (sectorBreakdown[q.sector] || 0) + 1;
  }

  const summary: CountryMarketSummary = {
    country,
    totalStocks: quotes.length,
    gainers,
    losers,
    unchanged,
    avgChangePct: +(totalChangePct / Math.max(1, quotes.length)).toFixed(2),
    totalMarketCap,
    totalVolume,
    topGainer,
    topLoser,
    sectorBreakdown,
  };

  setCache(summaryCache, `summary-${countryCode}`, summary);
  return summary;
}

// ─── getAllMarketSummaries ───────────────────────────────────────────────────
/**
 * Get market summaries for all 6 countries in parallel.
 */
export async function getAllMarketSummaries(): Promise<CountryMarketSummary[]> {
  const promises = STOCK_COUNTRIES.map(c => getCountryMarketSummary(c.code));
  return Promise.all(promises);
}

// ─── Cache Management ────────────────────────────────────────────────────────
/**
 * Clear all cached stock data. Useful for forcing a refresh.
 */
export function clearStockCache(): void {
  stockCache.clear();
  summaryCache.clear();
}

/**
 * Clear cached data for a specific country only.
 */
export function clearCountryCache(countryCode: string): void {
  stockCache.delete(countryCode);
  summaryCache.delete(`summary-${countryCode}`);
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  stockCacheEntries: number;
  summaryCacheEntries: number;
  stockCacheKeys: string[];
} {
  return {
    stockCacheEntries: stockCache.size,
    summaryCacheEntries: summaryCache.size,
    stockCacheKeys: Array.from(stockCache.keys()),
  };
}

// ─── Utility: Get all stocks across all countries ────────────────────────────
/**
 * Returns a flat array of all StockDefinition entries across every country.
 */
export function getAllStockDefinitions(): (StockDefinition & { countryCode: string })[] {
  const result: (StockDefinition & { countryCode: string })[] = [];
  for (const [code, stocks] of Object.entries(COUNTRY_STOCKS)) {
    for (const stock of stocks) {
      result.push({ ...stock, countryCode: code });
    }
  }
  return result;
}

// ─── Utility: Lookup helpers ─────────────────────────────────────────────────
/**
 * Find the country definition for a given country code.
 */
export function getCountryByCode(code: string): StockCountry | undefined {
  return STOCK_COUNTRIES.find(c => c.code === code);
}

/**
 * Find the stock definition for a given symbol, searching all countries.
 */
export function findStockDefinition(symbol: string): (StockDefinition & { countryCode: string }) | undefined {
  for (const [code, stocks] of Object.entries(COUNTRY_STOCKS)) {
    const found = stocks.find(s => s.symbol === symbol);
    if (found) return { ...found, countryCode: code };
  }
  return undefined;
}

/**
 * Format a market cap value into a human-readable string.
 */
export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1_000_000_000_000) return `${(marketCap / 1_000_000_000_000).toFixed(1)}T`;
  if (marketCap >= 1_000_000_000) return `${(marketCap / 1_000_000_000).toFixed(1)}B`;
  if (marketCap >= 1_000_000) return `${(marketCap / 1_000_000).toFixed(1)}M`;
  return `${marketCap.toFixed(0)}`;
}

/**
 * Format a volume number into a human-readable string.
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return `${volume.toFixed(0)}`;
}

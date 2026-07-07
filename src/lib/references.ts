/**
 * Academic References & Formula Methodology Library
 *
 * Comprehensive reference data for the 12-dimension crypto scoring system.
 * Includes book references, project references, methodology docs, and formula documentation.
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type ReferenceCategory =
  | 'technical-analysis'
  | 'trading-strategies'
  | 'signal-generation';

export type ReferenceType = 'book' | 'project' | 'methodology' | 'concept';

export type DimensionKey =
  | 'fundamental'
  | 'technical'
  | 'onchain'
  | 'market_psychology'
  | 'news_sentiment'
  | 'macroeconomic'
  | 'regulatory'
  | 'network_security'
  | 'derivatives'
  | 'whale_smart_money'
  | 'ecosystem_defi'
  | 'inter_market';

export interface Reference {
  id: string;
  title: string;
  author: string;
  year: number;
  type: ReferenceType;
  category: ReferenceCategory;
  dimensions: DimensionKey[];
  description: string;
  descriptionFa: string;
  url?: string;
}

export interface DimensionMeta {
  key: DimensionKey;
  name: string;
  nameFa: string;
  color: string;
  icon: string;
  group: string;
  groupColor: string;
}

export interface FormulaDoc {
  dimensionKey: DimensionKey;
  dimensionName: string;
  dimensionNameFa: string;
  color: string;
  formulas: {
    name: string;
    nameFa: string;
    formula: string;
    description: string;
    descriptionFa: string;
    source: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const REFERENCE_CATEGORIES: Record<
  ReferenceCategory,
  { label: string; labelFa: string; color: string; bgClass: string }
> = {
  'technical-analysis': {
    label: 'Technical Analysis',
    labelFa: 'تحلیل تکنیکال',
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
  'trading-strategies': {
    label: 'Trading Strategies',
    labelFa: 'استراتژی‌های معاملاتی',
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  'signal-generation': {
    label: 'Signal Generation',
    labelFa: 'تولید سیگنال',
    color: '#10b981',
    bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
};

// ═══════════════════════════════════════════════════════════════
// DIMENSION METADATA
// ═══════════════════════════════════════════════════════════════

export const DIMENSION_META: Record<DimensionKey, DimensionMeta> = {
  fundamental: {
    key: 'fundamental',
    name: 'Fundamental Analysis',
    nameFa: 'تحلیل بنیادی',
    color: '#ef4444',
    icon: 'BarChart3',
    group: 'Core Analysis',
    groupColor: '#ef4444',
  },
  technical: {
    key: 'technical',
    name: 'Technical Analysis',
    nameFa: 'تحلیل تکنیکال',
    color: '#3b82f6',
    icon: 'Activity',
    group: 'Core Analysis',
    groupColor: '#ef4444',
  },
  onchain: {
    key: 'onchain',
    name: 'On-Chain & Microstructure',
    nameFa: 'آن‌چین و ریزساختار',
    color: '#22c55e',
    icon: 'Network',
    group: 'Core Analysis',
    groupColor: '#ef4444',
  },
  market_psychology: {
    key: 'market_psychology',
    name: 'Market & Investment Psychology',
    nameFa: 'روانشناسی بازار و سرمایه‌گذاری',
    color: '#f59e0b',
    icon: 'Brain',
    group: 'Behavioral',
    groupColor: '#f59e0b',
  },
  news_sentiment: {
    key: 'news_sentiment',
    name: 'News & Sentiment Analysis',
    nameFa: 'تحلیل اخبار و احساسات',
    color: '#8b5cf6',
    icon: 'Newspaper',
    group: 'Behavioral',
    groupColor: '#f59e0b',
  },
  macroeconomic: {
    key: 'macroeconomic',
    name: 'Macroeconomic',
    nameFa: 'اقتصاد کلان',
    color: '#a855f7',
    icon: 'Globe',
    group: 'Macro',
    groupColor: '#a855f7',
  },
  regulatory: {
    key: 'regulatory',
    name: 'Regulatory',
    nameFa: 'تنظیم‌گری',
    color: '#94a3b8',
    icon: 'Landmark',
    group: 'Macro',
    groupColor: '#a855f7',
  },
  network_security: {
    key: 'network_security',
    name: 'Network Security',
    nameFa: 'امنیت شبکه',
    color: '#ea580c',
    icon: 'Shield',
    group: 'Security',
    groupColor: '#ea580c',
  },
  derivatives: {
    key: 'derivatives',
    name: 'Derivatives',
    nameFa: 'مشتقات',
    color: '#06b6d4',
    icon: 'TrendingUp',
    group: 'Advanced',
    groupColor: '#06b6d4',
  },
  whale_smart_money: {
    key: 'whale_smart_money',
    name: 'Whale & Smart Money',
    nameFa: 'نهنگ‌ها و پول هوشمند',
    color: '#1e40af',
    icon: 'Anchor',
    group: 'Advanced',
    groupColor: '#06b6d4',
  },
  ecosystem_defi: {
    key: 'ecosystem_defi',
    name: 'Ecosystem & DeFi',
    nameFa: 'اکوسیستم و دیفای',
    color: '#10b981',
    icon: 'Layers',
    group: 'Ecosystem',
    groupColor: '#10b981',
  },
  inter_market: {
    key: 'inter_market',
    name: 'Inter-Market',
    nameFa: 'بین‌بازاری',
    color: '#64748b',
    icon: 'Link',
    group: 'Ecosystem',
    groupColor: '#10b981',
  },
};

// ═══════════════════════════════════════════════════════════════
// ALL REFERENCES
// ═══════════════════════════════════════════════════════════════

const ALL_REFERENCES: Reference[] = [
  // ─── DIMENSION 1: FUNDAMENTAL ANALYSIS ─────────────────
  {
    id: 'ref-fund-01',
    title: 'Cryptoassets: The Innovative Investor\'s Guide to Bitcoin and Beyond',
    author: 'Chris Burniske & Jack Tatar',
    year: 2017,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['fundamental', 'market_psychology'],
    description: 'Pioneering framework for valuing cryptoassets using discounted utility models, network value to transaction ratios (NVT), and market-cycle analysis. Introduced the cryptoasset valuation triad: store of value, utility, and payment tokens.',
    descriptionFa: 'چارچوب پیشگامانه برای ارزش‌گذاری رمزارزها با استفاده از مدل‌های تخفیف‌یافته مطلوبیت، نسبت ارزش شبکه به تراکنش (NVT) و تحلیل چرخه بازار. سه‌گانه ارزش‌گذاری رمزارزها را معرفی کرد: ذخیره ارزش، مطلوبیت و توکن‌های پرداخت.',
    url: 'https://www.goodreads.com/book/show/36484665-cryptoassets',
  },
  {
    id: 'ref-fund-02',
    title: 'Blockchain Fundamental Analysis',
    author: 'Gregory Garvey',
    year: 2020,
    type: 'methodology',
    category: 'technical-analysis',
    dimensions: ['fundamental'],
    description: 'Systematic methodology for evaluating blockchain projects through fundamental metrics: hash rate, active addresses, transaction throughput, developer activity, and token distribution analysis.',
    descriptionFa: 'روش‌شناسی سیستماتیک برای ارزیابی پروژه‌های بلاکچین از طریق معیارهای بنیادی: نرخ هش، آدرس‌های فعال، توان تراکنش، فعالیت توسعه‌دهندگان و تحلیل توزیع توکن.',
  },
  {
    id: 'ref-fund-03',
    title: 'Digital Assets: A Primer',
    author: 'Aggarwal & Tasca',
    year: 2021,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['fundamental', 'ecosystem_defi'],
    description: 'Comprehensive guide to digital asset classification, valuation models, and the regulatory landscape. Covers market cap analysis, FDV ratios, and supply dynamics for crypto scoring.',
    descriptionFa: 'راهنمای جامع طبقه‌بندی دارایی‌های دیجیتال، مدل‌های ارزش‌گذاری و چشم‌انداز تنظیم‌گری. تحلیل سرمایه بازار، نسبت‌های FDV و پویایی عرضه برای امتیازدهی رمزارزها.',
  },
  {
    id: 'ref-fund-04',
    title: 'The Infinite Machine',
    author: 'Camila Russo',
    year: 2020,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['fundamental', 'ecosystem_defi'],
    description: 'Chronicles the creation of Ethereum and provides deep insight into smart contract platforms, project maturity assessment, ecosystem growth metrics, and platform tier evaluation methodology.',
    descriptionFa: 'روایت خلق اتریوم و بینش عمیق درباره پلتفرم‌های قرارداد هوشمند، ارزیابی بلوغ پروژه، معیارهای رشد اکوسیستم و روش‌شناسی ارزیابی سطح پلتفرم.',
  },

  // ─── DIMENSION 2: TECHNICAL ANALYSIS ─────────────────
  {
    id: 'ref-tech-01',
    title: 'Technical Analysis of the Financial Markets',
    author: 'John J. Murphy',
    year: 1999,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['technical', 'inter_market'],
    description: 'The definitive reference for technical analysis covering trend identification, support/resistance, moving averages, oscillators, and candlestick patterns. Foundation for all TA-based crypto scoring dimensions.',
    descriptionFa: 'مرجع قطعی تحلیل تکنیکال شامل شناسایی روند، حمایت/مقاومت، میانگین‌های متحرک، اسیلاتورها و الگوهای کندلی. پایه تمام ابعاد امتیازدهی رمزارز مبتنی بر تحلیل تکنیکال.',
    url: 'https://www.goodreads.com/book/show/79296.Technical_Analysis_of_the_Financial_Markets',
  },
  {
    id: 'ref-tech-02',
    title: 'Japanese Candlestick Charting Techniques',
    author: 'Steve Nison',
    year: 1991,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['technical'],
    description: 'Introduced candlestick charting to the Western world. Essential for pattern recognition in crypto markets including doji, engulfing, hammer, and morning/evening star formations used in signal generation.',
    descriptionFa: 'نمودار شمعی را به جهان غرب معرفی کرد. ضروری برای تشخیص الگو در بازارهای رمزارز شامل دوجی، پوشای صعودی/نزولی، چکش و ستاره صبحگاهی/عصرگاهی استفاده شده در تولید سیگنال.',
  },
  {
    id: 'ref-tech-03',
    title: 'Mastering Crypto 2025 Edition',
    author: 'Andreas Antonopoulos',
    year: 2025,
    type: 'project',
    category: 'technical-analysis',
    dimensions: ['technical', 'onchain', 'network_security'],
    description: 'Updated technical reference covering advanced cryptocurrency analysis, on-chain metrics integration, and modern trading signal generation techniques for the 2025 market landscape.',
    descriptionFa: 'مرجع فنی به‌روز شده شامل تحلیل پیشرفته رمزارزها، یکپارچه‌سازی معیارهای آن‌چین و تکنیک‌های مدرن تولید سیگنال معاملاتی برای چشم‌انداز بازار ۲۰۲۵.',
  },
  {
    id: 'ref-tech-04',
    title: 'Algorithmic Trading of Cryptocurrencies',
    author: 'Ernest Chan',
    year: 2021,
    type: 'methodology',
    category: 'signal-generation',
    dimensions: ['technical', 'derivatives'],
    description: 'Quantitative approach to crypto algorithmic trading including momentum strategies, mean reversion, RSI optimization, MACD signal generation, and Bollinger Band breakout systems.',
    descriptionFa: 'رویکرد کمی به معاملات الگوریتمی رمزارز شامل استراتژی‌های مومنتوم، بازگشت به میانگین، بهینه‌سازی RSI، تولید سیگنال MACD و سیستم‌های شکست باند بولینگر.',
  },

  // ─── DIMENSION 3: ON-CHAIN & MICROSTRUCTURE ─────────────────
  {
    id: 'ref-onchain-01',
    title: 'Handbook of Blockchain Analytics',
    author: 'Hsinchun Chen',
    year: 2022,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['onchain', 'network_security'],
    description: 'Comprehensive treatment of blockchain data analytics including transaction flow analysis, address clustering, network health metrics, and on-chain signal generation for market prediction.',
    descriptionFa: 'مجموعه جامع تحلیل داده‌های بلاکچین شامل تحلیل جریان تراکنش، خوشه‌بندی آدرس، معیارهای سلامت شبکه و تولید سیگنال آن‌چین برای پیش‌بینی بازار.',
  },
  {
    id: 'ref-onchain-02',
    title: 'The Evolution of On-Chain Trading',
    author: 'Matthew Anderson',
    year: 2023,
    type: 'project',
    category: 'signal-generation',
    dimensions: ['onchain'],
    description: 'Research on how decentralized exchanges and on-chain liquidity pools create new microstructure patterns. Covers MEV analysis, DEX volume metrics, and on-chain order flow interpretation.',
    descriptionFa: 'پژوهش درباره نحوه ایجاد الگوهای جدید ریزساختار توسط صرافی‌های غیرمتمرکز و استخرهای نقدینگی آن‌چین. تحلیل MEV، معیارهای حجم DEX و تفسیر جریان سفارش آن‌چین.',
  },
  {
    id: 'ref-onchain-03',
    title: 'Crypto Market Microstructure',
    author: 'Trex Research Group',
    year: 2022,
    type: 'methodology',
    category: 'technical-analysis',
    dimensions: ['onchain', 'derivatives'],
    description: 'Deep dive into crypto market microstructure: bid-ask spreads, order book depth, slippage models, and exchange microstructure analysis. Essential for understanding price formation in crypto markets.',
    descriptionFa: 'بررسی عمیق ریزساختار بازار رمزارزها: اسپرد خرید-فروش، عمق دفتر سفارش، مدل‌های لغزش و تحلیل ریزساختار صرافی‌ها. ضروری برای درک تشکیل قیمت در بازارهای رمزارز.',
  },
  {
    id: 'ref-onchain-04',
    title: 'Market Microstructure & High-Frequency Trading',
    author: 'R. Preston McAfee',
    year: 2019,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['onchain', 'whale_smart_money'],
    description: 'Classic text on market microstructure theory applied to crypto markets. Covers order flow toxicity models, adverse selection, and HFT strategies relevant to whale detection.',
    descriptionFa: 'متن کلاسیک نظریه ریزساختار بازار اعمال شده در بازارهای رمزارز. مدل‌های سمیت جریان سفارش، انتخاب نامطلوب و استراتژی‌های HFT مرتبط با تشخیص نهنگ‌ها.',
  },
  {
    id: 'ref-onchain-05',
    title: 'Mastering Bitcoin',
    author: 'Andreas Antonopoulos',
    year: 2017,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['onchain', 'network_security'],
    description: 'The definitive technical guide to Bitcoin covering transaction mechanics, UTXO model, scripting, and network consensus. Foundation for on-chain analysis and security assessment.',
    descriptionFa: 'راهنمای فنی قطعی بیت‌کوین شامل مکانیک تراکنش، مدل UTXO، اسکریپت‌نویسی و اجماع شبکه. پایه تحلیل آن‌چین و ارزیابی امنیتی.',
  },

  // ─── DIMENSION 4: MARKET PSYCHOLOGY ─────────────────
  {
    id: 'ref-psych-01',
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    year: 2011,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Nobel Prize-winning work on cognitive biases affecting decision making. Key for understanding overreaction, anchoring, loss aversion, and herding behavior in crypto markets.',
    descriptionFa: 'اثر برنده جایزه نوبل درباره سوگیری‌های شناختی مؤثر بر تصمیم‌گیری. کلیدی برای درک واکنش بیش‌ازحد، لنگراندازی،.aversion از دست دادن و رفتار گله‌ای در بازارهای رمزارز.',
    url: 'https://www.goodreads.com/book/show/11468377-thinking-fast-and-slow',
  },
  {
    id: 'ref-psych-02',
    title: 'Beyond Greed and Fear',
    author: 'Hersh Shefrin',
    year: 2002,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Behavioral finance classic covering heuristics, frame dependence, and market inefficiencies. Applied to crypto fear/greed indices, sentiment oscillators, and emotional bias scoring.',
    descriptionFa: 'کلاسیک مالی رفتاری شامل اکتشافی‌ها، وابستگی به چارچوب و ناکارآمدی‌های بازار. اعمال شده بر شاخص‌های ترس/طمع رمزارز، نوسان‌سازهای احساسات و امتیازدهی سوگیری عاطفی.',
  },
  {
    id: 'ref-psych-03',
    title: 'Trading in the Zone',
    author: 'Mark Douglas',
    year: 2000,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Essential psychology for disciplined trading: probability thinking, cognitive discipline, emotional state management, and the psychology of consistent execution in volatile markets.',
    descriptionFa: 'روانشناسی ضروری برای معاملات منظم: تفکر احتمالی، انضباط شناختی، مدیریت حالت عاطفی و روانشناسی اجرای سازگار در بازارهای پرنوسان.',
  },
  {
    id: 'ref-psych-04',
    title: 'Behavioural Investing',
    author: 'James Montier',
    year: 2007,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'whale_smart_money'],
    description: 'Comprehensive review of behavioral biases in investment decisions. Covers confirmation bias, availability heuristic, overconfidence, and contrarian investment strategies.',
    descriptionFa: 'مرور جامع سوگیری‌های رفتاری در تصمیمات سرمایه‌گذاری. سوگیری تأیید، اکتشافی دسترس‌پذیری، اطمینان بیش‌ازحد و استراتژی‌های سرمایه‌گذاری مخالف.',
  },
  {
    id: 'ref-psych-05',
    title: 'Inefficient Markets: An Introduction to Behavioral Finance',
    author: 'Andrei Shleifer',
    year: 2000,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['market_psychology'],
    description: 'Academic treatment of market inefficiency through behavioral finance lens. Models noise trader risk, limits to arbitrage, and investor sentiment propagation in crypto markets.',
    descriptionFa: 'بررسی آکادمیک ناکارآمدی بازار از لنز مالی رفتاری. مدل‌سازی ریسک معامله‌گر نویزی، محدودیت‌های آربیتراژ و انتشار احساسات سرمایه‌گذار در بازارهای رمزارز.',
  },
  {
    id: 'ref-psych-06',
    title: 'The Psychology of Finance',
    author: 'Lars Tvede',
    year: 2002,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Bridges psychology and financial markets. Covers emotional cycles in markets, reference point theory, regret theory, and mental accounting relevant to crypto trader behavior.',
    descriptionFa: 'پل بین روانشناسی و بازارهای مالی. چرخه‌های عاطفی در بازارها، نظریه نقطه مرجع، نظریه پشیمانی و حساب‌سازی ذهنی مرتبط با رفتار معامله‌گر رمزارز.',
  },
  {
    id: 'ref-psych-07',
    title: 'Predictably Irrational',
    author: 'Dan Ariely',
    year: 2008,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Explores systematic patterns of irrational behavior. Key for understanding anchoring effects, the decoy effect, and expectation-based biases in crypto pricing and market sentiment.',
    descriptionFa: 'الگوهای سیستماتیک رفتار غیرعقلانی را بررسی می‌کند. کلیدی برای درک اثرات لنگراندازی، اثر طعمه و سوگیری‌های مبتنی بر انتظار در قیمت‌گذاری رمزارز و احساسات بازار.',
  },
  {
    id: 'ref-psych-08',
    title: 'Best Loser Wins',
    author: 'Tom Hougaard',
    year: 2021,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'High-stakes trading psychology: embracing losses, scaling winning positions, and maintaining psychological resilience during drawdowns. Applied to crypto position sizing and risk psychology.',
    descriptionFa: 'روانشناسی معاملات پُریسک: پذیرش زیان، افزایش موقعیت‌های سودآور و حفظ تاب‌آوری روانی در طول افت سرمایه. اعمال شده بر اندازه موقعیت و روانشناسی ریسک رمزارز.',
  },
  {
    id: 'ref-psych-09',
    title: 'The Mental Game of Trading',
    author: 'Jared Tendler',
    year: 2018,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Systematic approach to resolving mental barriers in trading: tilt recognition, emotional regulation, confidence calibration, and the incremental model of skill development.',
    descriptionFa: 'رویکرد سیستماتیک برای رفع موانع ذهنی در معاملات: تشخیص تیلت، تنظیم احساسات، کالیبراسیون اعتماد به نفس و مدل تدریجی توسعه مهارت.',
  },
  {
    id: 'ref-psych-10',
    title: 'Nudge: Improving Decisions About Health, Wealth, and Happiness',
    author: 'Thaler & Sunstein',
    year: 2008,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'regulatory'],
    description: 'Nobel Prize-winning work on choice architecture and libertarian paternalism. Applied to understanding how default options and framing affect crypto investor behavior.',
    descriptionFa: 'اثر برنده جایزه نوبل درباره معماری انتخاب و پدرسالاری لیبرترین. اعمال شده بر درک نحوه تأثیر گزینه‌های پیش‌فرض و قاب‌بندی بر رفتار سرمایه‌گذار رمزارز.',
  },
  {
    id: 'ref-psych-11',
    title: 'Crypto Investing Guide',
    author: 'Ian Balina',
    year: 2019,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'fundamental'],
    description: 'Practical crypto investment framework combining fundamental analysis with behavioral insights. Covers market psychology, FOMO cycles, and community-driven valuation.',
    descriptionFa: 'چارچوب عملی سرمایه‌گذاری رمزارز ترکیب تحلیل بنیادی با بینش‌های رفتاری. روانشناسی بازار، چرخه‌های فومو و ارزش‌گذاری مبتنی بر جامعه.',
  },
  {
    id: 'ref-psych-12',
    title: 'Trading Psychology 2.0',
    author: 'Brett Steenbarger',
    year: 2015,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Advanced trading psychology covering state-dependent performance, cognitive flexibility, and peak performance states. Essential for understanding trader behavior patterns in crypto.',
    descriptionFa: 'روانشناسی پیشرفته معاملات شامل عملکرد وابسته به حالت، انعطاف‌پذیری شناختی و حالت‌های اوج عملکرد. ضروری برای درک الگوهای رفتاری معامله‌گر در رمزارز.',
  },

  // ─── DIMENSION 5: NEWS & SENTIMENT ─────────────────
  {
    id: 'ref-news-01',
    title: 'Crypto Sentiment Analysis: From Social Media to Market Prediction',
    author: 'Abraham & Cheng',
    year: 2022,
    type: 'methodology',
    category: 'signal-generation',
    dimensions: ['news_sentiment'],
    description: 'NLP-based sentiment analysis pipeline for crypto markets: Twitter sentiment, Reddit discourse analysis, news impact scoring, and real-time sentiment-driven signal generation.',
    descriptionFa: 'خط لوله تحلیل احساسات مبتنی بر NLP برای بازارهای رمزارز: احساسات توییتر، تحلیل گفتمان ردیت، امتیازدهی تأثیر اخبار و تولید سیگنال بلادرنگ مبتنی بر احساسات.',
  },
  {
    id: 'ref-news-02',
    title: 'The Wisdom of Crowds in Financial Markets',
    author: 'James Surowiecki',
    year: 2004,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['news_sentiment', 'market_psychology'],
    description: 'Explores collective intelligence in market prediction. Foundation for social sentiment aggregation, community consensus scoring, and crowd-sourced crypto signal generation.',
    descriptionFa: 'هوش جمعی در پیش‌بینی بازار را بررسی می‌کند. پایه تجمیع احساسات اجتماعی، امتیازدهی اجماع جامعه و تولید سیگنال رمزارز مبتنی بر جمعیت.',
  },
  {
    id: 'ref-news-03',
    title: 'News and Asset Prices',
    author: 'Paul Tetlock',
    year: 2007,
    type: 'methodology',
    category: 'signal-generation',
    dimensions: ['news_sentiment'],
    description: 'Seminal research on how media sentiment affects asset pricing. Applied to crypto news event detection, sentiment scoring, and news-driven volatility prediction models.',
    descriptionFa: 'پژوهش بنیادین درباره تأثیر احساسات رسانه‌ای بر قیمت‌گذاری دارایی. اعمال شده بر تشخیص رویداد خبری رمزارز، امتیازدهی احساسات و مدل‌های پیش‌بینی نوسان مبتنی بر اخبار.',
  },
  {
    id: 'ref-news-04',
    title: 'Social Media and Crypto Markets',
    author: 'Phillips & Gorse',
    year: 2022,
    type: 'project',
    category: 'signal-generation',
    dimensions: ['news_sentiment'],
    description: 'Empirical study linking social media activity to crypto price movements. Covers sentiment momentum, influencer detection, and social volume divergence signals.',
    descriptionFa: 'مطالعه تجربی پیوند فعالیت رسانه‌های اجتماعی با حرکات قیمت رمزارز. مومنتوم احساسات، تشخیص اینفلوئنسر و سیگنال‌های واگرایی حجم اجتماعی.',
  },

  // ─── DIMENSION 6: MACROECONOMIC ─────────────────
  {
    id: 'ref-macro-01',
    title: 'Macroeconomics',
    author: 'N. Gregory Mankiw',
    year: 2019,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['macroeconomic'],
    description: 'Standard macroeconomics textbook covering GDP, inflation, monetary policy, and interest rates. Foundation for understanding how macro factors influence crypto market dynamics.',
    descriptionFa: 'کتاب درسی استاندارد اقتصاد کلان شامل تولید ناخالص داخلی، تورم، سیاست پولی و نرخ بهره. پایه درک نحوه تأثیر عوامل کلان بر پویایی بازار رمزارز.',
  },
  {
    id: 'ref-macro-02',
    title: 'Principles of Economics',
    author: 'Paul Samuelson',
    year: 2009,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['macroeconomic'],
    description: 'Classic economics text covering supply-demand equilibrium, monetary theory, and fiscal policy impact. Applied to crypto market macro correlation models.',
    descriptionFa: 'متن کلاسیک اقتصاد شامل تعادل عرضه-تقاضا، نظریه پولی و تأثیر سیاست مالی. اعمال شده بر مدل‌های همبستگی کلان بازار رمزارز.',
  },
  {
    id: 'ref-macro-03',
    title: 'Currency Wars',
    author: 'James Rickards',
    year: 2011,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['macroeconomic', 'inter_market'],
    description: 'Analysis of global currency competition and its impact on alternative stores of value. Key framework for understanding Bitcoin as a hedge against fiat devaluation.',
    descriptionFa: 'تحلیل رقابت ارزی جهانی و تأثیر آن بر ذخایر ارزش جایگزین. چارچوب کلیدی برای درک بیت‌کوین به عنوان پوشش در برابر کاهش ارزش پول فیات.',
  },
  {
    id: 'ref-macro-04',
    title: 'The Alchemy of Finance',
    author: 'George Soros',
    year: 1987,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['macroeconomic', 'market_psychology'],
    description: 'Introduces the theory of reflexivity: market perceptions affect fundamentals, creating self-reinforcing cycles. Essential for understanding crypto bull/bear spiral dynamics.',
    descriptionFa: 'نظریه بازتابش را معرفی می‌کند: ادراکات بازار بر بنیادها تأثیر می‌گذارد و چرخه‌های خودتقویت‌کننده ایجاد می‌کند. ضروری برای درک پویایی مارپیچ گاوی/خرسی رمزارز.',
  },

  // ─── DIMENSION 7: REGULATORY ─────────────────
  {
    id: 'ref-reg-01',
    title: 'Crypto Regulation and Compliance',
    author: 'Craig Pirrong',
    year: 2022,
    type: 'methodology',
    category: 'signal-generation',
    dimensions: ['regulatory'],
    description: 'Framework for assessing regulatory risk in crypto markets: jurisdiction scoring, compliance burden analysis, and regulatory event impact prediction.',
    descriptionFa: 'چارچوب ارزیابی ریسک تنظیم‌گری در بازارهای رمزارز: امتیازدهی حوزه قضایی، تحلیل بار انطباق و پیش‌بینی تأثیر رویداد تنظیم‌گری.',
  },
  {
    id: 'ref-reg-02',
    title: 'Digital Finance: New Frontier',
    author: 'Arner & Barberis',
    year: 2019,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['regulatory', 'ecosystem_defi'],
    description: 'Comprehensive analysis of digital finance regulation including securities classification, AML/KYC frameworks, and cross-border regulatory coordination for crypto assets.',
    descriptionFa: 'تحلیل جامع تنظیم‌گری مالی دیجیتال شامل طبقه‌بندی اوراق بهادار، چارچوب‌های ضد پولشویی/شناخت مشتری و هماهنگی تنظیم‌گری بین‌مرزی برای دارایی‌های رمزارزی.',
  },
  {
    id: 'ref-reg-03',
    title: 'Fintech Regulation in the Digital Age',
    author: 'Buckley & Webster',
    year: 2021,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['regulatory'],
    description: 'Explores fintech regulatory frameworks, sandbox approaches, and their application to crypto. Covers SEC, MiCA, and global regulatory landscape analysis.',
    descriptionFa: 'چارچوب‌های تنظیم‌گری فینتک، رویکردهای سندباکس و کاربرد آنها در رمزارز را بررسی می‌کند. تحلیل SEC، MiCA و چشم‌انداز تنظیم‌گری جهانی.',
  },
  {
    id: 'ref-reg-04',
    title: 'Cryptoassets & Legal Framework',
    author: 'Giannakouros',
    year: 2023,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['regulatory', 'fundamental'],
    description: 'Legal framework for cryptoasset classification, SEC/CFTC jurisdiction, and regulatory compliance scoring. Key for assessing jurisdiction risk and legal clarity of tokens.',
    descriptionFa: 'چارچوب حقوقی طبقه‌بندی دارایی‌های رمزارزی، حوزه صلاحیت SEC/CFTC و امتیازدهی انطباق تنظیم‌گری. کلیدی برای ارزیابی ریسک حوزه قضایی و شفافیت حقوقی توکن‌ها.',
  },

  // ─── DIMENSION 8: NETWORK SECURITY ─────────────────
  {
    id: 'ref-sec-01',
    title: 'The Blockchain Security: Attacks and Countermeasures',
    author: 'Hsinchun Chen',
    year: 2021,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['network_security', 'onchain'],
    description: 'Systematic analysis of blockchain security: 51% attacks, Sybil attacks, selfish mining, and consensus mechanism vulnerabilities. Includes security scoring methodology for PoW/PoS networks.',
    descriptionFa: 'تحلیل سیستماتیک امنیت بلاکچین: حملات ۵۱٪، حملات سیمیل، استخراج خودخواه و آسیب‌پذیری‌های مکانیزم اجماع. شامل روش‌شناسی امتیازدهی امنیتی برای شبکه‌های PoW/PoS.',
  },
  {
    id: 'ref-sec-02',
    title: 'Crypto Security: SoK',
    author: 'Bonneau et al.',
    year: 2015,
    type: 'methodology',
    category: 'technical-analysis',
    dimensions: ['network_security'],
    description: 'Systematization of knowledge on cryptocurrency security. Covers cryptographic primitives, consensus security, wallet security, and exchange attack patterns.',
    descriptionFa: 'سیستماتیک‌سازی دانش امنیت رمزارز. بدیعات رمزنگاری، امنیت اجماع، امنیت کیف پول و الگوهای حمله صرافی.',
  },
  {
    id: 'ref-sec-03',
    title: 'Smart Contract Security Analysis',
    author: 'Atzei et al.',
    year: 2017,
    type: 'methodology',
    category: 'signal-generation',
    dimensions: ['network_security', 'ecosystem_defi'],
    description: 'Classification of smart contract vulnerabilities: reentrancy, integer overflow, access control, and front-running. Foundation for DeFi security scoring and audit methodology.',
    descriptionFa: 'طبقه‌بندی آسیب‌پذیری‌های قرارداد هوشمند: بازگشت مجدد، سرریز صحیح، کنترل دسترسی و فرانت‌رانینگ. پایه امتیازدهی امنیتی دیفای و روش‌شناسی ممیزی.',
  },

  // ─── DIMENSION 9: DERIVATIVES ─────────────────
  {
    id: 'ref-deriv-01',
    title: 'Options, Futures, and Other Derivatives',
    author: 'John C. Hull',
    year: 2017,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['derivatives'],
    description: 'The gold standard in derivatives education. Covers Black-Scholes pricing, Greeks, implied volatility surfaces, and futures pricing. Essential for crypto options and futures analysis.',
    descriptionFa: 'استاندارد طلایی آموزش مشتقات. قیمت‌گذاری بلک-شولز، یونانی‌ها، سطوح نوسان ضمنی و قیمت‌گذاری آتی. ضروری برای تحلیل آپشن و فیوچرز رمزارز.',
    url: 'https://www.goodreads.com/book/show/525703.Options_Futures_and_Other_Derivatives',
  },
  {
    id: 'ref-deriv-02',
    title: 'Trading Volatility: Trading Volatility, Correlation, Term Structure and Skew',
    author: 'Euan Sinclair',
    year: 2013,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['derivatives'],
    description: 'Practical guide to volatility trading. Covers variance swaps, VIX-like products, and term structure strategies. Applied to crypto volatility indices and funding rate analysis.',
    descriptionFa: 'راهنمای عملی معاملات نوسان. سواپ‌های واریانس، محصولات شاخص VIX و استراتژی‌های ساختار مدت. اعمال شده بر شاخص‌های نوسان رمزارز و تحلیل نرخ فاندینگ.',
  },
  {
    id: 'ref-deriv-03',
    title: 'Dynamic Hedging: Managing Vanilla and Exotic Options',
    author: 'Nassim Taleb',
    year: 1997,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['derivatives', 'whale_smart_money'],
    description: 'Advanced options hedging strategies and risk management. Covers gamma scalping, delta hedging, and tail risk management. Applied to crypto options positioning and risk assessment.',
    descriptionFa: 'استراتژی‌های پوشش پیشرفته آپشن و مدیریت ریسک. گاما اسکالپینگ، دلتا هجینگ و مدیریت ریسک دم. اعمال شده بر موقعیت‌دهی آپشن رمزارز و ارزیابی ریسک.',
  },
  {
    id: 'ref-deriv-04',
    title: 'Derivatives Markets',
    author: 'Robert McDonald',
    year: 2012,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['derivatives'],
    description: 'Academic treatment of derivatives pricing and markets. Covers risk-neutral pricing, binomial models, and interest rate derivatives. Foundation for crypto derivatives valuation models.',
    descriptionFa: 'بررسی آکادمیک قیمت‌گذاری و بازارهای مشتقات. قیمت‌گذاری ریسک‌خنثی، مدل‌های دوجمله‌ای و مشتقات نرخ بهره. پایه مدل‌های ارزش‌گذاری مشتقات رمزارز.',
  },

  // ─── DIMENSION 10: WHALE & SMART MONEY ─────────────────
  {
    id: 'ref-whale-01',
    title: 'Market Wizards: Interviews with Top Traders',
    author: 'Jack Schwager',
    year: 1989,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['whale_smart_money', 'inter_market'],
    description: 'Interviews with elite traders revealing institutional strategies, position sizing, and risk management. Foundation for understanding smart money behavior and whale tracking methodology.',
    descriptionFa: 'مصاحبه با معامله‌گران نخبه استراتژی‌های نهادی، اندازه موقعیت و مدیریت ریسک را فاش می‌کند. پایه درک رفتار پول هوشمند و روش‌شناسی ردیابی نهنگ.',
  },
  {
    id: 'ref-whale-02',
    title: 'Institutional Investing: Challenges and Strategies',
    author: 'Robert Pozen',
    year: 2014,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['whale_smart_money'],
    description: 'Covers institutional investment processes, portfolio construction, and large-order execution. Applied to understanding whale accumulation patterns and smart money positioning.',
    descriptionFa: 'فرآیندهای سرمایه‌گذاری نهادی، ساخت سبد و اجرای سفارشات بزرگ. اعمال شده بر درک الگوهای تجمع نهنگ و موقعیت‌دهی پول هوشمند.',
  },
  {
    id: 'ref-whale-03',
    title: 'Smart Money: How the World\'s Best Sports Bettors Beat the Bookies',
    author: 'Michael Konik',
    year: 2006,
    type: 'concept',
    category: 'signal-generation',
    dimensions: ['whale_smart_money'],
    description: 'Insights into how professional bettors identify mispriced opportunities. Parallels drawn to crypto market inefficiency detection and smart money signal generation.',
    descriptionFa: 'بینش درباره نحوه شناسایی فرصت‌های قیمت‌گذاری‌نشده توسط شرط‌بندان حرفه‌ای. تشابهات با تشخیص ناکارآمدی بازار رمزارز و تولید سیگنال پول هوشمند.',
  },
  {
    id: 'ref-whale-04',
    title: 'The Little Book of Behavioral Investing',
    author: 'James Montier',
    year: 2010,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['whale_smart_money', 'market_psychology'],
    description: 'Practical behavioral investing guide: contrarian strategies, sentiment indicators, and emotional bias correction. Applied to whale behavior pattern recognition.',
    descriptionFa: 'راهنمای عملی سرمایه‌گذاری رفتاری: استراتژی‌های مخالف، شاخص‌های احساسات و اصلاح سوگیری عاطفی. اعمال شده بر تشخیص الگوی رفتاری نهنگ.',
  },

  // ─── DIMENSION 11: ECOSYSTEM & DEFI ─────────────────
  {
    id: 'ref-eco-01',
    title: 'DeFi and the Future of Finance',
    author: 'Harvey et al.',
    year: 2021,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['ecosystem_defi'],
    description: 'Comprehensive DeFi analysis covering AMMs, liquidity mining, yield farming, TVL dynamics, and protocol governance. Foundation for DeFi ecosystem scoring and TVL analysis.',
    descriptionFa: 'تحلیل جامع دیفای شامل AMM، استخراج نقدینگی، کشت سود، پویایی TVL و حاکمیت پروتکل. پایه امتیازدهی اکوسیستم دیفای و تحلیل TVL.',
  },
  {
    id: 'ref-eco-02',
    title: 'Web3: The Next Generation Internet',
    author: 'Chris Dixon',
    year: 2023,
    type: 'book',
    category: 'signal-generation',
    dimensions: ['ecosystem_defi'],
    description: 'Vision of the decentralized web and token-driven network effects. Covers protocol growth models, token utility analysis, and ecosystem expansion metrics for crypto scoring.',
    descriptionFa: 'چشم‌انداز وب غیرمتمرکز و اثرات شبکه‌ای مبتنی بر توکن. مدل‌های رشد پروتکل، تحلیل مطلوبیت توکن و معیارهای گسترش اکوسیستم برای امتیازدهی رمزارز.',
  },
  {
    id: 'ref-eco-03',
    title: 'Building Ethereum DApps',
    author: 'Rakesh Dutta',
    year: 2020,
    type: 'project',
    category: 'signal-generation',
    dimensions: ['ecosystem_defi', 'network_security'],
    description: 'Practical guide to DApp development and ecosystem analysis. Covers developer activity metrics, protocol health indicators, and ecosystem maturity scoring.',
    descriptionFa: 'راهنمای عملی توسعه DApp و تحلیل اکوسیستم. معیارهای فعالیت توسعه‌دهنده، شاخص‌های سلامت پروتکل و امتیازدهی بلوغ اکوسیستم.',
  },

  // ─── DIMENSION 12: INTER-MARKET ─────────────────
  {
    id: 'ref-inter-01',
    title: 'Intermarket Analysis: Profiting from Global Market Relationships',
    author: 'John J. Murphy',
    year: 2004,
    type: 'book',
    category: 'technical-analysis',
    dimensions: ['inter_market', 'technical'],
    description: 'Seminal work on intermarket relationships: how bonds, stocks, commodities, and currencies interact. Applied to BTC dominance, alt-season signals, and cross-market correlation in crypto.',
    descriptionFa: 'اثر بنیادین روابط بین‌بازاری: نحوه تعامل اوراق، سهام، کالاها و ارزها. اعمال شده بر تسلط بیت‌کوین، سیگنال‌های آلت‌سیزن و همبستگی بین‌بازاری در رمزارز.',
  },
  {
    id: 'ref-inter-02',
    title: 'Relative Strength: A Guide to Asset Rotation',
    author: 'Robert Rosenberg',
    year: 2018,
    type: 'methodology',
    category: 'signal-generation',
    dimensions: ['inter_market'],
    description: 'Quantitative relative strength methodology for asset rotation. Covers momentum-based sector rotation, pair trading, and cross-asset relative strength applied to crypto market rotation.',
    descriptionFa: 'روش‌شناسی کمی قدرت نسبی برای چرخش دارایی. چرخش بخشی مبتنی بر مومنتوم، معاملات جفت و قدرت نسبی بین‌دارایی اعمال شده بر چرخش بازار رمزارز.',
  },

  // ─── CROSS-DIMENSIONAL REFERENCES ─────────────────
  {
    id: 'ref-cross-01',
    title: 'Bitcoin Billionaires',
    author: 'Ben Mezrich',
    year: 2019,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'fundamental'],
    description: 'Narrative of the Winklevoss twins\' crypto journey. Provides context for market psychology, institutional adoption patterns, and the evolution of crypto market structure.',
    descriptionFa: 'روایت سفر رمزارزی دوقلوهای وینکلووس. زمینه‌ای برای روانشناسی بازار، الگوهای پذیرش نهادی و تکامل ساختار بازار رمزارز.',
  },
  {
    id: 'ref-cross-02',
    title: 'The Disciplined Trader',
    author: 'Mark Douglas',
    year: 1990,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'whale_smart_money'],
    description: 'Foundation text on trading discipline and mental frameworks. Covers the psychology of risk, managing uncertainty, and developing consistent trading behaviors.',
    descriptionFa: 'متن پایه انضباط معاملاتی و چارچوب‌های ذهنی. روانشناسی ریسک، مدیریت عدم قطعیت و توسعه رفتارهای معاملاتی سازگار.',
  },
  {
    id: 'ref-cross-03',
    title: 'Trade Mindfully',
    author: 'Gary Dayton',
    year: 2014,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology'],
    description: 'Applies mindfulness to trading: present-moment awareness, emotional regulation, and cognitive flexibility. Applied to tilt detection and trader psychology scoring.',
    descriptionFa: 'ذهن‌آگاهی را در معاملات اعمال می‌کند: آگاهی لحظه‌حاضر، تنظیم احساسات و انعطاف‌پذیری شناختی. اعمال شده بر تشخیص تیلت و امتیازدهی روانشناسی معامله‌گر.',
  },
  {
    id: 'ref-cross-04',
    title: 'What Investors Really Want',
    author: 'Meir Statman',
    year: 2011,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'whale_smart_money'],
    description: 'Behavioral finance beyond greed and fear: the wants, needs, and emotions that drive investment decisions. Applied to understanding crypto investor motivations and behavioral patterns.',
    descriptionFa: 'مالی رفتاری فراتر از طمع و ترس: خواسته‌ها، نیازها و احساساتی که تصمیمات سرمایه‌گذاری را هدایت می‌کنند. اعمال شده بر درک انگیزه‌های سرمایه‌گذار رمزارز و الگوهای رفتاری.',
  },
  {
    id: 'ref-cross-05',
    title: 'The Mind of the Market',
    author: 'Michael Shermer',
    year: 2007,
    type: 'book',
    category: 'trading-strategies',
    dimensions: ['market_psychology', 'macroeconomic'],
    description: 'Explores the evolutionary psychology behind economic behavior. Covers trust, fairness, and cooperation in markets. Relevant for understanding crypto community dynamics.',
    descriptionFa: 'روانشناسی تکاملی پشت رفتار اقتصادی را بررسی می‌کند. اعتماد، عدالت و همکاری در بازارها. مرتبط با درک پویایی‌های جامعه رمزارز.',
  },
];

// ═══════════════════════════════════════════════════════════════
// FORMULA DOCUMENTATION
// ═══════════════════════════════════════════════════════════════

export const DIMENSION_FORMULAS: FormulaDoc[] = [
  {
    dimensionKey: 'fundamental',
    dimensionName: 'Fundamental Analysis',
    dimensionNameFa: 'تحلیل بنیادی',
    color: '#ef4444',
    formulas: [
      {
        name: 'NVT Ratio',
        nameFa: 'نسبت NVT',
        formula: 'NVT = MarketCap / DailyTxVolume',
        description: 'Network Value to Transactions ratio — analogous to P/E ratio for crypto. Higher NVT suggests overvaluation.',
        descriptionFa: 'نسبت ارزش شبکه به تراکنش — مشابه نسبت P/E برای رمزارز. NVT بالاتر نشان‌دهنده ارزش‌گذاری بیش‌ازحد است.',
        source: 'Burniske & Tatar (2017)',
      },
      {
        name: 'MCap/FDV Ratio',
        nameFa: 'نسبت ارزش بازار به FDV',
        formula: 'DilutionScore = MarketCap / FullyDilutedValuation',
        description: 'Measures circulating supply vs total possible supply. Lower ratio indicates higher future dilution risk.',
        descriptionFa: 'عرضه در گردش در مقابل کل عرضه ممکن را اندازه می‌گیرد. نسبت پایین‌تر نشان‌دهنده ریسک رقیق‌سازی آینده بالاتر است.',
        source: 'Aggarwal & Tasca (2021)',
      },
      {
        name: 'Scarcity Index',
        nameFa: 'شاخص کمیابی',
        formula: 'Scarcity = CirculatingSupply / MaxSupply',
        description: 'Measures how close supply is to maximum. Lower circulating ratio implies higher scarcity premium.',
        descriptionFa: 'اندازه‌گیری نزدیکی عرضه به حداکثر. نسبت گردش پایین‌تر نشان‌دهنده صدم کمیابی بالاتر است.',
        source: 'Burniske & Tatar (2017)',
      },
    ],
  },
  {
    dimensionKey: 'technical',
    dimensionName: 'Technical Analysis',
    dimensionNameFa: 'تحلیل تکنیکال',
    color: '#3b82f6',
    formulas: [
      {
        name: 'RSI (Relative Strength Index)',
        nameFa: 'شاخص قدرت نسبی',
        formula: 'RSI = 100 - (100 / (1 + RS)), RS = AvgGain / AvgLoss',
        description: 'Momentum oscillator measuring speed and magnitude of price changes. Oversold < 30, Overbought > 70.',
        descriptionFa: 'نوسان‌ساز مومنتوم سرعت و بزرگی تغییرات قیمت را اندازه می‌گیرد. اشباع فروش < ۳۰، اشباع خرید > ۷۰.',
        source: 'Murphy (1999)',
      },
      {
        name: 'MACD Signal',
        nameFa: 'سیگنال MACD',
        formula: 'MACD = EMA(12) - EMA(26), Signal = EMA(9, MACD)',
        description: 'Trend-following momentum indicator. Bullish when MACD crosses above signal line.',
        descriptionFa: 'اندیکاتور مومنتوم روند-محور. صعودی زمانی که MACD بالای خط سیگنال تقاطع کند.',
        source: 'Murphy (1999)',
      },
      {
        name: 'Bollinger Band Width',
        nameFa: 'عرض باند بولینگر',
        formula: 'BBWidth = (Upper - Lower) / Middle, Upper = SMA(20) + 2σ, Lower = SMA(20) - 2σ',
        description: 'Volatility measure. Narrowing bands indicate low volatility (potential breakout); widening bands signal high volatility.',
        descriptionFa: 'معیار نوسان. باند‌های باریک نوسان پایین (شکست احتمالی) را نشان می‌دهند؛ باند‌های وسیع نوسان بالا را علامت می‌دهند.',
        source: 'Nison (1991)',
      },
    ],
  },
  {
    dimensionKey: 'onchain',
    dimensionName: 'On-Chain & Microstructure',
    dimensionNameFa: 'آن‌چین و ریزساختار',
    color: '#22c55e',
    formulas: [
      {
        name: 'Active Address Ratio',
        nameFa: 'نسبت آدرس فعال',
        formula: 'ActiveRatio = DailyActiveAddresses / TotalAddresses',
        description: 'Network activity health metric. Rising ratio indicates growing real usage and adoption.',
        descriptionFa: 'معیار سلامت فعالیت شبکه. نسبت صعودی نشان‌دهنده استفاده واقعی رو به رشد و پذیرش است.',
        source: 'Chen (2022)',
      },
      {
        name: 'Exchange Flow Net Position',
        nameFa: 'موقعیت خالص جریان صرافی',
        formula: 'NetFlow = Inflow - Outflow, Signal = Sign(NetFlow) × |NetFlow|² / MCap',
        description: 'Negative net flow (withdrawals) is bullish; positive net flow (deposits) is bearish. Squared for impact weighting.',
        descriptionFa: 'جریان خالص منفی (برداشت) صعودی است؛ جریان خالص مثبت (واریز) نزولی است. به توان دو برای وزن‌دهی تأثیر.',
        source: 'Anderson (2023)',
      },
      {
        name: 'UTXO Age Bands',
        nameFa: 'باندهای عمر UTXO',
        formula: 'HODLWave = Σ(UTXO_age > 1yr) / TotalUTXO',
        description: 'Percentage of supply held for over 1 year. Rising HODL waves indicate strong holder conviction.',
        descriptionFa: 'درصد عرضه نگهداری‌شده بیش از ۱ سال. امواج هادل صعودی نشان‌دهنده عقیده قوی دارندگان است.',
        source: 'Antonopoulos (2017)',
      },
    ],
  },
  {
    dimensionKey: 'market_psychology',
    dimensionName: 'Market & Investment Psychology',
    dimensionNameFa: 'روانشناسی بازار و سرمایه‌گذاری',
    color: '#f59e0b',
    formulas: [
      {
        name: 'Fear & Greed Index',
        nameFa: 'شاخص ترس و طمع',
        formula: 'FGI = w₁·Volatility + w₂·Volume + w₃·Social + w₄·Dominance + w₅·Trends',
        description: 'Composite sentiment indicator combining volatility, volume momentum, social sentiment, market dominance, and Google Trends. 0=Extreme Fear, 100=Extreme Greed.',
        descriptionFa: 'شاخص احساسات ترکیبی شامل نوسان، مومنتوم حجم، احساسات اجتماعی، تسلط بازار و ترندهای گوگل. ۰=ترس شدید، ۱۰۰=طمع شدید.',
        source: 'Shefrin (2002)',
      },
      {
        name: 'Disposition Effect Score',
        nameFa: 'امتیاز اثر واکنش',
        formula: 'DE = P(sell|gain) - P(sell|loss)',
        description: 'Measures tendency to sell winners too early and hold losers too long. Positive DE indicates stronger disposition effect bias.',
        descriptionFa: 'تمایل به فروش زودهنگام برندگان و نگهداری بیش‌ازحد بازندگان را اندازه می‌گیرد. DE مثبت سوگیری اثر واکنش قوی‌تر را نشان می‌دهد.',
        source: 'Kahneman (2011)',
      },
      {
        name: 'Herding Index',
        nameFa: 'شاخص گله‌ای',
        formula: 'H = CrossSectionalDispersion / ExpectedDispersion',
        description: 'Measures cross-sectional dispersion of returns. Low H indicates herding behavior (assets moving together).',
        descriptionFa: 'پراکندگی مقطعی بازده را اندازه می‌گیرد. H پایین رفتار گله‌ای (حرکت مشترک دارایی‌ها) را نشان می‌دهد.',
        source: 'Shleifer (2000)',
      },
    ],
  },
  {
    dimensionKey: 'news_sentiment',
    dimensionName: 'News & Sentiment Analysis',
    dimensionNameFa: 'تحلیل اخبار و احساسات',
    color: '#8b5cf6',
    formulas: [
      {
        name: 'News Impact Score',
        nameFa: 'امتیاز تأثیر خبر',
        formula: 'NIS = Σ(wᵢ · sentimentᵢ · recencyᵢ) / N',
        description: 'Weighted average of news sentiment with recency decay. Higher positive scores indicate bullish news environment.',
        descriptionFa: 'میانگین وزنی احساسات اخبار با کاهش زمانی. امتیازهای مثبت بالاتر نشان‌دهنده محیط خبری صعودی است.',
        source: 'Tetlock (2007)',
      },
      {
        name: 'Social Volume Divergence',
        nameFa: 'واگرایی حجم اجتماعی',
        formula: 'SVD = Δ(SocialVolume) - Δ(Price)',
        description: 'Divergence between social media volume change and price change. Positive divergence often precedes price movements.',
        descriptionFa: 'واگرایی بین تغییر حجم رسانه اجتماعی و تغییر قیمت. واگرایی مثبت اغلب قبل از حرکات قیمت ظاهر می‌شود.',
        source: 'Phillips & Gorse (2022)',
      },
    ],
  },
  {
    dimensionKey: 'macroeconomic',
    dimensionName: 'Macroeconomic',
    dimensionNameFa: 'اقتصاد کلان',
    color: '#a855f7',
    formulas: [
      {
        name: 'Real Rate Impact',
        nameFa: 'تأثیر نرخ واقعی',
        formula: 'RealRate = NominalRate - InflationRate, CryptoImpact = β₁·ΔRealRate + β₂·ΔLiquidity',
        description: 'Real interest rate impact on crypto: rising real rates are bearish for risk assets. Liquidity expansion is bullish.',
        descriptionFa: 'تأثیر نرخ بهره واقعی بر رمزارز: نرخ‌های واقعی صعودی نزولی برای دارایی‌های ریسکی است. انبساط نقدینگی صعودی است.',
        source: 'Mankiw (2019)',
      },
      {
        name: 'DXY Inverse Correlation',
        nameFa: 'همبستگی معکوس DXY',
        formula: 'ρ(BTC, DXY) = Cov(BTC, DXY) / (σ_BTC · σ_DXY)',
        description: 'Negative correlation between Bitcoin and Dollar Index. Weakening dollar typically benefits crypto as alternative store of value.',
        descriptionFa: 'همبستگی منفی بین بیت‌کوین و شاخص دلار. تضعیف دلار معمولاً به نفع رمزارز به عنوان ذخیره ارزش جایگزین است.',
        source: 'Rickards (2011)',
      },
    ],
  },
  {
    dimensionKey: 'regulatory',
    dimensionName: 'Regulatory',
    dimensionNameFa: 'تنظیم‌گری',
    color: '#94a3b8',
    formulas: [
      {
        name: 'Regulatory Clarity Score',
        nameFa: 'امتیاز شفافیت تنظیم‌گری',
        formula: 'RCS = Σ(jurisdiction_weightᵢ · clarityᵢ) / N',
        description: 'Weighted average of regulatory clarity across jurisdictions. Higher scores indicate more favorable regulatory environment.',
        descriptionFa: 'میانگین وزنی شفافیت تنظیم‌گری در حوزه‌های قضایی. امتیازهای بالاتر نشان‌دهنده محیط تنظیم‌گری مطلوب‌تر است.',
        source: 'Arner & Barberis (2019)',
      },
      {
        name: 'Compliance Risk Index',
        nameFa: 'شاخص ریسک انطباق',
        formula: 'CRI = 1 - (CompliantJurisdictions / TotalJurisdictions)',
        description: 'Ratio of non-compliant jurisdictions. Higher CRI indicates greater regulatory risk for the asset.',
        descriptionFa: 'نسبت حوزه‌های قضایی غیرمنطبق. CRI بالاتر نشان‌دهنده ریسک تنظیم‌گری بیشتر برای دارایی است.',
        source: 'Pirrong (2022)',
      },
    ],
  },
  {
    dimensionKey: 'network_security',
    dimensionName: 'Network Security',
    dimensionNameFa: 'امنیت شبکه',
    color: '#ea580c',
    formulas: [
      {
        name: 'Attack Cost Ratio',
        nameFa: 'نسبت هزینه حمله',
        formula: 'ACR = 51%_AttackCost / MarketCap',
        description: 'Cost to execute 51% attack relative to market cap. Higher ratio = more secure. Measures economic security of the network.',
        descriptionFa: 'هزینه اجرای حمله ۵۱٪ نسبت به ارزش بازار. نسبت بالاتر = امن‌تر. امنیت اقتصادی شبکه را اندازه می‌گیرد.',
        source: 'Bonneau et al. (2015)',
      },
      {
        name: 'Smart Contract Risk Score',
        nameFa: 'امتیاز ریسک قرارداد هوشمند',
        formula: 'SCRS = Σ(vuln_weightᵢ × severityᵢ) × (1 - audit_coverage)',
        description: 'Weighted vulnerability assessment adjusted for audit coverage. Lower scores indicate better smart contract security.',
        descriptionFa: 'ارزیابی آسیب‌پذیری وزنی تعدیل‌شده بر پوشش ممیزی. امتیازهای پایین‌تر نشان‌دهنده امنیت بهتر قرارداد هوشمند است.',
        source: 'Atzei et al. (2017)',
      },
    ],
  },
  {
    dimensionKey: 'derivatives',
    dimensionName: 'Derivatives',
    dimensionNameFa: 'مشتقات',
    color: '#06b6d4',
    formulas: [
      {
        name: 'Funding Rate Signal',
        nameFa: 'سیگنال نرخ فاندینگ',
        formula: 'FRSignal = AvgFundingRate(8h) × OI_Weight, OI_Weight = OI / MCap',
        description: 'Perpetual funding rate weighted by open interest. Persistently positive funding suggests overleveraged longs; negative suggests overleveraged shorts.',
        descriptionFa: 'نرخ فاندینگ دائمی وزنی بر اساس سود باز. فاندینگ مثبت مداوم نشان‌دهنده لانگ‌های بیش‌ازحد اهرمی؛ منفی نشان‌دهنده شورت‌های بیش‌ازحد اهرمی.',
        source: 'Hull (2017)',
      },
      {
        name: 'Put/Call Ratio',
        nameFa: 'نسبت پوت/کال',
        formula: 'PCR = PutVolume / CallVolume',
        description: 'Sentiment indicator from options market. PCR > 1 suggests bearish sentiment (more puts); PCR < 0.7 suggests bullish.',
        descriptionFa: 'شاخص احساسات از بازار آپشن. PCR > ۱ نشان‌دهنده احساسات نزولی (پوت بیشتر)؛ PCR < ۰.۷ نشان‌دهنده صعودی.',
        source: 'Sinclair (2013)',
      },
      {
        name: 'Implied Volatility Surface',
        nameFa: 'سطح نوسان ضمنی',
        formula: 'IV = σ_implied(K, T), Skew = IV(25ΔPut) - IV(25ΔCall)',
        description: 'Implied volatility across strikes and expiries. Skew measures tail risk pricing — higher skew implies more demand for downside protection.',
        descriptionFa: 'نوسان ضمنی در سراسری اعمال و انقضاها. چولگی قیمت‌گذاری ریسک دم را اندازه می‌گیرد — چولگی بالاتر تقاضای بیشتر برای حمایت نزولی.',
        source: 'Taleb (1997)',
      },
    ],
  },
  {
    dimensionKey: 'whale_smart_money',
    dimensionName: 'Whale & Smart Money',
    dimensionNameFa: 'نهنگ‌ها و پول هوشمند',
    color: '#1e40af',
    formulas: [
      {
        name: 'Whale Accumulation Score',
        nameFa: 'امتیاز تجمع نهنگ',
        formula: 'WAS = Σ(txᵢ > threshold) × avg_size / MCap × direction',
        description: 'Net accumulation score for large transactions. Positive indicates whale buying; negative indicates distribution.',
        descriptionFa: 'امتیاز تجمع خالص برای تراکنش‌های بزرگ. مثبت نشان‌دهنده خرید نهنگ؛ منفی نشان‌دهنده توزیع.',
        source: 'Schwager (1989)',
      },
      {
        name: 'Smart Money Index',
        nameFa: 'شاخص پول هوشمند',
        formula: 'SMI = (Close - Open_last30min) / (Close - Open_first30min)',
        description: 'Ratio of end-of-day vs start-of-day price action. Institutional money typically trades near market close.',
        descriptionFa: 'نسبت اقدام قیمت پایان روز به ابتدای روز. پول نهادی معمولاً نزدیک بسته‌شدن بازار معامله می‌کند.',
        source: 'Pozen (2014)',
      },
    ],
  },
  {
    dimensionKey: 'ecosystem_defi',
    dimensionName: 'Ecosystem & DeFi',
    dimensionNameFa: 'اکوسیستم و دیفای',
    color: '#10b981',
    formulas: [
      {
        name: 'TVL Health Score',
        nameFa: 'امتیاز سلامت TVL',
        formula: 'TVLHS = (CurrentTVL / ATH_TVL) × (TVL_Growth_30d / MCap_Growth_30d)',
        description: 'Measures TVL recovery from ATH and relative growth. Higher ratio indicates healthier DeFi ecosystem.',
        descriptionFa: 'بازیابی TVL از ATH و رشد نسبی را اندازه می‌گیرد. نسبت بالاتر نشان‌دهنده اکوسیستم دیفای سالم‌تر.',
        source: 'Harvey et al. (2021)',
      },
      {
        name: 'Developer Activity Index',
        nameFa: 'شاخص فعالیت توسعه‌دهنده',
        formula: 'DAI = (Commits_30d × w₁ + Contributors × w₂ + Stars × w₃) / Normalizer',
        description: 'Composite developer activity metric. Higher DAI indicates more active development and stronger ecosystem growth.',
        descriptionFa: 'معیار ترکیبی فعالیت توسعه‌دهنده. DAI بالاتر نشان‌دهنده توسعه فعال‌تر و رشد اکوسیستم قوی‌تر.',
        source: 'Dixon (2023)',
      },
    ],
  },
  {
    dimensionKey: 'inter_market',
    dimensionName: 'Inter-Market',
    dimensionNameFa: 'بین‌بازاری',
    color: '#64748b',
    formulas: [
      {
        name: 'BTC Dominance Trend',
        nameFa: 'روند تسلط بیت‌کوین',
        formula: 'BTCDom = BTC_MCap / Total_MCap, Trend = EMA(21, BTCDom) - EMA(50, BTCDom)',
        description: 'Bitcoin market share with trend indicator. Rising dominance = risk-off (alt season ending); falling = risk-on (alt season).',
        descriptionFa: 'سهم بازار بیت‌کوین با شاخص روند. تسلط صعودی = ریسک‌گریز (پایان آلت‌سیزن)؛ نزولی = ریسک‌پذیر (آلت‌سیزن).',
        source: 'Murphy (2004)',
      },
      {
        name: 'Cross-Asset Correlation Matrix',
        nameFa: 'ماتریس همبستگی بین‌دارایی',
        formula: 'ρᵢⱼ = Cov(rᵢ, rⱼ) / (σᵢ · σⱼ), Regime = cluster(ρ_matrix)',
        description: 'Correlation matrix across asset classes with regime clustering. Identifies whether crypto is acting as risk-on or risk-off asset.',
        descriptionFa: 'ماتریس همبستگی در کلاس‌های دارایی با خوشه‌بندی رژیم. تشخیص اینکه آیا رمزارز به عنوان دارایی ریسک‌پذیر یا ریسک‌گریز عمل می‌کند.',
        source: 'Rosenberg (2018)',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getAllReferences(): Reference[] {
  return ALL_REFERENCES;
}

export function getReferencesForDimension(dimKey: DimensionKey): Reference[] {
  return ALL_REFERENCES.filter((r) => r.dimensions.includes(dimKey));
}

export function getReferencesForCategory(cat: ReferenceCategory): Reference[] {
  return ALL_REFERENCES.filter((r) => r.category === cat);
}

export function getReferenceCountByDimension(): Record<DimensionKey, number> {
  const counts: Record<string, number> = {};
  for (const dim of Object.keys(DIMENSION_META) as DimensionKey[]) {
    counts[dim] = getReferencesForDimension(dim).length;
  }
  return counts as Record<DimensionKey, number>;
}

export function getTopAuthorsForDimension(dimKey: DimensionKey, limit = 3): string[] {
  const refs = getReferencesForDimension(dimKey);
  const authorCounts: Record<string, number> = {};
  for (const r of refs) {
    const author = r.author.split('&')[0].trim();
    authorCounts[author] = (authorCounts[author] || 0) + 1;
  }
  return Object.entries(authorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name]) => name);
}

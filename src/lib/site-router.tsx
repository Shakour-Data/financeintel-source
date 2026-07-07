'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type DashboardMode = 'crypto' | 'stocks';

export type StockCountryCode = 'US' | 'JP' | 'GB' | 'DE' | 'FR' | 'IN';

export type PageKey =
  | 'home'
  | 'dashboard'
  | 'pricing'
  | 'about'
  | 'docs'
  | 'blog'
  | 'contact'
  | 'faq'
  | 'terms'
  | 'privacy';

export type DashboardTab =
  | 'overview'
  | 'watchlist'
  | 'portfolio'
  | 'compare'
  | 'alerts'
  | 'ai-scoring'
  | 'custom-weights'
  | 'predictions'
  | 'news-sentiment'
  | 'behavioral-finance'
  | 'references';

interface SiteRouterContextType {
  currentPage: PageKey;
  navigate: (page: PageKey) => void;
  prevPage: PageKey | null;
  dashboardTab: DashboardTab;
  navigateToTab: (tab: DashboardTab) => void;
  prevTab: DashboardTab | null;
  tabDirection: number; // -1 for left, 1 for right, 0 for initial
  dashboardMode: DashboardMode;
  setDashboardMode: (mode: DashboardMode) => void;
  selectedCountry: StockCountryCode;
  setSelectedCountry: (country: StockCountryCode) => void;
}

const SiteRouterContext = createContext<SiteRouterContextType>({
  currentPage: 'home',
  navigate: () => {},
  prevPage: null,
  dashboardTab: 'overview',
  navigateToTab: () => {},
  prevTab: null,
  tabDirection: 0,
  dashboardMode: 'crypto',
  setDashboardMode: () => {},
  selectedCountry: 'US',
  setSelectedCountry: () => {},
});

export function useSiteRouter() {
  return useContext(SiteRouterContext);
}

const HASH_MAP: Record<string, PageKey> = {
  '': 'home',
  home: 'home',
  dashboard: 'dashboard',
  pricing: 'pricing',
  about: 'about',
  docs: 'docs',
  blog: 'blog',
  contact: 'contact',
  faq: 'faq',
  terms: 'terms',
  privacy: 'privacy',
};

const PAGE_HASH: Record<PageKey, string> = {
  home: '',
  dashboard: 'dashboard',
  pricing: 'pricing',
  about: 'about',
  docs: 'docs',
  blog: 'blog',
  contact: 'contact',
  faq: 'faq',
  terms: 'terms',
  privacy: 'privacy',
};

const TAB_INDEX: Record<DashboardTab, number> = {
  'overview': 0,
  'watchlist': 1,
  'portfolio': 2,
  'compare': 3,
  'alerts': 4,
  'ai-scoring': 5,
  'custom-weights': 6,
  'predictions': 7,
  'news-sentiment': 8,
  'behavioral-finance': 9,
  'references': 10,
};

function getPageFromHash(): PageKey {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace('#', '');
  return HASH_MAP[hash] ?? 'home';
}

export function SiteRouterProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageKey>('home');
  const [prevPage, setPrevPage] = useState<PageKey | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');
  const [prevTab, setPrevTab] = useState<DashboardTab | null>(null);
  const [tabDirection, setTabDirection] = useState<number>(0);
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>('crypto');
  const [selectedCountry, setSelectedCountry] = useState<StockCountryCode>('US');

  // Sync initial page from URL hash on mount
  useEffect(() => {
    const hashPage = getPageFromHash();
    if (hashPage !== 'home') {
      queueMicrotask(() => {
        setPrevPage('home');
        setCurrentPage(hashPage);
      });
    }
  }, []);

  // Listen for hash changes after mount
  useEffect(() => {
    const handleHashChange = () => {
      const newPage = getPageFromHash();
      setCurrentPage(prev => {
        if (prev !== newPage) {
          setPrevPage(prev);
          return newPage;
        }
        return prev;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((page: PageKey) => {
    setCurrentPage(prev => {
      setPrevPage(prev);
      return page;
    });
    const hash = PAGE_HASH[page];
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToTab = useCallback((tab: DashboardTab) => {
    setDashboardTab(prev => {
      const dir = TAB_INDEX[tab] > TAB_INDEX[prev] ? 1 : TAB_INDEX[tab] < TAB_INDEX[prev] ? -1 : 0;
      setTabDirection(dir);
      setPrevTab(prev);
      return tab;
    });
  }, []);

  return (
    <SiteRouterContext.Provider value={{ currentPage, navigate, prevPage, dashboardTab, navigateToTab, prevTab, tabDirection, dashboardMode, setDashboardMode, selectedCountry, setSelectedCountry }}>
      {children}
    </SiteRouterContext.Provider>
  );
}

export const PAGE_META: Record<PageKey, { title: string; description: string }> = {
  home: {
    title: 'FinanceIntel — AI-Powered Crypto & Stock Analytics',
    description: 'Advanced dual 12-dimension ML scoring system for cryptocurrency and stock market analysis across 6 countries with behavioral finance insights.',
  },
  dashboard: {
    title: 'Dashboard — FinanceIntel',
    description: 'Real-time crypto & stock dashboard with AI scores, market indicators, and ML-optimized coefficients across 6 markets.',
  },
  pricing: {
    title: 'Pricing — FinanceIntel',
    description: 'Choose the right plan for your crypto & stock analysis needs — Free, Pro, or Enterprise.',
  },
  about: {
    title: 'About — FinanceIntel',
    description: 'Learn about our mission, team, and the technology behind FinanceIntel.',
  },
  docs: {
    title: 'Documentation — FinanceIntel',
    description: 'Comprehensive documentation for our dual 12-dimension ML scoring system and API.',
  },
  blog: {
    title: 'Blog & Insights — FinanceIntel',
    description: 'Latest insights, market analysis, and research from our team.',
  },
  contact: {
    title: 'Contact — FinanceIntel',
    description: 'Get in touch with our team for support, partnerships, or inquiries.',
  },
  faq: {
    title: 'FAQ — FinanceIntel',
    description: 'Frequently asked questions about FinanceIntel platform.',
  },
  terms: {
    title: 'Terms of Service — FinanceIntel',
    description: 'Terms and conditions for using the FinanceIntel platform.',
  },
  privacy: {
    title: 'Privacy Policy — FinanceIntel',
    description: 'How we handle and protect your data on FinanceIntel.',
  },
};

export const TAB_META: Record<DashboardTab, { title: string; description: string }> = {
  'overview': {
    title: 'Overview',
    description: 'Market snapshot & asset rankings',
  },
  'watchlist': {
    title: 'Watchlist',
    description: 'Your favorited coins',
  },
  'portfolio': {
    title: 'Portfolio',
    description: 'Track holdings & P&L',
  },
  'compare': {
    title: 'Compare',
    description: 'Side-by-side asset comparison',
  },
  'alerts': {
    title: 'Price Alerts',
    description: 'Price & score notifications',
  },
  'ai-scoring': {
    title: 'ML Scoring',
    description: '12-dimension deep analysis',
  },
  'custom-weights': {
    title: 'Custom Weights',
    description: 'Adjust dimension coefficients',
  },
  'predictions': {
    title: 'Predictions',
    description: 'ML prediction engine',
  },
  'news-sentiment': {
    title: 'News & Sentiment',
    description: 'News, sentiment & social signals',
  },
  'behavioral-finance': {
    title: 'Behavioral Finance',
    description: 'Market psychology & bias analysis',
  },
  'references': {
    title: 'References & Methodology',
    description: 'Academic sources & formula documentation',
  },
};

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════
// WATCHLIST STORE — favorited coins (by coin id)
// ═══════════════════════════════════════════════════════════════

interface WatchlistState {
  ids: string[];
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id)
            ? s.ids.filter((x) => x !== id)
            : [...s.ids, id],
        })),
      add: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids : [...s.ids, id],
        })),
      remove: (id) =>
        set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'ci-watchlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO STORE — user holdings
// ═══════════════════════════════════════════════════════════════

export interface Holding {
  id: string; // unique holding id (uuid-like)
  coinId: string; // CoinGecko coin id (e.g. "bitcoin")
  symbol: string;
  name: string;
  image: string;
  amount: number; // quantity held
  buyPrice: number; // average buy price in USD
  buyDate: string; // ISO date string
  notes?: string;
}

interface PortfolioState {
  holdings: Holding[];
  addHolding: (h: Omit<Holding, 'id'>) => void;
  updateHolding: (id: string, patch: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  clearAll: () => void;
}

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set) => ({
      holdings: [],
      addHolding: (h) =>
        set((s) => ({
          holdings: [
            ...s.holdings,
            { ...h, id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` },
          ],
        })),
      updateHolding: (id, patch) =>
        set((s) => ({
          holdings: s.holdings.map((h) =>
            h.id === id ? { ...h, ...patch } : h
          ),
        })),
      removeHolding: (id) =>
        set((s) => ({ holdings: s.holdings.filter((h) => h.id !== id) })),
      clearAll: () => set({ holdings: [] }),
    }),
    {
      name: 'ci-portfolio',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// PRICE ALERTS STORE
// ═══════════════════════════════════════════════════════════════

export type AlertCondition = 'above' | 'below' | 'pct_up_24h' | 'pct_down_24h' | 'score_above' | 'score_below';

export interface PriceAlert {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  condition: AlertCondition;
  target: number; // price or percentage or score threshold
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
  active: boolean;
  note?: string;
}

interface AlertsState {
  alerts: PriceAlert[];
  addAlert: (a: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
  markTriggered: (id: string) => void;
  clearTriggered: () => void;
  clearAll: () => void;
}

export const useAlerts = create<AlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      addAlert: (a) =>
        set((s) => ({
          alerts: [
            ...s.alerts,
            {
              ...a,
              id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
              triggered: false,
            },
          ],
        })),
      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      toggleAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, active: !a.active } : a
          ),
        })),
      markTriggered: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id
              ? { ...a, triggered: true, triggeredAt: new Date().toISOString() }
              : a
          ),
        })),
      clearTriggered: () =>
        set((s) => ({ alerts: s.alerts.filter((a) => !a.triggered) })),
      clearAll: () => set({ alerts: [] }),
    }),
    {
      name: 'ci-alerts',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// CUSTOM COEFFICIENT WEIGHTS STORE
// Lets the user override the 12-dimension coefficients and recompute scores
// ═══════════════════════════════════════════════════════════════

export const DIMENSION_KEYS = [
  'fundamental',
  'technical',
  'onchain',
  'market_psychology',
  'news_sentiment',
  'macroeconomic',
  'regulatory',
  'network_security',
  'derivatives',
  'whale_smart_money',
  'ecosystem_defi',
  'inter_market',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  fundamental: 'Fundamental',
  technical: 'Technical',
  onchain: 'On-Chain',
  market_psychology: 'Market Psychology',
  news_sentiment: 'News & Sentiment',
  macroeconomic: 'Macroeconomic',
  regulatory: 'Regulatory',
  network_security: 'Network Security',
  derivatives: 'Derivatives',
  whale_smart_money: 'Whale & Smart Money',
  ecosystem_defi: 'Ecosystem / DeFi',
  inter_market: 'Inter-Market',
};

interface CustomWeightsState {
  weights: Record<DimensionKey, number>; // 0..1, normalized
  enabled: boolean;
  setWeight: (key: DimensionKey, value: number) => void;
  setWeights: (w: Record<DimensionKey, number>) => void;
  reset: () => void;
  toggle: (on?: boolean) => void;
}

const defaultWeights = (): Record<DimensionKey, number> => {
  const w = {} as Record<DimensionKey, number>;
  for (const k of DIMENSION_KEYS) w[k] = 1 / DIMENSION_KEYS.length;
  return w;
};

export const useCustomWeights = create<CustomWeightsState>()(
  persist(
    (set) => ({
      weights: defaultWeights(),
      enabled: false,
      setWeight: (key, value) =>
        set((s) => {
          const weights = { ...s.weights, [key]: value };
          // Normalize so sum = 1
          const sum = DIMENSION_KEYS.reduce((acc, k) => acc + weights[k], 0);
          if (sum > 0) {
            for (const k of DIMENSION_KEYS) weights[k] = weights[k] / sum;
          }
          return { weights };
        }),
      setWeights: (w) => set({ weights: w }),
      reset: () => set({ weights: defaultWeights(), enabled: false }),
      toggle: (on) =>
        set((s) => ({ enabled: on !== undefined ? on : !s.enabled })),
    }),
    {
      name: 'ci-custom-weights',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// COMPARE LIST STORE — coins selected for comparison (max 4)
// ═══════════════════════════════════════════════════════════════

interface CompareState {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
}

export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) =>
        set((s) => ({
          ids:
            s.ids.length >= 4
              ? s.ids // max 4
              : s.ids.includes(id)
                ? s.ids
                : [...s.ids, id],
        })),
      remove: (id) =>
        set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      toggle: (id) =>
        set((s) => {
          if (s.ids.includes(id)) return { ids: s.ids.filter((x) => x !== id) };
          if (s.ids.length >= 4) return s; // max 4
          return { ids: [...s.ids, id] };
        }),
      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
    }),
    {
      name: 'ci-compare',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS STORE — transient in-app notifications for alerts
// ═══════════════════════════════════════════════════════════════

export interface AppNotification {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsState {
  notifications: AppNotification[];
  push: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      push: (n) =>
        set((s) => ({
          notifications: [
            {
              ...n,
              id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...s.notifications,
          ].slice(0, 50), // keep last 50
        })),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      remove: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
      clearAll: () => set({ notifications: [] }),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'ci-notifications',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

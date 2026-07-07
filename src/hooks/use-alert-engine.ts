'use client';

import { useEffect, useRef } from 'react';
import { useAlerts, useNotifications } from '@/lib/user-data';

interface CoinData {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
  aiScore: number;
}

/**
 * Watches active (non-triggered) alerts against the current coin prices
 * and fires an in-app notification when a condition is met.
 *
 * Each alert can only fire once per browser session — the fired id is
 * tracked in a ref so a re-render of the same alert does not re-trigger.
 */
export function useAlertEngine(coins: CoinData[]) {
  const alerts = useAlerts((s) => s.alerts);
  const markTriggered = useAlerts((s) => s.markTriggered);
  const pushNotification = useNotifications((s) => s.push);

  // Track which alert ids have already been fired in this session so we
  // don't re-fire them on every re-render.
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!coins.length) return;

    const coinMap = new Map(coins.map((c) => [c.id, c]));

    for (const alert of alerts) {
      if (!alert.active || alert.triggered) continue;
      const coin = coinMap.get(alert.coinId);
      if (!coin) continue;

      let fire = false;
      let message = '';

      switch (alert.condition) {
        case 'above':
          if (coin.current_price >= alert.target) {
            fire = true;
            message = `${alert.symbol} is now $${coin.current_price} (above $${alert.target})`;
          }
          break;
        case 'below':
          if (coin.current_price <= alert.target) {
            fire = true;
            message = `${alert.symbol} is now $${coin.current_price} (below $${alert.target})`;
          }
          break;
        case 'pct_up_24h':
          if (coin.price_change_percentage_24h >= alert.target) {
            fire = true;
            message = `${alert.symbol} is up ${coin.price_change_percentage_24h.toFixed(2)}% in 24h (target: +${alert.target}%)`;
          }
          break;
        case 'pct_down_24h':
          if (coin.price_change_percentage_24h <= -alert.target) {
            fire = true;
            message = `${alert.symbol} is down ${coin.price_change_percentage_24h.toFixed(2)}% in 24h (target: -${alert.target}%)`;
          }
          break;
        case 'score_above':
          if (coin.aiScore >= alert.target) {
            fire = true;
            message = `${alert.symbol} AI Score is now ${coin.aiScore.toFixed(2)} (above ${alert.target})`;
          }
          break;
        case 'score_below':
          if (coin.aiScore <= alert.target) {
            fire = true;
            message = `${alert.symbol} AI Score is now ${coin.aiScore.toFixed(2)} (below ${alert.target})`;
          }
          break;
      }

      if (fire && !checkedRef.current.has(alert.id)) {
        checkedRef.current.add(alert.id);
        markTriggered(alert.id);
        pushNotification({
          type: 'alert',
          title: `Alert Triggered: ${alert.symbol}`,
          message,
        });
      }
    }
  }, [coins, alerts, markTriggered, pushNotification]);
}

'use client';

/**
 * usePriceFeed — React hook for subscribing to the real-time price feed
 * WebSocket mini-service (port 3004).
 *
 * Usage:
 *   const { connected, prices, lastTick } = usePriceFeed();
 *
 * - `connected` — true when the WebSocket is connected
 * - `prices` — a Map<coinId, PriceUpdate> with the latest prices
 * - `lastTick` — timestamp of the last received tick
 *
 * The hook automatically:
 * - Connects on mount, disconnects on unmount
 * - Reconnects with exponential backoff on disconnect
 * - Merges ticks into the prices map incrementally
 * - Falls back gracefully (returns empty map if service is down)
 *
 * Connection URL: io("/?XTransformPort=3004") — goes through Caddy gateway
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

export interface PriceUpdate {
  id: string;
  symbol: string;
  price: number;
  change24hPct: number;
  change24hAbs: number;
  marketCap: number;
  volume24h: number;
  ts: number;
}

interface UsePriceFeedReturn {
  connected: boolean;
  prices: Map<string, PriceUpdate>;
  lastTick: number | null;
  lastSnapshot: number | null;
  reconnect: () => void;
}

// Singleton socket — shared across all hook instances
let sharedSocket: Socket | null = null;
let connectionCount = 0;

function getSocket(): Socket {
  if (!sharedSocket) {
    // Connect via the Caddy gateway with XTransformPort=3004
    // Path MUST be "/" so Caddy can forward to the price-feed service
    sharedSocket = io('/', {
      query: { XTransformPort: '3004' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      reconnectionAttempts: Infinity,
      timeout: 10_000,
    });
  }
  return sharedSocket;
}

function closeSocket(): void {
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.close();
    sharedSocket = null;
  }
}

export function usePriceFeed(): UsePriceFeedReturn {
  const [connected, setConnected] = useState(false);
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [lastTick, setLastTick] = useState<number | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    connectionCount++;
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      console.log('[PriceFeed] Connected');
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log('[PriceFeed] Disconnected');
      setConnected(false);
    };

    const onSnapshot = (data: {
      count: number;
      coins: PriceUpdate[];
      lastReadAt: string;
      ts: number;
    }) => {
      console.log(`[PriceFeed] Snapshot: ${data.count} coins`);
      const map = new Map<string, PriceUpdate>();
      for (const coin of data.coins) {
        map.set(coin.id, coin);
      }
      setPrices(map);
      setLastSnapshot(data.ts);
      setLastTick(data.ts);
    };

    const onTick = (data: {
      count: number;
      ticks: PriceUpdate[];
      ts: number;
    }) => {
      setPrices((prev) => {
        const map = new Map(prev);
        for (const tick of data.ticks) {
          map.set(tick.id, tick);
        }
        return map;
      });
      setLastTick(data.ts);
    };

    const onHeartbeat = (data: { coins: number; ts: number }) => {
      // Heartbeat just confirms the connection is alive
      // No state update needed unless we want to track it
    };

    const onConnectError = (err: Error) => {
      console.warn('[PriceFeed] Connection error:', err.message);
      setConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('snapshot', onSnapshot);
    socket.on('tick', onTick);
    socket.on('heartbeat', onHeartbeat);
    socket.on('connect_error', onConnectError);

    // If already connected (singleton reused), fire connect immediately
    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('snapshot', onSnapshot);
      socket.off('tick', onTick);
      socket.off('heartbeat', onHeartbeat);
      socket.off('connect_error', onConnectError);

      connectionCount--;
      // Only close the socket when no more components are using it
      if (connectionCount <= 0) {
        closeSocket();
        connectionCount = 0;
      }
      socketRef.current = null;
    };
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  }, []);

  return { connected, prices, lastTick, lastSnapshot, reconnect };
}

/**
 * Convenience hook: get the real-time price for a single coin by symbol.
 * Returns null if the price feed isn't connected or the coin isn't in the feed.
 *
 * Usage: const btcPrice = useCoinPrice('btc');
 */
export function useCoinPrice(symbol: string): number | null {
  const { prices } = usePriceFeed();
  const lower = symbol.toLowerCase();
  for (const coin of prices.values()) {
    if (coin.symbol.toLowerCase() === lower) {
      return coin.price;
    }
  }
  return null;
}

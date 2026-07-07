'use client';

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Star,
  Wallet,
  GitCompareArrows,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardTab } from '@/lib/site-router';

interface MobileBottomNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const NAV_ITEMS: { key: DashboardTab; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutDashboard },
  { key: 'watchlist', label: 'Watchlist', shortLabel: 'Watch', icon: Star },
  { key: 'portfolio', label: 'Portfolio', shortLabel: 'Wallet', icon: Wallet },
  { key: 'compare', label: 'Compare', shortLabel: 'Compare', icon: GitCompareArrows },
  { key: 'ai-scoring', label: 'ML Scoring', shortLabel: 'Score', icon: Brain },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/90 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-2 relative transition-colors duration-200',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="size-5" />
              <span className="text-[10px] font-medium leading-none">{tab.shortLabel}</span>
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

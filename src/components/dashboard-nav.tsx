'use client';

import { LayoutDashboard, Brain, Sparkles, Newspaper, Heart, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// ─── Types & Constants ──────────────────────────────────────────

export type DashboardTab = 'overview' | 'ai-scoring' | 'predictions' | 'news-sentiment' | 'behavioral-finance';

export interface DashboardTabItem {
  key: DashboardTab;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const DASHBOARD_TABS: DashboardTabItem[] = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Market snapshot & coin rankings',
    icon: LayoutDashboard,
  },
  {
    key: 'ai-scoring',
    label: 'ML Scoring',
    description: '12-dimension deep analysis',
    icon: Brain,
  },
  {
    key: 'predictions',
    label: 'Predictions',
    description: 'ML prediction engine',
    icon: Sparkles,
  },
  {
    key: 'news-sentiment',
    label: 'News & Sentiment',
    description: 'News, sentiment & social signals',
    icon: Newspaper,
  },
  {
    key: 'behavioral-finance',
    label: 'Behavioral Finance',
    description: 'Market psychology & bias analysis',
    icon: Heart,
  },
];

// ─── Component Props ────────────────────────────────────────────

interface DashboardNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

// ─── DashboardNav Component ─────────────────────────────────────

export function DashboardNav({ activeTab, onTabChange }: DashboardNavProps) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border-b sticky top-16 z-20">
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <Tooltip key={tab.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.key)}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200',
                      'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    {/* Description visible on lg+ screens */}
                    <span className="hidden lg:inline text-xs text-muted-foreground font-normal ml-1">
                      {tab.description}
                    </span>

                    {/* Animated active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="dashboard-nav-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600"
                        transition={{
                          type: 'spring',
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-medium">{tab.label}</span>
                    <span className="text-xs text-muted-foreground">{tab.description}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

'use client';

import { Home } from 'lucide-react';
import { useSiteRouter, type DashboardTab, TAB_META } from '@/lib/site-router';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface DashboardTopBarProps {
  activeTab: DashboardTab;
  globalData: {
    active_cryptocurrencies?: number;
    total_market_cap?: Record<string, number>;
    total_volume?: Record<string, number>;
    market_cap_change_percentage_24h_usd?: number;
  } | null;
  meta: {
    fromCache: boolean;
    isStale: boolean;
    totalCoins: number;
    lastUpdated: string;
  };
  onRefresh: () => void;
  isLoading: boolean;
}

export function DashboardTopBar({ activeTab }: DashboardTopBarProps) {
  const { navigate } = useSiteRouter();
  const tabMeta = TAB_META[activeTab];

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
      <div className="flex items-center gap-3 px-4 md:px-6 h-12">
        {/* Sidebar toggle */}
        <SidebarTrigger className="-ml-1 shrink-0" />

        <Separator orientation="vertical" className="h-4" />

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <span
                  className="flex items-center gap-1"
                  onClick={() => navigate('home')}
                >
                  <Home className="size-3.5" />
                  Home
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <span onClick={() => navigate('dashboard')}>
                  Dashboard
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-emerald-600 dark:text-emerald-400 font-medium">
                {tabMeta?.title ?? 'Overview'}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Tab description (desktop only) */}
        <span className="hidden lg:block text-xs text-muted-foreground">
          {tabMeta?.description}
        </span>
      </div>
    </header>
  );
}

'use client';

import {
  Home,
  LayoutDashboard,
  Brain,
  Sparkles,
  Newspaper,
  Heart,
  BookOpen,
  Library,
  DollarSign,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Wallet,
  GitCompareArrows,
  Bell,
  SlidersHorizontal,
} from 'lucide-react';
import { useSiteRouter, type DashboardTab } from '@/lib/site-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const ANALYTICS_ITEMS: { key: DashboardTab; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Market snapshot & asset rankings' },
  { key: 'watchlist', label: 'Watchlist', icon: Star, description: 'Your favorited coins' },
  { key: 'portfolio', label: 'Portfolio', icon: Wallet, description: 'Track holdings & P&L' },
  { key: 'compare', label: 'Compare', icon: GitCompareArrows, description: 'Side-by-side asset comparison' },
  { key: 'alerts', label: 'Alerts', icon: Bell, description: 'Price & score notifications' },
  { key: 'ai-scoring', label: 'ML Scoring', icon: Brain, description: '12-dimension deep analysis' },
  { key: 'custom-weights', label: 'Custom Weights', icon: SlidersHorizontal, description: 'Adjust dimension coefficients' },
  { key: 'predictions', label: 'Predictions', icon: Sparkles, description: 'ML prediction engine' },
  { key: 'news-sentiment', label: 'News & Sentiment', icon: Newspaper, description: 'News, sentiment & social signals' },
  { key: 'behavioral-finance', label: 'Behavioral Finance', icon: Heart, description: 'Market psychology & bias analysis' },
  { key: 'references', label: 'References', icon: Library, description: 'Academic sources & formula docs' },
];

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  const { navigate } = useSiteRouter();
  const { state, toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      {/* ── Header: Logo ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate('home')}
              tooltip="Back to Home"
              className="hover:bg-sidebar-accent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <Sparkles className="size-4 text-white" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">FinanceIntel</span>
                <span className="truncate text-[10px] text-muted-foreground tracking-widest uppercase">
                  CRYPTO & STOCKS • 6 MARKETS
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* ── Navigation Group ── */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Back to Home"
                  onClick={() => navigate('home')}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/60"
                >
                  <Home className="size-4" />
                  <span>Back to Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Analytics Group ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ANALYTICS_ITEMS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <SidebarMenuItem key={tab.key}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onTabChange(tab.key)}
                      tooltip={tab.label}
                      className={isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 font-semibold shadow-[inset_2px_0_0_0_theme(colors.emerald.500)]'
                        : ''
                      }
                    >
                      <tab.icon className="size-4" />
                      <span>{tab.label}</span>
                      {isActive && (
                        <SidebarMenuBadge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-0">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Resources Group ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Documentation" onClick={() => navigate('docs')}>
                  <BookOpen className="size-4" />
                  <span>Documentation</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Pricing" onClick={() => navigate('pricing')}>
                  <DollarSign className="size-4" />
                  <span>Pricing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="FAQ" onClick={() => navigate('faq')}>
                  <HelpCircle className="size-4" />
                  <span>FAQ</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={state === 'expanded' ? 'Collapse Sidebar' : 'Expand Sidebar'}
              onClick={toggleSidebar}
            >
              {state === 'expanded' ? (
                <PanelLeftClose className="size-4" />
              ) : (
                <PanelLeftOpen className="size-4" />
              )}
              <span>{state === 'expanded' ? 'Collapse' : 'Expand'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

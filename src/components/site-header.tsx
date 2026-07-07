'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
  BarChart3,
  DollarSign,
  Users,
  BookOpen,
  Newspaper,
  Mail,
  HelpCircle,
  Rocket,
  Flame,
  Droplets,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSiteRouter, type PageKey } from '@/lib/site-router';
import { cn } from '@/lib/utils';

const NAV_ITEMS: { key: PageKey; label: string; icon: React.ReactNode; group?: string }[] = [
  { key: 'home', label: 'Home', icon: <Rocket className="w-4 h-4" /> },
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'pricing', label: 'Pricing', icon: <DollarSign className="w-4 h-4" /> },
  { key: 'about', label: 'About', icon: <Users className="w-4 h-4" /> },
  { key: 'docs', label: 'Documentation', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'blog', label: 'Blog', icon: <Newspaper className="w-4 h-4" /> },
  { key: 'contact', label: 'Contact', icon: <Mail className="w-4 h-4" /> },
  { key: 'faq', label: 'FAQ', icon: <HelpCircle className="w-4 h-4" /> },
];

const DESKTOP_VISIBLE: PageKey[] = ['home', 'dashboard', 'pricing', 'docs', 'about'];

export function SiteHeader() {
  const { currentPage, navigate } = useSiteRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on page change
  const prevPageRef = useState(currentPage);
  if (prevPageRef[0] !== currentPage) {
    prevPageRef[1](currentPage);
    if (mobileMenuOpen) {
      queueMicrotask(() => setMobileMenuOpen(false));
    }
  }

  const moreItems = NAV_ITEMS.filter(item => !DESKTOP_VISIBLE.includes(item.key));

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-micro ease-sacred border-b',
        scrolled
          ? 'bg-background/90 backdrop-blur-lg shadow-sm border-[#FFD54F]/10'
          : 'bg-background/60 backdrop-blur-sm border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo — The Seal */}
          <button
            onClick={() => navigate('home')}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#C62828] via-[#FFD54F] to-[#1565C0] shadow-lg shadow-[#FFD54F]/20 group-hover:shadow-[#FFD54F]/40 transition-shadow duration-micro ease-sacred">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight leading-none bg-gradient-to-r from-[#C62828] via-[#FFD54F] to-[#1565C0] bg-clip-text text-transparent">
                FinanceIntel
              </span>
              <span className="text-[9px] text-muted-foreground tracking-widest uppercase leading-none mt-0.5">
                CRYPTO & STOCKS • 6 MARKETS
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.filter(item => DESKTOP_VISIBLE.includes(item.key)).map(item => (
              <button
                key={item.key}
                onClick={() => navigate(item.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-micro ease-sacred',
                  currentPage === item.key
                    ? 'bg-[#FFD54F]/10 text-[#FFD54F]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            {/* More dropdown */}
            {moreItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-micro ease-sacred">
                    More
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {moreItems.map(item => (
                    <DropdownMenuItem
                      key={item.key}
                      onClick={() => navigate(item.key)}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        currentPage === item.key && 'bg-[#FFD54F]/10 text-[#FFD54F]'
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* CTA + Mobile Menu */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('dashboard')}
              size="sm"
              className="hidden sm:flex bg-gradient-to-r from-[#C62828] to-[#D84315] hover:from-[#EF5350] hover:to-[#C62828] text-white shadow-lg shadow-[#C62828]/20 glow-fire transition-all duration-micro ease-sacred"
            >
              <Flame className="w-4 h-4 mr-1.5" />
              Open Dashboard
            </Button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-all duration-micro ease-sacred"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="lg:hidden border-t border-[#FFD54F]/10 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1 bg-background/95 backdrop-blur-lg">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    navigate(item.key);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-micro ease-sacred',
                    currentPage === item.key
                      ? 'bg-[#FFD54F]/10 text-[#FFD54F]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <div className="pt-2">
                <Button
                  onClick={() => {
                    navigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-[#C62828] to-[#D84315] text-white glow-fire"
                >
                  <Flame className="w-4 h-4 mr-1.5" />
                  Open Dashboard
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

'use client';

import { Sparkles, Github, Twitter, Linkedin, Youtube, Mail, Droplets, Flame, Mountain } from 'lucide-react';
import { useSiteRouter, type PageKey } from '@/lib/site-router';
import { Separator } from '@/components/ui/separator';

const FOOTER_LINKS: { title: string; links: { key: PageKey; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'pricing', label: 'Pricing' },
      { key: 'docs', label: 'Documentation' },
      { key: 'faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Company',
    links: [
      { key: 'about', label: 'About Us' },
      { key: 'blog', label: 'Blog' },
      { key: 'contact', label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { key: 'terms', label: 'Terms of Service' },
      { key: 'privacy', label: 'Privacy Policy' },
    ],
  },
];

const SOCIAL_LINKS = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
];

export function SiteFooter() {
  const { navigate } = useSiteRouter();

  return (
    <footer className="border-t bg-muted/20 border-[#FFD54F]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column — The Seal */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#C62828] via-[#FFD54F] to-[#1565C0] shadow-lg shadow-[#FFD54F]/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight bg-gradient-to-r from-[#C62828] via-[#FFD54F] to-[#1565C0] bg-clip-text text-transparent">
                  FinanceIntel
                </div>
                <div className="text-[9px] text-muted-foreground tracking-widest uppercase">
                  Crypto & Stocks • 6 Markets
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Advanced dual 12-dimension ML scoring system for cryptocurrency and stock market analysis across 6 countries with behavioral finance insights.
            </p>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map(social => (
                <a
                  key={social.label}
                  href={social.href}
                  className="p-2 rounded-lg hover:bg-[#FFD54F]/10 transition-all duration-micro ease-sacred text-muted-foreground hover:text-[#FFD54F]"
                  title={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {FOOTER_LINKS.map(section => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold mb-3 text-foreground">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map(link => (
                  <li key={link.key}>
                    <button
                      onClick={() => navigate(link.key)}
                      className="text-sm text-muted-foreground hover:text-[#FFD54F] transition-colors duration-micro ease-sacred"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-[#FFD54F]/10" />

        {/* Newsletter — The Water (trust) element */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#1565C0]" />
              Stay Updated
            </h4>
            <p className="text-xs text-muted-foreground">Get the latest financial intelligence insights delivered to your inbox.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 sm:w-64 px-3 py-2 text-sm rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/5 focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30 focus:border-[#1565C0]/40 placeholder:text-[#1565C0]/30 transition-all duration-micro ease-sacred"
            />
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-[#C62828] to-[#D84315] text-white hover:from-[#EF5350] hover:to-[#C62828] transition-all duration-micro ease-sacred shrink-0 glow-fire">
              <Mail className="w-4 h-4" />
            </button>
          </div>
        </div>

        <Separator className="my-8 bg-[#FFD54F]/10" />

        {/* Bottom Bar — The Earth (foundation) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} FinanceIntel. All rights reserved.</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-[#C62828]" /> 12D ML Scoring</span>
            <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-[#1565C0]" /> Crypto & Stocks</span>
            <span className="flex items-center gap-1"><Mountain className="w-3 h-3 text-[#78909C]" /> 6 Markets</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

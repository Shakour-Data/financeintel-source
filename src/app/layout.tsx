import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinanceIntel — AI-Powered Crypto & Stock Analytics",
  description: "Advanced dual 12-dimension ML scoring system for cryptocurrency and stock market analysis across 6 countries with behavioral finance insights.",
  keywords: ["FinanceIntel", "crypto", "stocks", "cryptocurrency", "stock market", "ML scoring", "12-dimension", "AI analytics", "6 markets", "behavioral finance"],
  authors: [{ name: "FinanceIntel Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "FinanceIntel — Crypto & Stock Intelligence",
    description: "AI-powered 12-dimension scoring for 200+ cryptocurrencies and 300 stocks across 6 countries",
    url: "https://financeintel.ai",
    siteName: "FinanceIntel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinanceIntel — Crypto & Stock Intelligence",
    description: "AI-powered 12-dimension scoring for 200+ cryptocurrencies and 300 stocks across 6 countries",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

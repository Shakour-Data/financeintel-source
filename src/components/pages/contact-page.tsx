'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  ArrowRight,
  ChevronRight,
  Mail,
  MapPin,
  Clock,
  Send,
  Twitter,
  Github,
  Linkedin,
  MessageSquare,
  HelpCircle,
  CheckCircle2,
  User,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ContactPageProps {
  onNavigate: (page: string) => void;
}

/* ──────────── Animation variants ──────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

/* ──────────── Data ──────────── */
const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'support@cryptointel.ai',
    description: 'We typically respond within 24 hours',
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'San Francisco, CA',
    description: 'Our headquarters in the heart of Silicon Valley',
    color: 'from-cyan-500/20 to-teal-500/20',
    iconColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: Clock,
    label: 'Business Hours',
    value: 'Mon–Fri, 9am–6pm PST',
    description: 'Support available during business hours',
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
];

const socialLinks = [
  {
    name: 'Twitter',
    icon: Twitter,
    href: '#',
    color: 'from-sky-500/20 to-blue-500/20',
    iconColor: 'text-sky-400',
    hoverBorder: 'hover:border-sky-500/30',
  },
  {
    name: 'GitHub',
    icon: Github,
    href: '#',
    color: 'from-slate-500/20 to-gray-500/20',
    iconColor: 'text-slate-400',
    hoverBorder: 'hover:border-slate-500/30',
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    href: '#',
    color: 'from-blue-500/20 to-indigo-500/20',
    iconColor: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/30',
  },
  {
    name: 'Discord',
    icon: MessageSquare,
    href: '#',
    color: 'from-violet-500/20 to-indigo-500/20',
    iconColor: 'text-violet-400',
    hoverBorder: 'hover:border-violet-500/30',
  },
];

/* ──────────── Component ──────────── */
export function ContactPage({ onNavigate }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.14)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.08)_0%,transparent_50%)]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              <Badge
                variant="outline"
                className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300 px-4 py-1.5 text-sm"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Contact Us
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Get in Touch
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Have a question, suggestion, or partnership opportunity? We&apos;d love to hear
              from you. Our team typically responds within 24 hours.
            </motion.p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ CONTACT FORM + INFO ═══════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Contact Form */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              custom={0}
              className="lg:col-span-3"
            >
              <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8">
                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">Message Sent!</h3>
                      <p className="text-slate-400 max-w-md mx-auto mb-6">
                        Thank you for reaching out. Our team will get back to you within 24 hours.
                      </p>
                      <Button
                        onClick={() => setSubmitted(false)}
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                          <Send className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Send Us a Message</h3>
                          <p className="text-sm text-slate-500">Fill out the form below and we&apos;ll get back to you</p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm text-slate-300">
                            Full Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                              id="name"
                              type="text"
                              placeholder="John Doe"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              required
                              className="h-11 pl-10 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-500 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm text-slate-300">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="john@example.com"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              required
                              className="h-11 pl-10 bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-500 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
                            />
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-sm text-slate-300">
                            Subject
                          </Label>
                          <Select
                            value={formData.subject}
                            onValueChange={(value) => setFormData({ ...formData, subject: value })}
                          >
                            <SelectTrigger className="h-11 bg-white/[0.05] border-white/[0.08] text-white w-full focus:ring-violet-500/20">
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a2e] border-white/[0.08]">
                              <SelectItem value="general" className="text-slate-300 focus:text-white focus:bg-white/[0.05]">General Inquiry</SelectItem>
                              <SelectItem value="technical" className="text-slate-300 focus:text-white focus:bg-white/[0.05]">Technical Support</SelectItem>
                              <SelectItem value="partnership" className="text-slate-300 focus:text-white focus:bg-white/[0.05]">Partnership</SelectItem>
                              <SelectItem value="enterprise" className="text-slate-300 focus:text-white focus:bg-white/[0.05]">Enterprise</SelectItem>
                              <SelectItem value="press" className="text-slate-300 focus:text-white focus:bg-white/[0.05]">Press</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-sm text-slate-300">
                            Message
                          </Label>
                          <Textarea
                            id="message"
                            placeholder="Tell us how we can help..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            required
                            className="min-h-[140px] bg-white/[0.05] border-white/[0.08] text-white placeholder:text-slate-500 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 resize-none"
                          />
                        </div>

                        {/* Submit */}
                        <Button
                          type="submit"
                          className="w-full h-12 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-base font-semibold shadow-lg shadow-violet-500/25 cursor-pointer"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Info + Social */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="lg:col-span-2 space-y-5"
            >
              {/* Contact info cards */}
              {contactInfo.map((info, i) => (
                <motion.div key={info.label} variants={fadeUp} custom={i}>
                  <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 group">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110',
                          info.color
                        )}>
                          <info.icon className={cn('w-5 h-5', info.iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 mb-0.5">{info.label}</p>
                          <p className="text-base font-medium text-white">{info.value}</p>
                          <p className="text-xs text-slate-500 mt-1">{info.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Social Links */}
              <motion.div variants={fadeUp} custom={3}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Connect With Us</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {socialLinks.map((social) => (
                        <button
                          key={social.name}
                          className={cn(
                            'flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all duration-300 cursor-pointer group/social',
                            social.hoverBorder
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center transition-transform duration-300 group-hover/social:scale-110',
                            social.color
                          )}>
                            <social.icon className={cn('w-4 h-4', social.iconColor)} />
                          </div>
                          <span className="text-sm text-slate-300 group-hover/social:text-white transition-colors">
                            {social.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* FAQ Link */}
              <motion.div variants={fadeUp} custom={4}>
                <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 cursor-pointer group"
                  onClick={() => onNavigate('faq')}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">Have questions?</p>
                        <p className="text-xs text-slate-500">Check our FAQ for quick answers</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">FinanceIntelligence</span>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Crypto Intelligence Platform — 12D ML Scoring + 16 Behavioral Biases — &copy; {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('docs')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Docs
              </button>
              <button
                onClick={() => onNavigate('faq')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                FAQ
              </button>
              <button
                onClick={() => onNavigate('blog')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Blog
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

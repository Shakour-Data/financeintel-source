'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  ArrowLeft,
  Shield,
  Eye,
  Database,
  Lock,
  Globe,
  Cookie,
  UserCheck,
  Clock,
  Baby,
  ArrowRightLeft,
  RefreshCw,
  Mail,
  ChevronRight,
  Sparkles,
  BookOpen,
  Server,
  MapPin,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface PrivacyPageProps {
  onNavigate: (page: string) => void;
}

/* ──────────── Animation variants ──────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.08 },
  }),
};

/* ──────────── Section Data ──────────── */
interface PrivacySection {
  id: string;
  number: number;
  title: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  content: React.ReactNode;
}

const sections: PrivacySection[] = [
  {
    id: 'introduction',
    number: 1,
    title: 'Introduction',
    icon: Info,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    content: (
      <div className="space-y-4">
        <p>
          FinanceIntelligence Inc. (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered crypto & stock analysis platform (the &ldquo;Service&rdquo;).
        </p>
        <p>
          Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to the practices described in this policy. If you do not agree with the terms of this Privacy Policy, you should not access or use the Service.
        </p>
        <p>
          This Privacy Policy applies to information collected through our website, dashboard, API, and any related services, sales, marketing, or events. It does not apply to information collected by third parties that we do not own or control.
        </p>
      </div>
    ),
  },
  {
    id: 'information-collected',
    number: 2,
    title: 'Information We Collect',
    icon: Database,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    content: (
      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            Personal Information
          </h4>
          <p className="mb-3">
            When you create an account or interact with our Service, we may collect personally identifiable information, including:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Account Information:</strong> Email address, username, and password (stored in hashed form)</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Profile Information:</strong> Display name, profile picture, and preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Payment Information:</strong> Billing name, address, and payment method details (processed securely through our payment provider; we do not store full credit card numbers)</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Communication Data:</strong> Information you provide when contacting our support team</span>
            </li>
          </ul>
        </div>

        {/* Usage Data */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            Usage Data
          </h4>
          <p className="mb-3">
            When you access and use the Service, we automatically collect certain information about your device and usage patterns:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Device Information:</strong> Browser type, operating system, device type, and screen resolution</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Log Data:</strong> IP address, access timestamps, pages viewed, and referring URLs</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Feature Usage:</strong> Which scoring dimensions you access, dashboards you view, and API endpoints you call</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Performance Data:</strong> Load times, error reports, and system performance metrics</span>
            </li>
          </ul>
        </div>

        {/* Cookies */}
        <div>
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Cookies & Tracking Technologies
          </h4>
          <p className="mb-3">
            We use cookies and similar tracking technologies to collect the information described above. The types of cookies we use include:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Essential Cookies:</strong> Required for the Service to function properly (session management, authentication)</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Analytics Cookies:</strong> Help us understand how users interact with the Service (page views, feature usage)</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
              <span><strong className="text-slate-300">Preference Cookies:</strong> Remember your settings and customization choices</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'how-we-use',
    number: 3,
    title: 'How We Use Your Information',
    icon: Eye,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We use the information we collect for the following purposes:
        </p>
        <ul className="space-y-3 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Service Delivery:</strong> To provide, maintain, and improve the crypto intelligence platform, including computing scores, generating reports, and delivering API responses</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Account Management:</strong> To create and manage your account, authenticate your identity, and process subscription payments</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Personalization:</strong> To customize your dashboard experience, save your watchlists and preferences, and deliver relevant alerts</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Communication:</strong> To send you service-related notifications, security alerts, and (with your consent) marketing communications</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Analytics & Improvement:</strong> To analyze usage patterns, improve our scoring algorithms, optimize platform performance, and develop new features</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Security:</strong> To detect, prevent, and address fraud, unauthorized access, and other illegal activities</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, or governmental requests</span>
          </li>
        </ul>
        <p>
          We will only use your personal information for the purposes for which we collected it, unless we reasonably consider that we need to use it for another reason that is compatible with the original purpose.
        </p>
      </div>
    ),
  },
  {
    id: 'data-security',
    number: 4,
    title: 'Data Storage & Security',
    icon: Lock,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. Our security practices include:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Encryption:</strong> All data transmitted between your browser and our servers is encrypted using TLS 1.3 with 256-bit encryption</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Secure Storage:</strong> Passwords are hashed using bcrypt with salt. Sensitive data is encrypted at rest using AES-256</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Access Controls:</strong> Role-based access controls (RBAC) limit employee access to personal data on a need-to-know basis</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Infrastructure:</strong> Our services are hosted on SOC 2 Type II-certified cloud infrastructure with regular security audits</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Monitoring:</strong> Continuous monitoring for unauthorized access attempts and suspicious activity patterns</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-rose-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Incident Response:</strong> Documented incident response procedures for security breaches, including notification protocols</span>
          </li>
        </ul>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-sm text-slate-400">
            While we strive to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to maintaining the highest commercially reasonable standards of data protection.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'third-party',
    number: 5,
    title: 'Third-Party Services',
    icon: Globe,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We integrate with and share certain data with third-party service providers to deliver and improve our Service. These third parties include:
        </p>
        <ul className="space-y-4 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">CoinGecko API:</strong> We use CoinGecko&apos;s market data API to retrieve cryptocurrency pricing, volume, and market capitalization data. CoinGecko may collect anonymous usage metrics through their API. Their privacy policy is available at coingecko.com/en/privacy.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Analytics Providers:</strong> We use privacy-respecting analytics tools to understand how users interact with our platform. These tools collect anonymized usage data and do not track you across other websites.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Payment Processor:</strong> Subscription payments are processed through Stripe, Inc., which handles your payment card information in compliance with PCI DSS Level 1 standards. We do not store your full credit card number on our servers.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Cloud Infrastructure:</strong> Our platform is hosted on cloud infrastructure providers that maintain SOC 2 Type II compliance and robust data protection practices.
            </div>
          </li>
        </ul>
        <p>
          We do not sell, rent, or trade your personal information to any third party for their promotional purposes. We only share personal information with third parties as described in this policy, or when we have your explicit consent.
        </p>
      </div>
    ),
  },
  {
    id: 'cookies-tracking',
    number: 6,
    title: 'Cookies & Tracking',
    icon: Cookie,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    content: (
      <div className="space-y-4">
        <p>
          Cookies are small text files stored on your device when you visit our website. We use cookies and similar technologies for the following purposes:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 pr-4 text-slate-300 font-medium">Type</th>
                <th className="text-left py-3 pr-4 text-slate-300 font-medium">Purpose</th>
                <th className="text-left py-3 text-slate-300 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-white/[0.03]">
                <td className="py-3 pr-4 font-medium text-slate-300">Essential</td>
                <td className="py-3 pr-4">Session management, authentication, security</td>
                <td className="py-3">Session / 1 year</td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-3 pr-4 font-medium text-slate-300">Analytics</td>
                <td className="py-3 pr-4">Understanding platform usage and improving features</td>
                <td className="py-3">1–2 years</td>
              </tr>
              <tr className="border-b border-white/[0.03]">
                <td className="py-3 pr-4 font-medium text-slate-300">Preferences</td>
                <td className="py-3 pr-4">Remembering your settings, theme, and dashboard layout</td>
                <td className="py-3">1 year</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium text-slate-300">Marketing</td>
                <td className="py-3 pr-4">Delivering relevant communications (opt-in only)</td>
                <td className="py-3">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          You can manage your cookie preferences through your browser settings. Most browsers allow you to refuse cookies, delete existing cookies, or alert you when a cookie is being set. Please note that disabling essential cookies may affect the functionality of the Service.
        </p>
        <p>
          We do not use cookies for cross-site tracking or retargeting. Our analytics cookies are configured to anonymize IP addresses before processing.
        </p>
      </div>
    ),
  },
  {
    id: 'your-rights',
    number: 7,
    title: 'Your Rights',
    icon: UserCheck,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    content: (
      <div className="space-y-4">
        <p>
          Depending on your jurisdiction, you may have the following rights regarding your personal information:
        </p>
        <ul className="space-y-4 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Right of Access:</strong> You have the right to request a copy of the personal information we hold about you. You can access much of this data directly through your account settings.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Right to Deletion:</strong> You may request that we delete your personal information, subject to certain exceptions (such as legal obligations or ongoing contract performance). Account deletion can be initiated from your account settings or by contacting us.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Right to Data Portability:</strong> You may request a machine-readable copy of your personal data in a structured, commonly used format (such as JSON or CSV), enabling you to transfer your data to another service provider.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Right to Object:</strong> You have the right to object to our processing of your personal information for direct marketing purposes, or when processing is based on legitimate interests. We will honor such requests unless we have compelling legitimate grounds for continued processing.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Right to Rectification:</strong> You may request corrections to any inaccurate or incomplete personal information we hold about you.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-300">Right to Restrict Processing:</strong> In certain circumstances, you may request that we restrict the processing of your personal information while we resolve a dispute or verify accuracy.
            </div>
          </li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at{' '}
          <a href="mailto:privacy@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            privacy@cryptointelligence.io
          </a>. We will respond to your request within 30 days, or as required by applicable law. We may ask for verification of your identity before processing your request.
        </p>
      </div>
    ),
  },
  {
    id: 'data-retention',
    number: 8,
    title: 'Data Retention',
    icon: Clock,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Our retention guidelines include:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Account Data:</strong> Retained for the duration of your account and for up to 90 days after account deletion, unless a longer period is required by law</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Usage Logs:</strong> Retained for up to 12 months for analytics and security purposes, then anonymized or deleted</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Market Data:</strong> Cryptocurrency market data and scoring data are retained indefinitely as part of our historical analysis database; this data is not personally identifiable</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Communication Records:</strong> Support tickets and communications are retained for up to 3 years for quality assurance and dispute resolution</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-cyan-400 mt-1 shrink-0" />
            <span><strong className="text-slate-300">Payment Records:</strong> Retained for 7 years as required by tax and financial regulations</span>
          </li>
        </ul>
        <p>
          When personal information is no longer needed, we will securely delete or anonymize it in accordance with our data retention policy.
        </p>
      </div>
    ),
  },
  {
    id: 'childrens-privacy',
    number: 9,
    title: 'Children&apos;s Privacy',
    icon: Baby,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    content: (
      <div className="space-y-4">
        <p>
          The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18 years of age.
        </p>
        <p>
          If we become aware that we have inadvertently collected personal information from a child under 18, we will take steps to delete such information as quickly as possible. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us at{' '}
          <a href="mailto:privacy@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            privacy@cryptointelligence.io
          </a>.
        </p>
        <p>
          We encourage parents and guardians to monitor their children&apos;s online activity and to instruct them never to provide personal information without permission.
        </p>
      </div>
    ),
  },
  {
    id: 'international-transfers',
    number: 10,
    title: 'International Data Transfers',
    icon: ArrowRightLeft,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10',
    content: (
      <div className="space-y-4">
        <p>
          FinanceIntelligence Inc. is headquartered in the United States, and our primary data processing operations occur within the United States. If you access the Service from outside the United States, your information may be transferred to, stored, and processed in the United States.
        </p>
        <p>
          By using our Service, you acknowledge and consent to the transfer of your information to the United States and other countries where we or our third-party service providers operate. We take appropriate safeguards to ensure your data is protected in accordance with this Privacy Policy and applicable data protection laws, including:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <span>Standard Contractual Clauses (SCCs) approved by the European Commission for transfers from the EEA</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <span>Compliance with the EU-U.S. Data Privacy Framework where applicable</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-teal-400 mt-1 shrink-0" />
            <span>Ensuring that our third-party service providers maintain equivalent data protection standards</span>
          </li>
        </ul>
        <p>
          If you have questions about international data transfers, please contact us at{' '}
          <a href="mailto:privacy@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            privacy@cryptointelligence.io
          </a>.
        </p>
      </div>
    ),
  },
  {
    id: 'changes',
    number: 11,
    title: 'Changes to This Policy',
    icon: RefreshCw,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    content: (
      <div className="space-y-4">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. When we make material changes, we will:
        </p>
        <ul className="space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>Update the &ldquo;Last updated&rdquo; date at the top of this policy</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>Post the revised Privacy Policy on our website</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>Send a notification to the email address associated with your account for significant changes</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
            <span>Obtain your consent where required by applicable law before processing your data under a new policy</span>
          </li>
        </ul>
        <p>
          We encourage you to review this Privacy Policy periodically. Your continued use of the Service after any changes constitutes your acceptance of the updated policy.
        </p>
      </div>
    ),
  },
  {
    id: 'contact-us',
    number: 12,
    title: 'Contact Us',
    icon: Mail,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    content: (
      <div className="space-y-4">
        <p>
          If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
        </p>
        <div className="space-y-3 ml-4">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <p className="text-slate-300 font-medium">Data Protection Officer</p>
              <a href="mailto:privacy@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 text-sm">
                privacy@cryptointelligence.io
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <p className="text-slate-300 font-medium">General Inquiries</p>
              <a href="mailto:support@cryptointelligence.io" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 text-sm">
                support@cryptointelligence.io
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-violet-400 mt-1 shrink-0" />
            <div>
              <p className="text-slate-300 font-medium">Mailing Address</p>
              <p className="text-sm text-slate-400">
                FinanceIntelligence Inc.<br />
                1200 Market Street, Suite 400<br />
                Wilmington, DE 19801<br />
                United States
              </p>
            </div>
          </div>
        </div>
        <p>
          For EU residents: If you are not satisfied with our response to a privacy concern, you have the right to lodge a complaint with your local supervisory authority.
        </p>
      </div>
    ),
  },
];

/* ──────────── Component ──────────── */
export function PrivacyPage({ onNavigate }: PrivacyPageProps) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.14)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.08)_0%,transparent_50%)]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <button
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </button>
          </motion.div>

          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              <Badge
                variant="outline"
                className="mb-6 border-cyan-500/30 bg-cyan-500/10 text-cyan-300 px-4 py-1.5 text-sm"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Privacy & Data Protection
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]"
            >
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Privacy
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                Policy
              </span>
            </motion.h1>

            {/* Last updated */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-6 text-base text-slate-400 max-w-xl mx-auto leading-relaxed"
            >
              Last updated: March 2025
            </motion.p>

            {/* Template notice */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This is a template document provided for informational purposes only.</span>
            </motion.div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0a0f] to-transparent z-20" />
      </section>

      {/* ═══════════ TABLE OF CONTENTS ═══════════ */}
      <section className="relative py-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.06)_0%,transparent_70%)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <Card className="bg-white/[0.03] border-white/[0.06] backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Table of Contents</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sections.map((section, i) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-white/[0.05] transition-colors group cursor-pointer"
                    >
                      <span className="text-xs font-mono text-slate-500 group-hover:text-cyan-400 transition-colors w-6 shrink-0">
                        {String(section.number).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                        {section.title}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ PRIVACY SECTIONS ═══════════ */}
      <section className="relative py-12 sm:py-16">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 sm:space-y-12">
            {sections.map((section, i) => (
              <motion.div
                key={section.id}
                id={section.id}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                custom={i}
              >
                <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.04] transition-colors duration-300 scroll-mt-24">
                  <CardContent className="p-6 sm:p-8">
                    {/* Section header */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-10 h-10 rounded-xl ${section.iconBg} flex items-center justify-center shrink-0`}>
                        <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                      </div>
                      <div>
                        <span className="text-xs font-mono text-slate-500 block mb-1">
                          Section {String(section.number).padStart(2, '0')}
                        </span>
                        <h3 className="text-lg sm:text-xl font-semibold text-white leading-tight">
                          {section.title}
                        </h3>
                      </div>
                    </div>

                    {/* Section content */}
                    <div className="text-sm sm:text-base text-slate-400 leading-relaxed ml-0 sm:ml-14">
                      {section.content}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ YOUR RIGHTS HIGHLIGHT ═══════════ */}
      <section className="relative py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.10)_0%,transparent_60%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            custom={0}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Your Privacy Matters
              </span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
              We are committed to protecting your personal information and respecting your rights.
              If you have any questions about this Privacy Policy or want to exercise your data rights, our team is here to help.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('contact')}
                className="bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white px-8 h-12 text-base font-semibold shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact DPO
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('terms')}
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white h-12 px-8 text-base cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Terms of Service
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">FinanceIntelligence</span>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Crypto Intelligence Platform — 12D ML Scoring + 16 Behavioral Biases — &copy; {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('terms')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Terms
              </button>
              <button
                onClick={() => onNavigate('contact')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Contact
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

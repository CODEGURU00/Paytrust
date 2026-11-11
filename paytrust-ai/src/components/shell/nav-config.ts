import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  BarChart3,
  BrainCircuit,
  Dna,
  FileText,
  Flag,
  FolderLock,
  History,
  LayoutDashboard,
  Link2,
  MessageCircle,
  Radar,
  Repeat,
  Scale,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Split,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'messages';
  match?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/ai', label: 'AI Assistant', icon: Sparkles },
      { href: '/memory', label: 'Financial Memory', icon: BrainCircuit },
    ],
  },
  {
    label: 'Payments',
    items: [
      { href: '/payments', label: 'Payments', icon: Wallet },
      { href: '/payments/send', label: 'Send & Request', icon: Send },
      { href: '/payments/links', label: 'Payment Links', icon: Link2 },
      { href: '/payments/split', label: 'Split Payments', icon: Split },
      { href: '/payments/subscriptions', label: 'Subscriptions', icon: Repeat },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { href: '/transactions', label: 'All Transactions', icon: ArrowLeftRight },
      {
        href: '/messages',
        label: 'Messages',
        icon: MessageCircle,
        badge: 'messages',
        match: '/messages',
      },
      { href: '/milestones', label: 'Milestones', icon: Flag },
      { href: '/evidence', label: 'Evidence Vault', icon: FolderLock },
    ],
  },
  {
    label: 'AI intelligence',
    items: [
      { href: '/risk', label: 'Risk Radar', icon: Radar },
      { href: '/deals/TX-48213', label: 'Deal DNA', icon: Dna, match: '/deals' },
      { href: '/guardian', label: 'Payment Guardian', icon: ShieldAlert },
      { href: '/mediator', label: 'AI Mediator', icon: Scale },
    ],
  },
  {
    label: 'Trust',
    items: [
      { href: '/trust', label: 'Trust Passport', icon: ShieldCheck },
      { href: '/audit', label: 'Audit Timeline', icon: History },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/invoices', label: 'Invoices', icon: FileText },
      { href: '/clients', label: 'Client CRM', icon: Users },
      { href: '/analytics', label: 'Business Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Settings',
    items: [{ href: '/settings', label: 'Security & Privacy', icon: Settings }],
  },
];

export const allNavItems = navGroups.flatMap((group) => group.items);

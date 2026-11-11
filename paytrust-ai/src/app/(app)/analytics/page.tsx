'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { DonutChart, RevenueChart } from '@/components/ui/charts';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

type Period = '3M' | '6M' | '12M';

const series: Record<
  Period,
  { labels: string[]; revenue: number[]; expenses: number[]; estimateFrom: number }
> = {
  '3M': {
    labels: ['Sep', 'Oct', 'Nov'],
    revenue: [62000, 74000, 86800],
    expenses: [22000, 18500, 21400],
    estimateFrom: 2,
  },
  '6M': {
    labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    revenue: [48000, 52000, 61000, 62000, 74000, 86800],
    expenses: [21000, 19500, 24800, 22000, 18500, 21400],
    estimateFrom: 5,
  },
  '12M': {
    labels: [
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
    ],
    revenue: [
      52000, 58000, 61000, 67000, 59000, 72000, 48000, 52000, 61000, 62000,
      74000, 86800,
    ],
    expenses: [
      20500, 22800, 21400, 26000, 19800, 24200, 21000, 19500, 24800, 22000,
      18500, 21400,
    ],
    estimateFrom: 10,
  },
};

const expenseSegments = [
  { label: 'Contractors', value: 46, color: '#22d3ee', amount: 41600 },
  { label: 'Software', value: 22, color: '#4c7dff', amount: 19900 },
  { label: 'Equipment', value: 18, color: '#a78bfa', amount: 16300 },
  { label: 'Other', value: 14, color: '#667691', amount: 12700 },
];

export default function AnalyticsPage() {
  const { demoPeople, pushToast } = useDemo();
  const [period, setPeriod] = useState<Period>('6M');

  const data = series[period];
  const totalRevenue = data.revenue.reduce((a, b) => a + b, 0);
  const totalExpenses = data.expenses.reduce((a, b) => a + b, 0);
  const net = totalRevenue - totalExpenses;

  const customers = useMemo(
    () => [
      { id: 'priya', value: 45000, deals: 2, share: 100 },
      { id: 'sunrise', value: 42000, deals: 1, share: 82 },
      { id: 'rahul', value: 18000, deals: 1, share: 46 },
      { id: 'vikram', value: 12000, deals: 1, share: 32 },
    ],
    []
  );

  const download = () => {
    const rows = [
      ['Month', 'Revenue (INR)', 'Expenses (INR)'],
      ...data.labels.map((label, index) => [
        label,
        String(data.revenue[index]),
        String(data.expenses[index]),
      ]),
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `paytrust-analytics-${period.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast('Report downloaded', {
      description: `A CSV for the last ${period} was generated locally.`,
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Business"
        title="Business analytics"
        description="Revenue, expenses and cash flow across your PayTrust records."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-white/[0.02] p-0.5">
              {(['3M', '6M', '12M'] as Period[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                    period === item
                      ? 'bg-white/[0.08] text-ink'
                      : 'text-muted hover:text-ink-soft'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={download}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Revenue',
            value: totalRevenue,
            change: '+21.4%',
            positive: true,
            note: `${data.labels.length} months · ${period}`,
            icon: TrendingUp,
            tone: 'text-green-soft border-green/20 bg-green/[0.08]',
          },
          {
            label: 'Expenses',
            value: totalExpenses,
            change: '+6.2%',
            positive: false,
            note: 'Contractors and tools',
            icon: Wallet,
            tone: 'text-amber border-amber/20 bg-amber/[0.08]',
          },
          {
            label: 'Net cash flow',
            value: net,
            change: '+32.8%',
            positive: true,
            note: 'Revenue minus expenses',
            icon: BarChart3,
            tone: 'text-cyan border-cyan/20 bg-cyan/[0.07]',
          },
          {
            label: 'Outstanding',
            value: 63900,
            change: '3 records',
            positive: false,
            note: 'Protected or awaiting',
            icon: CalendarRange,
            tone: 'text-[#9fbbff] border-brand/25 bg-brand/[0.09]',
          },
        ].map((stat) => (
          <Panel key={stat.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-dim">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border',
                    stat.tone
                  )}
                >
                  <stat.icon className="h-2.5 w-2.5" />
                </span>
                {stat.label}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-[9.5px] font-medium',
                  stat.positive ? 'text-green-soft' : 'text-muted'
                )}
              >
                {stat.positive ? (
                  <ArrowUpRight className="h-2.5 w-2.5" />
                ) : (
                  <ArrowDownRight className="h-2.5 w-2.5" />
                )}
                {stat.change}
              </span>
            </div>
            <div className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink">
              {formatINR(stat.value)}
            </div>
            <div className="text-[9.5px] text-muted">{stat.note}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5">
              <div>
                <h2 className="text-[13.5px] font-semibold text-ink">
                  Revenue vs expenses
                </h2>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  Actual to date, dashed estimate for the current period.
                </p>
              </div>
              <StatusPill tone="cyan" dot>
                {period} view
              </StatusPill>
            </div>
            <div className="px-3 pb-3 pt-2 sm:px-4">
              <RevenueChart
                labels={data.labels}
                revenue={data.revenue}
                expenses={data.expenses}
                estimateFrom={data.estimateFrom}
              />
            </div>
            <div className="grid grid-cols-3 gap-px border-t border-line-soft bg-line-soft">
              <div className="bg-panel px-4 py-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-dim">
                  Avg monthly revenue
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-ink">
                  {formatINR(Math.round(totalRevenue / data.labels.length))}
                </div>
              </div>
              <div className="bg-panel px-4 py-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-dim">
                  Avg monthly expenses
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-ink">
                  {formatINR(Math.round(totalExpenses / data.labels.length))}
                </div>
              </div>
              <div className="bg-panel px-4 py-3">
                <div className="text-[9px] uppercase tracking-wide text-muted-dim">
                  Margin
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-green-soft">
                  {Math.round((net / Math.max(totalRevenue, 1)) * 100)}%
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Panel>
              <div className="px-4 pt-4">
                <h2 className="text-[13px] font-semibold text-ink">
                  Expense mix
                </h2>
                <p className="mt-0.5 text-[10px] text-muted">
                  Current period · {formatINR(90500)}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 px-4 py-4">
                <DonutChart
                  segments={expenseSegments}
                  size={150}
                  thickness={22}
                  centerValue="₹90.5k"
                  centerLabel="Total spend"
                />
                <div className="w-full space-y-1.5">
                  {expenseSegments.map((segment) => (
                    <div
                      key={segment.label}
                      className="flex items-center gap-2 text-[10px]"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="flex-1 text-muted">{segment.label}</span>
                      <span className="text-ink-soft">{segment.value}%</span>
                      <span className="w-14 text-right text-muted-dim">
                        {formatINR(segment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">
                    Top customers
                  </h2>
                  <p className="mt-0.5 text-[10px] text-muted">
                    By received value · {period}
                  </p>
                </div>
                <Link
                  href="/clients"
                  className="text-[10px] font-medium text-cyan hover:text-cyan-soft"
                >
                  CRM
                </Link>
              </div>
              <div className="mt-2.5 divide-y divide-line-soft">
                {customers.map((customer, index) => {
                  const person = demoPeople[customer.id];
                  return (
                    <div
                      key={customer.id}
                      className="flex items-center gap-2.5 px-4 py-2.5"
                    >
                      <span className="w-3 text-[9.5px] font-semibold text-muted-dim">
                        {index + 1}
                      </span>
                      <PersonAvatar person={person} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-ink-soft">
                          {person.name}
                        </p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan/60 to-cyan"
                            style={{ width: `${customer.share}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10.5px] font-medium text-ink">
                          {formatINR(customer.value)}
                        </div>
                        <div className="text-[8.5px] text-muted-dim">
                          {customer.deals} deal{customer.deals > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-line-soft px-4 py-2.5">
                <Link
                  href="/clients"
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan"
                >
                  View all clients <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525] p-4">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 120% at 100% 0%, rgba(34,211,238,0.13) 0%, transparent 55%)',
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cash-flow outlook
                </span>
                <span className="text-[9px] text-muted-dim">Estimate</span>
              </div>
              <div className="mt-2.5 text-[26px] font-semibold tracking-[-0.02em] text-ink">
                {formatINR(112400)}
              </div>
              <p className="text-[10px] text-muted">
                Projected next 30 days · medium confidence
              </p>
              <div className="mt-3 space-y-2">
                {[
                  ['Confirmed milestones', 28600, 'green'],
                  ['Expected retainers', 45000, 'cyan'],
                  ['Outstanding invoices', 38800, 'amber'],
                ].map(([label, value, tone]) => (
                  <div key={label as string}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted">{label as string}</span>
                      <span className="text-ink-soft">
                        {formatINR(value as number)}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          tone === 'green'
                            ? 'bg-green'
                            : tone === 'cyan'
                              ? 'bg-cyan'
                              : 'bg-amber'
                        )}
                        style={{
                          width: `${Math.round(((value as number) / 112400) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted-dim">
                <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                Estimates use agreed milestones and repeat-client history. They
                are not a promise of income.
              </p>
            </div>
          </section>

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-cyan" />
              <h2 className="text-[12px] font-semibold text-ink">
                Invoices to review
              </h2>
            </div>
            <div className="mt-2.5 space-y-2">
              {[
                ['INV-2210', 'May retainer', '₹45,000', 'Awaiting you'],
                ['INV-2207', 'Print production', '₹42,000', 'Held'],
                ['INV-2198', 'Final logo files', '₹9,000', 'Due 14 May'],
              ].map(([id, title, amount, status]) => (
                <Link
                  key={id}
                  href="/invoices"
                  className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-white/[0.015] px-2.5 py-2 transition-colors hover:border-line-strong"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-soft text-[8px] font-semibold text-muted">
                    {status === 'Awaiting you' ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-green-soft/70" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium text-ink-soft">
                      {title}
                    </p>
                    <p className="text-[8.5px] text-muted-dim">
                      {id} · {status}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-ink">
                    {amount}
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/invoices">
              <Button variant="secondary" size="sm" className="mt-2.5 w-full">
                Open invoices
              </Button>
            </Link>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-violet" />
              <h2 className="text-[12px] font-semibold text-ink">
                Client mix
              </h2>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              17 of 24 completed deals came from repeat clients. Two clients
              account for 58% of revenue this period.
            </p>
            <div className="mt-2.5 rounded-lg border border-amber/15 bg-amber/[0.04] px-2.5 py-2 text-[9.5px] leading-relaxed text-amber-soft/85">
              Concentration risk: keep at least three active client
              relationships.
            </div>
          </Panel>
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
        <Info className="h-3 w-3" />
        Demo analytics · figures are seeded for illustration
      </p>
    </div>
  );
}

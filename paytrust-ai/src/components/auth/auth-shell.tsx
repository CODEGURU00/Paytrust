import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { PayTrustMark } from '@/components/ui/logo';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { demoPeople } from '@/lib/demo/data';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-line-soft bg-[#070e1b] lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 70% at 0% 0%, rgba(34,211,238,0.13) 0%, transparent 60%), radial-gradient(70% 80% at 100% 100%, rgba(76,125,255,0.16) 0%, transparent 60%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,173,214,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,173,214,0.1) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage:
              'radial-gradient(ellipse at 30% 20%, #000 10%, transparent 75%)',
          }}
        />

        <div className="relative flex flex-1 flex-col p-10 xl:p-12">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2.5 text-muted transition-colors hover:text-ink"
          >
            <PayTrustMark size={32} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              PayTrust <span className="text-cyan">AI</span>
            </span>
          </Link>

          <div className="mt-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/[0.055] px-3 py-1 text-[10.5px] font-medium text-cyan-soft">
              <Sparkles className="h-3 w-3" />
              Trust-first transactions
            </div>
            <h1 className="mt-4 max-w-md text-[34px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink xl:text-[40px]">
              One record for the money, the terms and the evidence.
            </h1>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted">
              PayTrust keeps the whole deal together so both people can see the
              same facts before anything moves.
            </p>

            <ul className="mt-5 space-y-2.5">
              {[
                'Deal DNA drafts mutual terms from the conversation',
                'Protected payments release only when you confirm',
                'Evidence and receipts stay timestamped',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green/25 bg-green/[0.08] text-green-soft">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-[11.5px] text-ink-soft/85">{item}</span>
                </li>
              ))}
            </ul>

            <figure className="mt-8 max-w-md rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur">
              <blockquote className="text-[11.5px] leading-relaxed text-ink-soft/85">
                &ldquo;We stopped arguing about what was agreed. The record was
                already there — the amount, the revision limit and the delivery
                date.&rdquo;
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2.5">
                <PersonAvatar person={demoPeople.priya} size="sm" />
                <div>
                  <div className="text-[10.5px] font-medium text-ink">
                    Priya Nair
                  </div>
                  <div className="text-[9px] text-muted">
                    Independent web developer
                  </div>
                </div>
              </figcaption>
            </figure>
          </div>

          <div className="mt-8 flex items-center gap-1.5 text-[9.5px] text-muted-dim">
            <ShieldCheck className="h-3 w-3" />
            Demo environment · all payments are simulated
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <PayTrustMark size={26} />
            <span className="text-[13px] font-semibold text-ink">
              PayTrust <span className="text-cyan">AI</span>
            </span>
          </div>
          <span className="hidden text-[10px] text-muted-dim sm:block">
            Demo access below
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8">
          <div className="w-full max-w-[380px]">
            {eyebrow && (
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cyan">
                {eyebrow}
              </div>
            )}
            <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-ink">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                {description}
              </p>
            )}
            <div className="mt-6">{children}</div>
            {footer && <div className="mt-5">{footer}</div>}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line-soft" />
              <span className="text-[9.5px] uppercase tracking-wider text-muted-dim">
                or explore first
              </span>
              <span className="h-px flex-1 bg-line-soft" />
            </div>

            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white/[0.025] px-4 py-2.5 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-cyan/25 hover:bg-cyan/[0.04] hover:text-ink"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              Continue to the demo workspace
            </Link>
            <p className="mt-2 text-center text-[9px] text-muted-dim">
              No account needed · seeded with Arjun Sharma&apos;s sample record
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 text-center text-[9px] text-muted-dim sm:px-8">
          PayTrust AI demo · no real bank, UPI or card is connected
        </div>
      </main>
    </div>
  );
}

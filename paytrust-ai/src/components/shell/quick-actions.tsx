'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/components/demo/demo-provider';
import { Modal } from '@/components/ui/modal';
import {
  FieldLabel,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';

export type ActionKind = 'send' | 'request' | 'deal' | 'ask' | 'scan';

interface QuickActionsContextValue {
  openAction: (kind: ActionKind) => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null);

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = useState<ActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { people, createTransaction } = useDemo();

  const others = useMemo(
    () => Object.values(people).filter((person) => person.id !== 'arjun'),
    [people]
  );

  const openAction = useCallback(
    (kind: ActionKind) => {
      setError(null);
      if (kind === 'ask') {
        router.push('/ai');
        return;
      }
      if (kind === 'scan') {
        router.push('/qr-scan');
        return;
      }
      setAction(kind);
    },
    [router]
  );

  const close = () => {
    setAction(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    const form = new FormData(event.currentTarget);
    const counterpartyId = String(form.get('counterparty') || 'rahul');
    const customEmail = String(form.get('custom_email') || '').trim();
    const counterpartyEmail = customEmail || undefined;
    const amount = Number(form.get('amount') || 0);
    const purpose = String(form.get('purpose') || '').trim();
    const title = String(form.get('title') || purpose).trim();

    if (!amount || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!purpose) {
      setError('Add a short purpose so both parties know what this is for.');
      return;
    }

    const mode = action === 'deal' ? 'deal' : action === 'request' ? 'request' : 'payment';
    const fallbackTitle =
      mode === 'deal'
        ? 'New deal'
        : mode === 'request'
          ? 'Payment request'
          : 'Payment';

    /*
     * The record is created on the server first so the id that is published in
     * the URL is the one the server stored. Navigating to a local placeholder
     * would leave the user on a link that answers "Record not found" after a
     * refresh.
     */
    const id = await createTransaction({
      title: title || fallbackTitle,
      counterpartyId,
      counterpartyEmail,
      amount,
      purpose,
      direction: mode === 'request' ? 'in' : 'out',
      mode,
      note: mode === 'deal' ? purpose : undefined,
    });

    if (!id) return;

    close();
    router.push(mode === 'deal' ? `/deals/${id}` : `/transactions/${id}`);
  };

  return (
    <QuickActionsContext.Provider value={{ openAction }}>
      {children}

      <Modal
        open={Boolean(action)}
        onClose={close}
        title={
          action === 'send'
            ? 'Send money via Escrow'
            : action === 'request'
              ? 'Create a payment request'
              : 'Create an escrow-backed deal'
        }
        description={
          action === 'send'
            ? 'Payments are held safely in PayTrust Escrow via PayPal Sandbox until milestones are delivered and approved.'
            : action === 'request'
              ? 'Give the payer a clear purpose, amount and terms. They can review and fund escrow in their workspace.'
              : 'Define deliverables and payment milestones. Both parties collaborate with full transparency.'
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-cyan/20 bg-cyan/[0.055] px-3 py-2.5 text-[12px] leading-relaxed text-cyan-soft">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" />
            <span>
              Escrow Protection. Payments are held in escrow via PayPal Sandbox until you review and approve the work.
            </span>
          </div>

          <div>
            <FieldLabel htmlFor="qa-counterparty">
              {action === 'request' ? 'Request from' : 'Recipient / Counterparty'}
            </FieldLabel>
            <Select id="qa-counterparty" name="counterparty" defaultValue="rahul">
              {others.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} — {person.role}
                </option>
              ))}
            </Select>
            <div className="mt-2">
              <TextInput
                id="qa-custom-email"
                name="custom_email"
                type="email"
                placeholder="Or enter custom recipient email (e.g. seller@example.com)"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="qa-amount">Amount (INR)</FieldLabel>
              <TextInput
                id="qa-amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                placeholder="18,000"
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="qa-title">Title</FieldLabel>
              <TextInput
                id="qa-title"
                name="title"
                placeholder={
                  action === 'deal' ? 'Logo design' : action === 'request' ? 'Web retainer' : 'Payment'
                }
              />
            </div>
          </div>

          {action === 'request' && (
            <div>
              <FieldLabel htmlFor="qa-due">Expected by</FieldLabel>
              <TextInput
                id="qa-due"
                name="due"
                type="date"
                defaultValue={todayInput()}
              />
            </div>
          )}

          <div>
            <FieldLabel htmlFor="qa-purpose">
              {action === 'deal' ? 'Scope and deliverables' : 'Purpose'}
            </FieldLabel>
            <TextArea
              id="qa-purpose"
              name="purpose"
              placeholder={
                action === 'deal'
                  ? 'Describe what both parties agreed to. AI Deal DNA will turn this into a draft with source references.'
                  : 'What is this payment for? A clear purpose becomes part of the permanent record.'
              }
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red/25 bg-red/[0.08] px-3 py-2 text-[12.5px] text-red-soft">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-dim">
              <Info className="h-3.5 w-3.5" />
              Simulated demo record
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit">
                {action === 'send' ? (
                  <>
                    <ArrowUpRight className="h-4 w-4" /> Send (simulated)
                  </>
                ) : action === 'request' ? (
                  <>
                    <ArrowDownLeft className="h-4 w-4" /> Create request
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Create deal
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error('useQuickActions must be used inside QuickActionsProvider');
  }
  return context;
}

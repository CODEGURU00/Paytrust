'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Dna,
  FileText,
  Flag,
  Lightbulb,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

const prompts = [
  'What needs my attention today?',
  'Summarize the logo design deal',
  'What evidence supports the camera dispute?',
  'Which agreement gaps are still open?',
];

export default function AiAssistantPage() {
  const { transactions, project, alerts, demoPeople } = useDemo();
  const [messages, setMessages] = useState<
    { role: 'user' | 'ai'; content: string }[]
  >([
    {
      role: 'ai',
      content:
        'I can read only the records in this workspace. Ask me about a deal, a promise, evidence or a risk signal. I will always separate facts from suggestions — I never decide fault or move money.',
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, thinking]);

  const disputed = transactions.find((tx) => tx.status === 'disputed');
  const awaiting = transactions.find(
    (tx) => tx.status === 'awaiting_confirmation'
  );
  const openGaps = transactions.reduce(
    (total, tx) => total + (tx.agreement?.missing.length || 0),
    0
  );

  const reply = (question: string) => {
    const text = question.toLowerCase();
    if (text.includes('attention') || text.includes('today')) {
      return [
        `${awaiting ? `${demoPeople[awaiting.counterpartyId].name} is waiting for your confirmation on ${awaiting.title} (${formatINR(awaiting.amount)}).` : ''}`,
        disputed
          ? `${disputed.title} has an open dispute. Both accounts are in the record, and evidence is ready for a neutral review.`
          : '',
        `You have ${openGaps} open agreement gap${openGaps === 1 ? '' : 's'} across active Deal DNA drafts.`,
        `Next safe step: review the evidence, then decide whether to release, ask a question or open mediation. Nothing moves automatically.`,
      ]
        .filter(Boolean)
        .join('\n\n');
    }
    if (text.includes('logo') || text.includes('rahul')) {
      return 'Facts from the record:\n\n• Logo design · TX-48213 · ₹18,000 total\n• ₹9,000 released for the first milestone; ₹9,000 still protected\n• Draft v2 adds a revision limit but has not been mutually approved\n• 2 missing conditions: deadline handling and usage rights before final payment\n\nSuggestion: review the revised revision policy and resolve the two gaps before approving v2.';
    }
    if (text.includes('camera') || text.includes('dispute') || text.includes('evidence')) {
      return 'The camera rental record (TX-48122) contains two differing pickup dates. The Evidence Vault holds a receipt, two images and a file. PayTrust has not decided which account is correct. A neutral summary can lay both accounts side by side; a human decides the outcome.';
    }
    if (text.includes('gap') || text.includes('agreement') || text.includes('clause')) {
      return `There are ${openGaps} open conditions across the demo records. The most common gaps are cancellation terms, late-delivery handling and usage rights before final payment. You can resolve each one inside Deal DNA — both parties still need to approve the revised version.`;
    }
    if (text.includes('milestone') || text.includes('project')) {
      return `The ${project.title} project has ${project.milestones.length} milestones worth ${formatINR(project.total)}. ${formatINR(project.paid)} has been confirmed; ${formatINR(project.total - project.paid)} remains protected. ${project.milestones.find((m) => m.status === 'awaiting')?.title || 'No milestone'} is currently awaiting your review.`;
    }
    if (text.includes('risk') || text.includes('alert')) {
      return `There are ${alerts.filter((a) => a.status === 'open').length} open risk signals. The highest priority is a recipient-detail change on a ₹42,000 payment. Treat this as a prompt to verify through a channel you already trust — not as proof of fraud.`;
    }
    return 'I can only answer from the seeded workspace. Try asking about the logo design deal, the camera rental dispute, open agreement gaps, milestones, or today’s risk signals. I will not invent facts outside these records.';
  };

  const send = (value?: string) => {
    const question = (value ?? input).trim();
    if (!question || thinking) return;
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      setMessages((current) => [
        ...current,
        { role: 'ai', content: reply(question) },
      ]);
      setThinking(false);
    }, 800);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="AI Assistant"
        description="Ask questions about the record. Facts are cited; decisions stay yours."
        action={
          <div className="flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan/[0.05] px-3 py-1 text-[10px] font-medium text-cyan-soft">
            <ShieldCheck className="h-3 w-3" />
            Advisory only
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <Panel className="flex min-h-[600px] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[12.5px] font-semibold text-ink">
                Workspace assistant
              </h2>
              <p className="text-[9.5px] text-muted">
                Reads {transactions.length} records · cannot move money
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-2.5',
                  message.role === 'user' && 'flex-row-reverse'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                    message.role === 'ai'
                      ? 'border-cyan/20 bg-cyan/[0.08] text-cyan'
                      : 'border-line bg-panel-soft text-muted'
                  )}
                >
                  {message.role === 'ai' ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <UserRound className="h-3 w-3" />
                  )}
                </span>
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3.5 py-2.5 text-[11.5px] leading-relaxed whitespace-pre-line',
                    message.role === 'ai'
                      ? 'border border-line bg-panel-soft text-ink-soft'
                      : 'bg-brand/90 text-white'
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan/20 bg-cyan/[0.08] text-cyan">
                  <Sparkles className="h-3 w-3" />
                </span>
                <div className="flex items-center gap-1 rounded-xl border border-line bg-panel-soft px-3 py-2.5">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan/70"
                      style={{ animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line-soft p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {prompts.slice(0, 2).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-line bg-white/[0.02] px-2.5 py-1 text-[9.5px] text-muted transition-colors hover:border-cyan/25 hover:text-cyan-soft"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-panel-soft/60 p-2">
              <TextArea
                rows={2}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about a deal, promise, risk signal or receipt…"
                className="min-h-[48px] resize-none border-0 bg-transparent p-1 text-[11.5px] focus:ring-0"
              />
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[8.5px] text-muted-dim">
                  Answers cite only this workspace
                </span>
                <Button
                  size="icon-sm"
                  aria-label="Send question"
                  onClick={() => send()}
                  disabled={!input.trim() || thinking}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <h2 className="text-[12px] font-semibold text-ink">Suggested prompts</h2>
            <div className="mt-2.5 space-y-1.5">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="flex w-full items-center gap-2 rounded-lg border border-line-soft bg-white/[0.015] px-2.5 py-2 text-left text-[10.5px] text-ink-soft transition-colors hover:border-cyan/25 hover:bg-cyan/[0.03]"
                >
                  <MessageCircle className="h-3 w-3 shrink-0 text-cyan" />
                  <span className="flex-1">{prompt}</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-dim" />
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Wallet className="h-3.5 w-3.5 text-cyan" />
              What I can see
            </h2>
            <ul className="mt-2 space-y-1.5">
              {[
                `${transactions.length} transaction records`,
                `${disputed ? '1 open dispute' : 'No open disputes'}`,
                `${openGaps} open agreement gaps`,
                `${project.milestones.length} project milestones`,
                `${alerts.length} risk signals`,
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-green-soft/80" />
                  <span className="text-[10px] text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Lightbulb className="h-3.5 w-3.5 text-amber" />
              What I cannot do
            </h2>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-muted">
              {[
                'Release, freeze or reverse money',
                'Decide who is right in a dispute',
                'Read chats from other apps or contacts',
                'Invent facts outside this workspace',
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-dim" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/deals/TX-48213', label: 'Deal DNA', icon: Dna },
              { href: '/risk', label: 'Risk Radar', icon: Flag },
              { href: '/evidence', label: 'Evidence', icon: FileText },
              { href: '/mediator', label: 'Mediator', icon: ShieldCheck },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-2 text-[10px] text-ink-soft transition-colors hover:border-cyan/25 hover:text-cyan-soft"
              >
                <link.icon className="h-3 w-3 text-cyan" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

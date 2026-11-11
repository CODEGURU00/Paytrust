'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, Select, TextArea, TextInput } from '@/components/ui/form';
import { cn } from '@/lib/utils';

const categories = [
  { value: 'all', label: 'All discussions' },
  { value: 'question', label: 'Questions' },
  { value: 'win', label: 'Wins' },
  { value: 'guide', label: 'Guides' },
] as const;

type Category = (typeof categories)[number]['value'];

const seedDiscussions = [
  {
    id: 'd1',
    title: 'How do you price a logo with three revision rounds?',
    excerpt:
      'I usually include two rounds. A client asked for three plus source files. Should I raise the first milestone or add a separate revision fee?',
    author: 'rahul',
    category: 'question',
    votes: 34,
    replies: 12,
    time: '2h ago',
    tags: ['Pricing', 'Logo design'],
    solved: true,
  },
  {
    id: 'd2',
    title: 'Deal DNA caught a cancellation gap I always missed',
    excerpt:
      'Used the missing-conditions prompt before starting a retainer. We added a 7-day pause clause. First time a client and I both knew what happens if work stops.',
    author: 'priya',
    category: 'win',
    votes: 58,
    replies: 9,
    time: '5h ago',
    tags: ['Deal DNA', 'Retainers'],
    solved: false,
  },
  {
    id: 'd3',
    title: 'A practical checklist for releasing milestone payments',
    excerpt:
      'Six things I verify before releasing protected funds: scope, preview link, file list, revision count, deadline and receipt. Sharing the exact checklist.',
    author: 'vikram',
    category: 'guide',
    votes: 71,
    replies: 18,
    time: '1d ago',
    tags: ['Milestones', 'Evidence'],
    solved: false,
  },
  {
    id: 'd4',
    title: 'Client wants to move the deal to WhatsApp. How do you respond?',
    excerpt:
      'I want to keep the record together without sounding difficult. What phrasing has worked for you?',
    author: 'ananya',
    category: 'question',
    votes: 22,
    replies: 15,
    time: '1d ago',
    tags: ['Communication', 'Boundaries'],
    solved: false,
  },
  {
    id: 'd5',
    title: 'My first ₹1,00,000 month without chasing invoices',
    excerpt:
      'Three retainers, all with milestones approved before work. The change was not more clients — it was clearer terms and faster release.',
    author: 'karan',
    category: 'win',
    votes: 96,
    replies: 24,
    time: '2d ago',
    tags: ['Freelancing', 'Milestones'],
    solved: false,
  },
];

const guides = [
  {
    title: 'Getting started with Deal DNA',
    description:
      'Turn a chat into a shared draft, resolve gaps and collect both approvals.',
    time: '6 min read',
    icon: Sparkles,
    tone: 'cyan',
  },
  {
    title: 'Releasing protected payments safely',
    description:
      'What to check before you release funds, and what happens to the receipt.',
    time: '4 min read',
    icon: ShieldCheck,
    tone: 'green',
  },
  {
    title: 'Evidence that actually helps a review',
    description:
      'Screenshots, links and receipts: what a neutral reviewer can use.',
    time: '5 min read',
    icon: BookOpen,
    tone: 'blue',
  },
];

const categoryTone: Record<string, { label: string; tone: 'cyan' | 'green' | 'amber' | 'muted' }> = {
  question: { label: 'Question', tone: 'cyan' },
  win: { label: 'Win', tone: 'green' },
  guide: { label: 'Guide', tone: 'amber' },
};

export default function CommunityPage() {
  const { demoPeople, pushToast } = useDemo();
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [discussions, setDiscussions] = useState(seedDiscussions);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [composeOpen, setComposeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('question');

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return discussions.filter((item) => {
      const matchesCategory = category === 'all' || item.category === category;
      const matchesSearch =
        !search ||
        item.title.toLowerCase().includes(search) ||
        item.excerpt.toLowerCase().includes(search) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search));
      return matchesCategory && matchesSearch;
    });
  }, [category, discussions, query]);

  const toggleVote = (id: string) => {
    setVoted((current) => ({ ...current, [id]: !current[id] }));
  };

  const publish = () => {
    if (!newTitle.trim()) return;
    setDiscussions((current) => [
      {
        id: `local-${Date.now()}`,
        title: newTitle.trim(),
        excerpt: newBody.trim() || 'Posted just now.',
        author: 'arjun',
        category: newCategory,
        votes: 1,
        replies: 0,
        time: 'Just now',
        tags: ['New'],
        solved: false,
      },
      ...current,
    ]);
    setComposeOpen(false);
    setNewTitle('');
    setNewBody('');
    setCategory('all');
    pushToast('Discussion published (demo)', {
      description:
        'It appears at the top of the feed and is visible only in this browser.',
    });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line-soft bg-[#060b16]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1240px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-[15px] font-semibold text-ink">Community</h1>
              <p className="text-[10.5px] text-muted">
                Real questions from people who move money for work
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setComposeOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Start a discussion</span>
            </Button>
            <Link href="/trust">
              <Button variant="ghost" size="sm">
                My passport
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-line bg-[#08111f]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(90% 160% at 10% 0%, rgba(34,211,238,0.12) 0%, transparent 55%), radial-gradient(80% 140% at 100% 0%, rgba(76,125,255,0.16) 0%, transparent 55%)',
            }}
          />
          <div className="relative px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="cyan" dot>
                Community space
              </StatusPill>
              <span className="text-[10.5px] text-muted">
                4,218 members · 612 discussions this month
              </span>
            </div>
            <h2 className="mt-3 max-w-2xl text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
              Better deals start with better questions.
            </h2>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-muted">
              Ask about pricing, boundaries or evidence. Share what worked. No
              follower counts, no engagement bait.
            </p>
            <div className="mt-4 flex max-w-xl items-center gap-2 rounded-xl border border-white/[0.08] bg-[#060b16]/70 px-3 py-1.5 backdrop-blur">
              <Search className="h-4 w-4 shrink-0 text-muted-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search discussions, pricing, milestones…"
                className="h-8 min-w-0 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-muted-dim focus:outline-none"
                aria-label="Search community"
              />
              <kbd className="hidden rounded border border-line bg-white/[0.03] px-1.5 py-0.5 text-[9px] text-muted-dim sm:block">
                ⌘ K
              </kbd>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Pricing', 'Deal DNA', 'Milestones', 'Client boundaries', 'Disputes'].map(
                (tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setQuery(tag)}
                    className="rounded-full border border-line bg-white/[0.025] px-2.5 py-1 text-[10.5px] text-muted transition-colors hover:border-cyan/25 hover:text-cyan-soft"
                  >
                    {tag}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
          <div className="space-y-4">
            {/* Official guides */}
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan" />
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">
                    Official guides
                  </h2>
                </div>
                <span className="text-[10px] text-muted-dim">Maintained by PayTrust</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {guides.map((guide) => (
                  <button
                    key={guide.title}
                    type="button"
                    onClick={() =>
                      pushToast('Guide opened (demo)', {
                        description: `${guide.title} · ${guide.time}`,
                        tone: 'info',
                      })
                    }
                    className="group rounded-xl border border-line bg-panel p-3.5 text-left transition-colors hover:border-cyan/25 hover:bg-panel-hover"
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg border',
                        guide.tone === 'cyan'
                          ? 'border-cyan/20 bg-cyan/[0.07] text-cyan'
                          : guide.tone === 'green'
                            ? 'border-green/20 bg-green/[0.07] text-green-soft'
                            : 'border-brand/25 bg-brand/[0.09] text-[#9fbbff]'
                      )}
                    >
                      <guide.icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-2.5 text-[11.5px] font-medium leading-snug text-ink group-hover:text-cyan-soft">
                      {guide.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">
                      {guide.description}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[9.5px] text-muted-dim">
                      {guide.time}
                      <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Discussions */}
            <section className="rounded-2xl border border-line bg-panel">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  {categories.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setCategory(item.value)}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                        category === item.value
                          ? 'bg-white/[0.07] text-ink'
                          : 'text-muted hover:text-ink-soft'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-dim">
                  <TrendingUp className="h-3 w-3" />
                  Most helpful this week
                </div>
              </div>

              <div className="divide-y divide-line-soft">
                {filtered.map((discussion) => {
                  const author = demoPeople[discussion.author];
                  const meta = categoryTone[discussion.category];
                  const isVoted = voted[discussion.id];
                  return (
                    <article
                      key={discussion.id}
                      className="flex gap-3 px-4 py-4 transition-colors hover:bg-white/[0.015]"
                    >
                      <div className="flex w-10 shrink-0 flex-col items-center">
                        <button
                          type="button"
                          onClick={() => toggleVote(discussion.id)}
                          aria-label={
                            isVoted
                              ? 'Remove your upvote'
                              : 'Upvote this discussion'
                          }
                          className={cn(
                            'flex h-7 w-8 items-center justify-center rounded-lg border transition-colors',
                            isVoted
                              ? 'border-cyan/40 bg-cyan/15 text-cyan'
                              : 'border-line bg-white/[0.02] text-muted hover:border-cyan/25 hover:text-cyan'
                          )}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className={cn(
                            'mt-1 text-[11px] font-semibold',
                            isVoted ? 'text-cyan' : 'text-ink-soft'
                          )}
                        >
                          {discussion.votes + (isVoted ? 1 : 0)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                          {discussion.solved && (
                            <StatusPill tone="green" dot>
                              Solved
                            </StatusPill>
                          )}
                          <span className="text-[9.5px] text-muted-dim">
                            {discussion.time}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            pushToast('Discussion opened (demo)', {
                              description: discussion.title,
                              tone: 'info',
                            })
                          }
                          className="mt-1.5 block text-left"
                        >
                          <h3 className="text-[13px] font-medium leading-snug text-ink hover:text-cyan">
                            {discussion.title}
                          </h3>
                        </button>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
                          {discussion.excerpt}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            <PersonAvatar person={author} size="xs" />
                            <span className="text-[10px] text-ink-soft">
                              {author.name}
                            </span>
                            {author.verified && (
                              <BadgeCheck className="h-2.5 w-2.5 text-cyan" />
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                            <MessageCircle className="h-3 w-3" />
                            {discussion.replies} replies
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {discussion.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-line bg-white/[0.02] px-1.5 py-0.5 text-[9px] text-muted"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 hidden h-4 w-4 shrink-0 text-muted-dim sm:block" />
                    </article>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center px-5 py-12 text-center">
                    <Search className="h-5 w-5 text-muted" />
                    <p className="mt-2 text-[12px] font-medium text-ink">
                      No discussions match
                    </p>
                    <p className="mt-1 text-[10.5px] text-muted">
                      Try another search or start the conversation yourself.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setQuery('');
                        setCategory('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
              <div className="border-t border-line-soft px-4 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() =>
                    pushToast('You are all caught up', {
                      description: 'Older discussions are available in the archive.',
                      tone: 'info',
                    })
                  }
                  className="text-[10.5px] font-medium text-cyan hover:text-cyan-soft"
                >
                  Load older discussions
                </button>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber/20 bg-amber/[0.08] text-amber">
                  <Lightbulb className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-[12.5px] font-semibold text-ink">
                  House guidelines
                </h2>
              </div>
              <ul className="mt-2.5 space-y-2">
                {[
                  'Share the context, not just the conclusion.',
                  'No screenshots with personal data visible.',
                  'Disagree with the idea, never the person.',
                  'PayTrust staff always carry an official badge.',
                ].map((item, index) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[8.5px] font-semibold text-muted">
                      {index + 1}
                    </span>
                    <span className="text-[10.5px] leading-relaxed text-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                  <Star className="h-3.5 w-3.5 text-amber" />
                  Helpful contributors
                </h2>
                <span className="text-[9.5px] text-muted-dim">This month</span>
              </div>
              <div className="mt-2.5 space-y-2.5">
                {[
                  ['vikram', '18 helpful replies', '1.2k'],
                  ['priya', '14 helpful replies', '980'],
                  ['rahul', '11 helpful replies', '845'],
                ].map(([id, meta, points], index) => (
                  <div key={id} className="flex items-center gap-2.5">
                    <span className="w-3 text-[10px] font-semibold text-muted-dim">
                      {index + 1}
                    </span>
                    <PersonAvatar person={demoPeople[id]} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-ink">
                        {demoPeople[id].name}
                      </p>
                      <p className="text-[9.5px] text-muted">{meta}</p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-[9.5px] text-amber">
                      <Star className="h-2.5 w-2.5" />
                      {points}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525] p-4">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(100% 120% at 100% 0%, rgba(34,211,238,0.12) 0%, transparent 55%)',
                }}
              />
              <div className="relative">
                <Flame className="h-4 w-4 text-cyan" />
                <h2 className="mt-2 text-[12.5px] font-semibold text-ink">
                  This week&apos;s prompt
                </h2>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  What is one clause you now add to every agreement — and what
                  taught you to add it?
                </p>
                <Button
                  variant="cyan"
                  size="sm"
                  className="mt-2.5 w-full"
                  onClick={() => {
                    setNewTitle(
                      'What is one clause you now add to every agreement?'
                    );
                    setComposeOpen(true);
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Join the prompt
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-green-soft" />
                <h2 className="text-[11.5px] font-semibold text-ink">
                  Safety note
                </h2>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                Never share passwords, OTPs or full card numbers. PayTrust will
                never ask for them in a public discussion.
              </p>
              <Link
                href="/support"
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-cyan"
              >
                Report a post <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            </section>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
          <Users className="h-3 w-3" />
          Demo community · seeded discussions · no real posts are published
        </p>
      </div>

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Start a discussion"
        description="Ask a clear question or share what worked."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={publish} disabled={!newTitle.trim()}>
              Publish
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="discussion-title">Title</FieldLabel>
            <TextInput
              id="discussion-title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="A clear, specific question"
            />
          </div>
          <div>
            <FieldLabel htmlFor="discussion-category">Category</FieldLabel>
            <Select
              id="discussion-category"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
            >
              <option value="question">Question</option>
              <option value="win">Win</option>
              <option value="guide">Guide</option>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="discussion-body">Context</FieldLabel>
            <TextArea
              id="discussion-body"
              rows={4}
              value={newBody}
              onChange={(event) => setNewBody(event.target.value)}
              placeholder="What have you tried? What kind of answer would help?"
            />
          </div>
          <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
            Posts are public in production. This demo publishes only to your
            browser.
          </p>
        </div>
      </Modal>
    </div>
  );
}

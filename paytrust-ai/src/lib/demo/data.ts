import type {
  DemoAlert,
  DemoEvidence,
  DemoNotification,
  DemoPerson,
  DemoPrivacy,
  DemoProfileStats,
  DemoProject,
  DemoTransaction,
} from './types';

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export const DEMO_USER_ID = 'arjun';

export const demoPeople: Record<string, DemoPerson> = {
  arjun: {
    id: 'arjun',
    name: 'Arjun Sharma',
    handle: 'arjun',
    avatar: 'arjun',
    verified: true,
    role: 'Freelance product designer',
    location: 'Mumbai, India',
    bio: 'Freelance product designer focused on brand systems and websites for small teams.',
  },
  rahul: {
    id: 'rahul',
    name: 'Rahul Mehta',
    handle: 'rahul',
    avatar: 'rahul',
    verified: true,
    role: 'Freelance brand designer',
    location: 'Pune, India',
    bio: 'Freelance brand designer. Logos, identity systems and packaging for growing teams.',
  },
  priya: {
    id: 'priya',
    name: 'Priya Nair',
    handle: 'priya',
    avatar: 'priya',
    verified: true,
    role: 'Founder, Nair Studio',
    location: 'Bengaluru, India',
    bio: 'Independent studio founder building thoughtful digital products.',
  },
  karan: {
    id: 'karan',
    name: 'Karan Verma',
    handle: 'karan',
    avatar: 'karan',
    verified: true,
    role: 'Camera rental house',
    location: 'Mumbai, India',
    bio: 'Cinema camera rentals and production support.',
  },
  ananya: {
    id: 'ananya',
    name: 'Ananya Rao',
    handle: 'ananya',
    avatar: 'ananya',
    verified: false,
    role: 'Tutor',
    location: 'Hyderabad, India',
    bio: 'Mathematics and science tutor for senior school students.',
  },
  vikram: {
    id: 'vikram',
    name: 'Vikram Singh',
    handle: 'vikram',
    avatar: 'vikram',
    verified: true,
    role: 'Photographer',
    location: 'Jaipur, India',
    bio: 'Editorial and product photographer.',
  },
  dev: {
    id: 'dev',
    name: 'Dev Patel',
    handle: 'dev',
    avatar: 'dev',
    verified: true,
    role: 'Operations consultant',
    location: 'Ahmedabad, India',
    bio: 'Helping small businesses keep their payment operations tidy.',
  },
  neha: {
    id: 'neha',
    name: 'Neha Kapoor',
    handle: 'neha',
    avatar: 'neha',
    verified: true,
    role: 'Content strategist',
    location: 'Delhi, India',
    bio: 'Freelance content and editorial strategy.',
  },
  maya: {
    id: 'maya',
    name: 'Maya Iyer',
    handle: 'maya',
    avatar: 'maya',
    verified: true,
    role: 'PayTrust trust team',
    location: 'Bengaluru, India',
  },
  sunrise: {
    id: 'sunrise',
    name: 'Sunrise Print Co.',
    handle: 'sunrise',
    avatar: 'sunrise',
    verified: true,
    role: 'Printing and production',
    location: 'Mumbai, India',
  },
  support: {
    id: 'support',
    name: 'PayTrust Support',
    handle: 'support',
    avatar: 'support',
    verified: true,
    role: 'Trust & safety team',
    location: 'Bengaluru, India',
  },
};

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

const logoAgreement = {
  version: 'Draft v2',
  overview:
    'Rahul Mehta will design a brand logo for Arjun Sharma, with payment in two milestones.',
  paymentAmount: 18000,
  split: '₹9,000 + ₹9,000',
  deadline: '14 May',
  deadlineTime: '6:00 PM IST',
  responsibilities:
    'Designer: 3 concepts, final AI + PNG files. Client: choose a concept within 24h of delivery.',
  revisions: 'Two revision rounds included. Extra rounds to be agreed separately.',
  cancellation: 'Not discussed. Add a suggestion below.',
  approvals: { you: false, counterparty: false },
  missing: [
    {
      id: 'miss-deadline',
      question: 'What happens if the deadline is missed?',
      suggestion:
        'If delivery is delayed by more than 3 business days, the client may request a revised delivery date or cancel unstarted milestones without penalty.',
    },
    {
      id: 'miss-rights',
      question: 'Who owns usage rights before full payment?',
      suggestion:
        'Concepts remain the designer’s property. Full usage rights transfer to the client only after final payment is released.',
    },
  ],
  tags: ['Payment', 'Deadline', 'Deliverable', 'Revision policy'],
};

const logoMessages = [
  {
    id: 'm-48213-1',
    authorId: 'rahul',
    content: 'I can deliver 3 concepts by 14th evening. Two revisions included.',
    time: '10:05 AM',
    dateLabel: '9 May',
  },
  {
    id: 'm-48213-2',
    authorId: 'arjun',
    content: 'Works. ₹18,000 total, half after I pick a concept?',
    time: '10:07 AM',
  },
  {
    id: 'm-48213-3',
    authorId: 'system',
    content:
      'AI agreement summary · draft. Detected ₹18,000 total · 50% on concept approval · 14 May deadline · 2 revisions. Missing: cancellation terms. This summary is not binding until both parties approve.',
    time: '10:08 AM',
    system: true,
    tone: 'ai' as const,
  },
  {
    id: 'm-48213-4',
    authorId: 'rahul',
    content: 'Concepts attached. Let me know which direction you like.',
    time: '4:12 PM',
    dateLabel: '12 May',
    attachment: {
      id: 'att-48213-concepts',
      kind: 'file' as const,
      name: 'Brand-concepts-v1.pdf',
      meta: '4.2 MB',
      preview: 'pdf' as const,
    },
  },
  {
    id: 'm-48213-5',
    authorId: 'system',
    content:
      'Payment receipt · ₹9,000\nMilestone 1 released · 12 May, 4:30 PM',
    time: '4:30 PM',
    system: true,
    tone: 'receipt' as const,
  },
];

export const logoTransaction: DemoTransaction = {
  id: 'TX-48213',
  title: 'Logo design',
  counterpartyId: 'rahul',
  direction: 'out',
  amount: 18000,
  currency: 'INR',
  status: 'in_progress',
  dateLabel: 'Today, 4:12 PM',
  dateShort: '12 May, 4:12 PM',
  messageCount: 14,
  agreementStatus: 'awaiting',
  verified: true,
  purpose: 'Brand identity — 3 logo concepts and final source files',
  created: '9 May, 10:02 AM',
  method: 'PayTrust demo wallet',
  released: 9000,
  held: 9000,
  messages: logoMessages,
  timeline: [
    {
      id: 't-48213-1',
      label: 'Deal created',
      date: '9 May · 10:02',
      state: 'done',
    },
    {
      id: 't-48213-2',
      label: 'Terms approved by both (v1)',
      date: '9 May · 10:20',
      state: 'done',
    },
    {
      id: 't-48213-3',
      label: 'Milestone 1 released',
      date: '12 May · 16:30',
      state: 'done',
    },
    {
      id: 't-48213-4',
      label: 'Draft v2 shared',
      date: 'Revision policy updated · awaiting approval',
      state: 'current',
    },
    {
      id: 't-48213-5',
      label: 'Final delivery',
      date: 'Due 14 May · 18:00',
      state: 'upcoming',
    },
  ],
  promises: [
    {
      id: 'p-48213-1',
      label: 'Send concepts',
      ownerId: 'rahul',
      ownerLabel: 'Rahul M.',
      dueLabel: 'Done',
      status: 'done',
    },
    {
      id: 'p-48213-2',
      label: 'Choose a concept (you)',
      ownerId: 'arjun',
      ownerLabel: 'You',
      dueLabel: '13 May',
      status: 'current',
    },
    {
      id: 'p-48213-3',
      label: 'Final files',
      ownerId: 'rahul',
      ownerLabel: 'Rahul M.',
      dueLabel: '14 May',
      status: 'upcoming',
    },
  ],
  evidence: { receipts: 2, images: 2, files: 1 },
  agreement: logoAgreement,
  aiInsight: {
    headline:
      'Deal is on schedule. 1 of 3 deliverables received. Awaiting your concept choice to unlock milestone 2.',
    body: 'The delivery date is still 14 May. The revised agreement adds a revision limit but has not been approved yet.',
    conflicts: 'No conflicts detected',
    dispute: 'Dispute: none',
  },
};

const priyaTransaction: DemoTransaction = {
  id: 'TX-48190',
  title: 'Web retainer',
  counterpartyId: 'priya',
  direction: 'in',
  amount: 45000,
  currency: 'INR',
  status: 'awaiting_confirmation',
  dateLabel: 'Today, 11:30 AM',
  dateShort: '12 May, 11:30 AM',
  messageCount: 6,
  agreementStatus: 'awaiting_you',
  verified: true,
  purpose: 'May website retainer — content updates and maintenance',
  created: '1 May, 9:00 AM',
  method: 'PayTrust demo wallet',
  messages: [
    {
      id: 'm-48190-1',
      authorId: 'priya',
      content:
        'May retainer invoice is ready. Delivery of the May content batch is complete.',
      time: '11:30 AM',
      dateLabel: '12 May',
    },
    {
      id: 'm-48190-2',
      authorId: 'system',
      content:
        'Payment request received · ₹45,000. Delivery was due 11 May. Confirm the deliverable before release.',
      time: '11:31 AM',
      system: true,
      tone: 'ai' as const,
    },
  ],
  timeline: [
    {
      id: 't-48190-1',
      label: 'Retainer started',
      date: '1 May · 09:00',
      state: 'done',
    },
    {
      id: 't-48190-2',
      label: 'May deliverables submitted',
      date: '11 May · 18:40',
      state: 'done',
    },
    {
      id: 't-48190-3',
      label: 'Payment awaiting your confirmation',
      date: '12 May · 11:30',
      state: 'current',
    },
    {
      id: 't-48190-4',
      label: 'Funds release',
      date: 'When you confirm',
      state: 'upcoming',
    },
  ],
  promises: [
    {
      id: 'p-48190-1',
      label: 'Review May deliverable',
      ownerId: 'arjun',
      ownerLabel: 'You',
      dueLabel: 'Overdue · 11 May',
      status: 'overdue',
    },
    {
      id: 'p-48190-2',
      label: 'Share May content report',
      ownerId: 'priya',
      ownerLabel: 'Priya N.',
      dueLabel: 'Done',
      status: 'done',
    },
  ],
  evidence: { receipts: 1, images: 1, files: 1 },
  aiInsight: {
    headline:
      'Priya’s payment of ₹45,000 is awaiting your confirmation. Delivery was due 11 May.',
    body: 'The content report and screenshots are in the Evidence Vault. Review them before you release funds.',
    conflicts: 'No conflicts detected',
    dispute: 'Dispute: none',
  },
};

const karanTransaction: DemoTransaction = {
  id: 'TX-48122',
  title: 'Camera rental',
  counterpartyId: 'karan',
  direction: 'out',
  amount: 9500,
  currency: 'INR',
  status: 'disputed',
  dateLabel: '10 May',
  dateShort: '10 May, 9:48 AM',
  messageCount: 22,
  agreementStatus: 'partial',
  verified: true,
  purpose: 'Camera body rental for a two-day brand shoot',
  created: '8 May, 6:10 PM',
  method: 'PayTrust demo wallet',
  messages: [
    {
      id: 'm-48122-1',
      authorId: 'karan',
      content: 'The camera body was available from 8 May. Pickup any time after 5 PM.',
      time: '6:12 PM',
      dateLabel: '8 May',
    },
    {
      id: 'm-48122-2',
      authorId: 'arjun',
      content: 'I noted pickup for 10 May morning because the shoot starts that evening.',
      time: '6:18 PM',
    },
    {
      id: 'm-48122-3',
      authorId: 'karan',
      content: 'I was expecting pick-up on 8 May. The late pickup changed my next booking.',
      time: '9:42 AM',
      dateLabel: '10 May',
    },
    {
      id: 'm-48122-4',
      authorId: 'system',
      content:
        'Dispute opened · conflicting pickup dates. Both parties can add their account and select evidence for a neutral summary.',
      time: '10:05 AM',
      system: true,
      tone: 'ai' as const,
    },
  ],
  timeline: [
    {
      id: 't-48122-1',
      label: 'Rental agreed in chat',
      date: '8 May · 18:20',
      state: 'done',
    },
    {
      id: 't-48122-2',
      label: 'Payment recorded (simulated)',
      date: '8 May · 18:32',
      state: 'done',
    },
    {
      id: 't-48122-3',
      label: 'Pickup date questioned',
      date: '10 May · 09:42',
      state: 'done',
    },
    {
      id: 't-48122-4',
      label: 'Dispute opened',
      date: '10 May · 10:05',
      state: 'current',
    },
    {
      id: 't-48122-5',
      label: 'Neutral mediation',
      date: 'Ready for review',
      state: 'upcoming',
    },
  ],
  promises: [
    {
      id: 'p-48122-1',
      label: 'Return camera body',
      ownerId: 'arjun',
      ownerLabel: 'You',
      dueLabel: '2 days overdue',
      status: 'overdue',
    },
    {
      id: 'p-48122-2',
      label: 'Share pickup photos',
      ownerId: 'karan',
      ownerLabel: 'Karan V.',
      dueLabel: 'Awaiting',
      status: 'current',
    },
  ],
  evidence: { receipts: 1, images: 2, files: 1 },
  aiInsight: {
    headline:
      'A dispute is open. Two pickup dates appear in the record. Evidence is ready for mediation.',
    body: 'PayTrust does not decide fault. A neutral summary can organize both accounts and highlight the missing information.',
    conflicts: 'Pickup date differs',
    dispute: 'Dispute: open',
  },
  dispute: {
    claimA: 'Pickup was on 8 May.',
    claimB: 'Pickup was on 10 May.',
    conflict: 'Conflict: pickup date differs',
    evidenceIds: ['ev-48122-photo', 'ev-48122-receipt'],
  },
};

const ananyaTransaction: DemoTransaction = {
  id: 'TX-48077',
  title: 'Tutoring',
  counterpartyId: 'ananya',
  direction: 'in',
  amount: 6200,
  currency: 'INR',
  status: 'pending',
  dateLabel: '8 May',
  dateShort: '8 May, 2:05 PM',
  messageCount: 3,
  agreementStatus: 'none',
  verified: false,
  purpose: 'Mathematics tutoring — eight sessions in May',
  created: '8 May, 2:03 PM',
  method: 'PayTrust demo wallet',
  messages: [
    {
      id: 'm-48077-1',
      authorId: 'ananya',
      content: 'Sharing the request for eight sessions. Happy to start this week.',
      time: '2:05 PM',
      dateLabel: '8 May',
    },
    {
      id: 'm-48077-2',
      authorId: 'system',
      content:
        'Receiver identity is not verified. There is no agreement attached to this request yet.',
      time: '2:06 PM',
      system: true,
      tone: 'ai' as const,
    },
  ],
  timeline: [
    {
      id: 't-48077-1',
      label: 'Payment request received',
      date: '8 May · 14:05',
      state: 'done',
    },
    {
      id: 't-48077-2',
      label: 'Verification pending',
      date: 'Receiver not verified',
      state: 'current',
    },
    {
      id: 't-48077-3',
      label: 'Agreement',
      date: 'Not created',
      state: 'upcoming',
    },
  ],
  promises: [
    {
      id: 'p-48077-1',
      label: 'Verify receiver identity',
      ownerId: 'arjun',
      ownerLabel: 'You',
      dueLabel: 'Before payment',
      status: 'current',
    },
    {
      id: 'p-48077-2',
      label: 'Agree on session schedule',
      ownerId: 'ananya',
      ownerLabel: 'Ananya R.',
      dueLabel: 'Not set',
      status: 'upcoming',
    },
  ],
  evidence: { receipts: 0, images: 0, files: 0 },
  aiInsight: {
    headline:
      'Receiver not verified and no agreement attached. Add context before sending funds.',
    body: 'A short deal note with session dates and a cancellation rule would make this request easier to track.',
    conflicts: 'Verification missing',
    dispute: 'Dispute: none',
  },
};

const vikramTransaction: DemoTransaction = {
  id: 'TX-47980',
  title: 'Photography',
  counterpartyId: 'vikram',
  direction: 'out',
  amount: 12000,
  currency: 'INR',
  status: 'cancelled',
  dateLabel: '2 May',
  dateShort: '2 May, 6:20 PM',
  messageCount: 8,
  agreementStatus: 'cancelled',
  verified: true,
  purpose: 'Product photography — 20 edited images',
  created: '28 Apr, 11:10 AM',
  method: 'PayTrust demo wallet',
  messages: [
    {
      id: 'm-47980-1',
      authorId: 'vikram',
      content: 'The studio date is no longer available. I can refund the booking or move it to next week.',
      time: '6:25 PM',
      dateLabel: '2 May',
    },
    {
      id: 'm-47980-2',
      authorId: 'system',
      content:
        'Transaction cancelled by mutual consent. No payment was captured. Both parties can still access the record.',
      time: '6:40 PM',
      system: true,
      tone: 'ai' as const,
    },
  ],
  timeline: [
    {
      id: 't-47980-1',
      label: 'Transaction created',
      date: '28 Apr · 11:10',
      state: 'done',
    },
    {
      id: 't-47980-2',
      label: 'Studio date changed',
      date: '2 May · 18:20',
      state: 'done',
    },
    {
      id: 't-47980-3',
      label: 'Cancelled by mutual consent',
      date: '2 May · 18:40',
      state: 'done',
    },
  ],
  promises: [],
  evidence: { receipts: 1, images: 0, files: 1 },
  aiInsight: {
    headline: 'This transaction was cancelled by mutual consent. No funds were captured.',
    body: 'The conversation and cancellation note remain available for your records.',
    conflicts: 'No conflicts detected',
    dispute: 'Dispute: none',
  },
};

const sunriseTransaction: DemoTransaction = {
  id: 'TX-48231',
  title: 'Print production',
  counterpartyId: 'sunrise',
  direction: 'out',
  amount: 42000,
  currency: 'INR',
  status: 'pending',
  dateLabel: 'Today, 10:42 AM',
  dateShort: '12 May, 10:42 AM',
  messageCount: 2,
  agreementStatus: 'none',
  verified: true,
  purpose: 'Packaging print run — 1,000 boxes',
  created: '12 May, 10:40 AM',
  method: 'PayTrust demo wallet',
  messages: [
    {
      id: 'm-48231-1',
      authorId: 'sunrise',
      content:
        'Hi Arjun, please use our new receiving account for this order. Sending the details here.',
      time: '10:42 AM',
      dateLabel: '12 May',
    },
  ],
  timeline: [
    {
      id: 't-48231-1',
      label: 'Payment request received',
      date: '12 May · 10:42',
      state: 'done',
    },
    {
      id: 't-48231-2',
      label: 'Recipient account changed',
      date: '12 May · 08:40',
      state: 'done',
    },
    {
      id: 't-48231-3',
      label: 'Payment held for review',
      date: '12 May · 10:45',
      state: 'current',
    },
  ],
  promises: [
    {
      id: 'p-48231-1',
      label: 'Confirm new recipient details',
      ownerId: 'arjun',
      ownerLabel: 'You',
      dueLabel: 'Before payment',
      status: 'current',
    },
  ],
  evidence: { receipts: 0, images: 0, files: 0 },
  aiInsight: {
    headline:
      'Recipient details changed two hours before payment. Confirm the new account through a number you already trust.',
    body: 'This is an advisory signal, not a verdict. Legitimate vendors do change accounts.',
    conflicts: 'Account details changed',
    dispute: 'Dispute: none',
  },
};

export const initialTransactions: DemoTransaction[] = [];

/* ------------------------------------------------------------------ */
/* Evidence                                                            */
/* ------------------------------------------------------------------ */

export const initialEvidence: DemoEvidence[] = [];

/* ------------------------------------------------------------------ */
/* Risk Radar                                                          */
/* ------------------------------------------------------------------ */

export const initialAlerts: DemoAlert[] = [];

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const initialNotifications: DemoNotification[] = [];

/* ------------------------------------------------------------------ */
/* Milestones project                                                  */
/* ------------------------------------------------------------------ */

export const initialProject: DemoProject = {
  id: 'AGR-2291',
  title: 'Website redesign · Milestones',
  counterpartyId: 'priya',
  total: 30000,
  paid: 5000,
  milestones: [
    {
      id: 'ms-design',
      number: 1,
      title: 'Design',
      dueLabel: 'Due 8 May',
      detail: 'Wireframes and UI kit',
      amount: 5000,
      status: 'paid',
      paidOn: 'Paid · 9 May',
      evidence: [
        { label: 'Wireframes-v2.png', kind: 'file', meta: '2.2 MB' },
        { label: 'UI-kit.fig', kind: 'file', meta: '6.8 MB' },
      ],
      completionNote: 'Completion confirmed by you',
    },
    {
      id: 'ms-development',
      number: 2,
      title: 'Development',
      dueLabel: 'Due 20 May',
      detail: 'Responsive site on staging',
      amount: 15000,
      status: 'awaiting',
      evidence: [
        { label: 'staging.priya-site.dev', kind: 'url', meta: 'Open staging site' },
        { label: 'screens-build-12.png', kind: 'file', meta: '12 May' },
      ],
      completionNote:
        'Priya marked this as complete on 12 May. Review the evidence, then confirm.',
    },
    {
      id: 'ms-final',
      number: 3,
      title: 'Final delivery',
      dueLabel: 'Due 28 May',
      detail: 'Launch, handover and docs',
      amount: 10000,
      status: 'not_started',
      evidence: [],
    },
  ],
  history: [
    {
      id: 'hist-1',
      label: 'Design milestone paid (simulated)',
      date: '9 May · 14:10',
      tone: 'green',
    },
    {
      id: 'hist-2',
      label: 'Milestones defined and approved by both',
      date: '2 May · 11:30',
      tone: 'blue',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Privacy defaults                                                    */
/* ------------------------------------------------------------------ */

export const initialPrivacy: DemoPrivacy = {
  showCompletedDeals: true,
  showMilestones: true,
  showResponseTime: true,
  showInCommunity: true,
  shareEvidence: false,
  productUpdates: true,
  paymentReminders: true,
  disputeUpdates: true,
};

/* ------------------------------------------------------------------ */
/* Trust passports                                                     */
/* ------------------------------------------------------------------ */

export const trustProfiles: Record<string, { personId: string; stats: DemoProfileStats }> = {
  arjun: {
    personId: 'arjun',
    stats: {
      completed: 24,
      total: 26,
      cancellations: 1,
      cancellationNote: '1 by mutual agreement before work began',
      disputes: 0,
      disputeNote: 'No disputes in the last 12 months',
      onTime: '96%',
      responseTime: '< 2h',
      repeatClients: 17,
      accountAge: '2y 1m',
      passportId: 'PT-2210-AS',
      verifiedOn: 'Verified with government ID on 18 Sep 2024',
      history: [
        { label: 'Jun', value: 36 },
        { label: 'Jul', value: 52 },
        { label: 'Aug', value: 41 },
        { label: 'Sep', value: 68 },
        { label: 'Oct', value: 74 },
        { label: 'Nov', value: 58 },
        { label: 'Dec', value: 82 },
        { label: 'Jan', value: 64 },
        { label: 'Feb', value: 88 },
        { label: 'Mar', value: 71 },
        { label: 'Apr', value: 79 },
        { label: 'May', value: 94, highlight: true },
      ],
      milestones: [
        { label: 'Identity verified', date: 'Sep 2024', state: 'done' },
        { label: 'First 10 deals completed', date: 'Jan 2025', state: 'done' },
        { label: 'Dispute resolved cooperatively', date: 'Mar 2025', state: 'done' },
        { label: '25 mutually approved agreements', date: 'Feb 2026', state: 'current' },
        { label: '50 completed deals', date: '26 to go', state: 'upcoming' },
      ],
    },
  },
  rahul: {
    personId: 'rahul',
    stats: {
      completed: 38,
      total: 41,
      cancellations: 2,
      cancellationNote: '1 by mutual agreement, 1 by client before work began',
      disputes: 1,
      disputeNote: 'Resolved by mutual settlement, Aug 2024',
      onTime: '92%',
      responseTime: '< 4h',
      repeatClients: 29,
      accountAge: '1y 4m',
      passportId: 'PT-7741-RM',
      verifiedOn: 'Verified with government ID on 14 Jan 2024',
      history: [
        { label: 'Jun', value: 42 },
        { label: 'Jul', value: 54 },
        { label: 'Aug', value: 31 },
        { label: 'Sep', value: 64 },
        { label: 'Oct', value: 56 },
        { label: 'Nov', value: 76 },
        { label: 'Dec', value: 46 },
        { label: 'Jan', value: 62 },
        { label: 'Feb', value: 80 },
        { label: 'Mar', value: 68 },
        { label: 'Apr', value: 76 },
        { label: 'May', value: 90, highlight: true },
      ],
      milestones: [
        { label: 'Identity verified', date: 'Jan 2024', state: 'done' },
        { label: 'First 10 deals completed', date: 'Jun 2024', state: 'done' },
        { label: 'Dispute resolved cooperatively', date: 'Aug 2024', state: 'done' },
        { label: '25 mutually approved agreements', date: 'Feb 2025', state: 'done' },
        { label: '50 completed deals', date: '9 to go', state: 'current' },
      ],
    },
  },
};

export const avatarSrc = (key: string) => `/avatars/${key}.jpg`;

export const personById = (id: string) =>
  demoPeople[id] || demoPeople.arjun;

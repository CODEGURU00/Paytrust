export type DemoAvatarKey =
  | 'arjun'
  | 'rahul'
  | 'priya'
  | 'karan'
  | 'ananya'
  | 'vikram'
  | 'dev'
  | 'neha'
  | 'maya'
  | 'sunrise'
  | 'support';

export interface DemoPerson {
  id: string;
  name: string;
  handle: string;
  avatar: DemoAvatarKey;
  verified: boolean;
  role: string;
  location?: string;
  bio?: string;
}

export type DemoTransactionStatus =
  | 'in_progress'
  | 'awaiting_confirmation'
  | 'completed'
  | 'pending'
  | 'disputed'
  | 'cancelled';

export type AgreementApprovalStatus =
  | 'approved'
  | 'awaiting'
  | 'awaiting_you'
  | 'partial'
  | 'changes_requested'
  | 'none'
  | 'cancelled';

export interface ChatAttachment {
  id: string;
  kind: 'image' | 'file' | 'receipt';
  name: string;
  meta?: string;
  preview?: 'blaze' | 'monogram' | 'staging' | 'pdf' | 'receipt';
}

export interface ChatMessage {
  id: string;
  authorId: string | 'system';
  content: string;
  time: string;
  dateLabel?: string;
  attachment?: ChatAttachment;
  system?: boolean;
  tone?: 'default' | 'ai' | 'receipt';
}

export interface TimelineEvent {
  id: string;
  label: string;
  date: string;
  state: 'done' | 'current' | 'upcoming';
  detail?: string;
}

export type PromiseStatus = 'done' | 'upcoming' | 'due-soon' | 'overdue' | 'current';

export interface PromiseItem {
  id: string;
  label: string;
  ownerId: string;
  ownerLabel: string;
  dueLabel?: string;
  status: PromiseStatus;
}

export interface AgreementClause {
  id: string;
  label: string;
  value: string;
  status: 'confident' | 'missing' | 'edited';
}

export interface MissingCondition {
  id: string;
  question: string;
  suggestion: string;
}

export interface DemoAgreement {
  version: string;
  overview: string;
  paymentAmount: number;
  split: string;
  deadline: string;
  deadlineTime: string;
  responsibilities: string;
  revisions: string;
  cancellation: string;
  approvals: {
    you: boolean;
    counterparty: boolean;
  };
  missing: MissingCondition[];
  tags: string[];
}

export interface EvidenceSummary {
  receipts: number;
  images: number;
  files: number;
}

export interface DemoTransaction {
  id: string;
  /**
   * True while the record only exists in this browser and has no server-side
   * row. Such a record must survive a refresh of the live transaction list,
   * otherwise its URL stops resolving.
   */
  localOnly?: boolean;
  title: string;
  counterpartyId: string;
  direction: 'in' | 'out';
  amount: number;
  currency: string;
  status: DemoTransactionStatus;
  dateLabel: string;
  dateShort: string;
  messageCount: number;
  agreementStatus: AgreementApprovalStatus;
  verified: boolean;
  purpose: string;
  created: string;
  method: string;
  released?: number;
  held?: number;
  messages: ChatMessage[];
  timeline: TimelineEvent[];
  promises: PromiseItem[];
  evidence: EvidenceSummary;
  agreement?: DemoAgreement;
  aiInsight?: {
    headline: string;
    body: string;
    conflicts: string;
    dispute: string;
  };
  dispute?: {
    claimA: string;
    claimB: string;
    conflict: string;
    evidenceIds: string[];
  };
}

export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'expected' | 'reviewed';

export interface DemoAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  transactionId?: string;
  amountLabel: string;
  party: string;
  timeLabel: string;
  reasons: string[];
  suggestion: string;
  status: AlertStatus;
}

export type EvidenceKind = 'receipt' | 'image' | 'file';

export interface DemoEvidence {
  id: string;
  transactionId: string;
  name: string;
  kind: EvidenceKind;
  sizeLabel: string;
  uploadedBy: string;
  dateLabel: string;
  preview?: 'blaze' | 'monogram' | 'staging' | 'pdf' | 'receipt';
  note?: string;
}

export interface DemoNotification {
  id: string;
  title: string;
  body: string;
  timeLabel: string;
  href: string;
  read: boolean;
  tone: 'info' | 'warning' | 'success';
}

export interface MilestoneItem {
  id: string;
  number: number;
  title: string;
  dueLabel: string;
  detail: string;
  amount: number;
  status: 'paid' | 'awaiting' | 'not_started';
  paidOn?: string;
  evidence: {
    label: string;
    kind: 'url' | 'file';
    meta?: string;
  }[];
  completionNote?: string;
}

export interface DemoProject {
  id: string;
  title: string;
  counterpartyId: string;
  total: number;
  paid: number;
  milestones: MilestoneItem[];
  history: {
    id: string;
    label: string;
    date: string;
    tone: 'green' | 'blue';
  }[];
}

export interface DemoPrivacy {
  showCompletedDeals: boolean;
  showMilestones: boolean;
  showResponseTime: boolean;
  showInCommunity: boolean;
  shareEvidence: boolean;
  productUpdates: boolean;
  paymentReminders: boolean;
  disputeUpdates: boolean;
}

export interface DemoProfileStats {
  completed: number;
  total: number;
  cancellations: number;
  cancellationNote: string;
  disputes: number;
  disputeNote: string;
  onTime: string;
  responseTime: string;
  repeatClients: number;
  accountAge: string;
  passportId: string;
  verifiedOn: string;
  history: { label: string; value: number; highlight?: boolean }[];
  milestones: {
    label: string;
    date: string;
    state: 'done' | 'current' | 'upcoming';
  }[];
}

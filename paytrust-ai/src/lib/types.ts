// Core application types for PayTrust AI

export type TransactionStatus =
  | 'CREATED'
  | 'PENDING'
  | 'APPROVED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type UserRole = 'buyer' | 'seller' | 'witness';

export type PaymentProvider = 'paypal' | 'paytrust';

export type QRType = 'paytrust' | 'paypal' | 'upi' | 'emvco' | 'unknown';

export type AISummaryType =
  | 'conversation'
  | 'commitments'
  | 'evidence_report'
  | 'missing_evidence'
  | 'dispute_mediation';

export type DisputeStatus =
  | 'draft'
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'closed';

export interface Profile {
  id: string;
  display_name: string;
  email?: string | null;
  avatar_url?: string | null;
  verification_status: 'unverified' | 'verified';
  created_at: string;
  transaction_count?: number | null;
}

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
  buyer?: Profile;
  seller?: Profile;
}

export interface TransactionParticipant {
  id?: string;
  transaction_id: string;
  user_id: string;
  role: UserRole;
  joined_at?: string;
}

export interface Message {
  id: string;
  transaction_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface PaymentEvent {
  id: string;
  transaction_id: string;
  provider: PaymentProvider;
  provider_event_id?: string | null;
  event_type: string;
  payload_summary: Record<string, unknown>;
  amount?: number | null;
  currency?: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  transaction_id: string;
  uploaded_by: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  kind?: EvidenceKind;
  description?: string | null;
  visibility?: EvidenceVisibility;
  commitment_id?: string | null;
  milestone_id?: string | null;
  version?: number;
  supersedes_id?: string | null;
  checksum?: string | null;
  updated_at?: string;
  uploader?: Profile;
}

export interface AISummary {
  id: string;
  transaction_id: string;
  summary_type: AISummaryType;
  summary: string;
  source_version: string;
  created_at: string;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  opened_by: string;
  status: DisputeStatus;
  reason: string;
  report?: string | null;
  ai_summary?: string | null;
  resolution?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
  statements?: DisputeStatement[];
  opener?: Profile | null;
  transaction?: Transaction | null;
}

export interface QRPayload {
  type: QRType;
  raw: string;
  parsed: {
    provider?: string;
    recipient?: string;
    amount?: number;
    currency?: string;
    reference?: string;
    url?: string;
    transaction_id?: string;
  };
  is_valid: boolean;
  validation_message?: string;
}

export interface TrustIndicators {
  user_id: string;
  account_age_days: number;
  verification_status: string;
  completed_transactions: number;
  total_transactions: number;
  dispute_count: number;
  dispute_resolution_rate: number;
}

export interface TransactionWithDetails extends Transaction {
  participants?: TransactionParticipant[];
  messages?: Message[];
  payment_events?: PaymentEvent[];
  ai_summaries?: AISummary[];
  attachments?: Attachment[];
  disputes?: Dispute[];
  agreements?: AgreementVersion[];
  commitments?: Commitment[];
  milestones?: Milestone[];
  audit_events?: AuditEvent[];
}

export interface DisputeWithRelations extends Dispute {
  transaction?: Transaction | null;
  opener?: Profile | null;
}

// ------------------------------------------------------------------
// Deal DNA / agreements
// ------------------------------------------------------------------

export type AgreementStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'changes_requested'
  | 'superseded'
  | 'cancelled';

export type AgreementSource = 'manual' | 'ai';

export type ApprovalDecision = 'approved' | 'changes_requested' | 'rejected';

export type ChangeRequestStatus = 'open' | 'incorporated' | 'declined';

export interface AgreementTerms {
  purpose?: string;
  amount?: number | null;
  currency?: string | null;
  deliverables?: string[];
  deadline?: string | null;
  responsibilities?: Array<{ owner: string; description: string }>;
  revision_policy?: string | null;
  cancellation_policy?: string | null;
  milestones?: Array<{
    title: string;
    amount?: number | null;
    due_date?: string | null;
  }>;
  open_questions?: string[];
  summary?: string;
  missing_terms?: string[];
  uncertainties?: string[];
}

export interface AgreementApproval {
  id: string;
  agreement_id: string;
  transaction_id: string;
  user_id: string;
  decision: ApprovalDecision;
  comment?: string | null;
  decided_at: string;
  user?: Profile;
}

export interface AgreementChangeRequest {
  id: string;
  agreement_id: string;
  transaction_id: string;
  requested_by: string;
  description: string;
  status: ChangeRequestStatus;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  requester?: Profile;
}

export interface AgreementVersion {
  id: string;
  transaction_id: string;
  version: number;
  terms: AgreementTerms;
  status: AgreementStatus;
  source: AgreementSource;
  source_context: Record<string, unknown>;
  ai_model?: string | null;
  ai_confidence?: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  creator?: Profile | null;
  approvals?: AgreementApproval[];
  change_requests?: AgreementChangeRequest[];
}

export interface DealDnaExtraction {
  summary: string;
  terms: AgreementTerms;
  missing_terms: string[];
  uncertainties: string[];
  confidence: number;
}

// ------------------------------------------------------------------
// Commitments and milestones
// ------------------------------------------------------------------

export type CommitmentStatus =
  | 'open'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

export interface Commitment {
  id: string;
  transaction_id: string;
  agreement_id?: string | null;
  owner_id: string;
  created_by: string;
  description: string;
  due_at?: string | null;
  status: CommitmentStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  owner?: Profile | null;
  creator?: Profile | null;
}

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'approved'
  | 'paid'
  | 'cancelled';

export interface Milestone {
  id: string;
  transaction_id: string;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  status: MilestoneStatus;
  position: number;
  due_at?: string | null;
  created_by: string;
  approved_by?: string | null;
  completed_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile | null;
}

// ------------------------------------------------------------------
// Evidence
// ------------------------------------------------------------------

export type EvidenceKind = 'file' | 'image' | 'receipt' | 'document';
export type EvidenceVisibility = 'participants' | 'private';
export type EvidenceAccessAction =
  | 'viewed'
  | 'downloaded'
  | 'uploaded'
  | 'shared';

export interface EvidenceAccessLog {
  id: string;
  attachment_id: string;
  transaction_id: string;
  user_id: string;
  action: EvidenceAccessAction;
  created_at: string;
}

// ------------------------------------------------------------------
// Disputes / mediation
// ------------------------------------------------------------------

export interface DisputeStatement {
  id: string;
  dispute_id: string;
  transaction_id: string;
  author_id: string;
  statement: string;
  evidence_ids: string[];
  created_at: string;
  author?: Profile | null;
}

export interface MediationResult {
  dispute_id: string;
  summary: string;
  disclaimer: string;
  generated_at: string;
  source: {
    statements: number;
    evidence: number;
  };
}

// ------------------------------------------------------------------
// Audit timeline
// ------------------------------------------------------------------

export interface AuditEvent {
  id: string;
  transaction_id: string;
  actor_id?: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Profile | null;
}

export type TimelineEntryType =
  | 'transaction'
  | 'message'
  | 'payment'
  | 'agreement'
  | 'approval'
  | 'change_request'
  | 'commitment'
  | 'milestone'
  | 'evidence'
  | 'dispute'
  | 'statement'
  | 'participant'
  | 'audit';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  title: string;
  description?: string | null;
  actor_id?: string | null;
  occurred_at: string;
  metadata?: Record<string, unknown>;
}

// ------------------------------------------------------------------
// Trust Passport
// ------------------------------------------------------------------

export interface TrustPassportSettings {
  user_id: string;
  is_public: boolean;
  headline?: string | null;
  location?: string | null;
  show_completed_deals: boolean;
  show_milestones: boolean;
  show_response_time: boolean;
  show_in_community: boolean;
  show_dispute_history: boolean;
  share_evidence: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrustPassportStats {
  total_deals: number;
  completed_deals: number;
  cancelled_deals: number;
  disputes: number;
  disputes_resolved: number;
  dispute_resolution_rate: number;
  commitments_total: number;
  commitments_completed: number;
  commitments_open: number;
  commitments_overdue: number;
  milestones_total: number;
  milestones_paid: number;
  evidence_shared: number;
  account_age_days: number;
}

export interface TrustPassport {
  profile: Profile;
  settings: TrustPassportSettings;
  stats: TrustPassportStats;
  recent_activity?: AuditEvent[];
}

// API response wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  per_page: number;
}

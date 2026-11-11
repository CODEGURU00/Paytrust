import type { TimelineEntry, TimelineEntryType } from '@/lib/types';

export interface TimelineTransaction {
  id: string;
  buyer_id: string;
  created_at: string;
}

export interface TimelineMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface TimelinePayment {
  id: string;
  event_type: string;
  amount?: number | null;
  currency?: string | null;
  payload_summary?: Record<string, unknown> | null;
  created_at: string;
}

export interface TimelineAudit {
  id: string;
  actor_id?: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TimelineAgreement {
  id: string;
  version: number;
  status: string;
  source: string;
  created_at: string;
  approved_at?: string | null;
}

export interface TimelineApproval {
  id: string;
  agreement_id: string;
  user_id: string;
  decision: string;
  decided_at: string;
}

export interface TimelineChangeRequest {
  id: string;
  agreement_id: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface TimelineCommitment {
  id: string;
  owner_id: string;
  description: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at?: string | null;
}

export interface TimelineEvidence {
  id: string;
  file_name: string;
  kind?: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface TimelineDispute {
  id: string;
  status: string;
  reason: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface TimelineStatement {
  id: string;
  author_id: string;
  created_at: string;
}

export interface TimelineParticipant {
  user_id: string;
  role: string;
  joined_at?: string | null;
}

export interface TimelineInput {
  transaction: TimelineTransaction;
  messages: TimelineMessage[];
  payments: TimelinePayment[];
  audits: TimelineAudit[];
  agreements: TimelineAgreement[];
  approvals: TimelineApproval[];
  changeRequests: TimelineChangeRequest[];
  commitments: TimelineCommitment[];
  milestones: TimelineMilestone[];
  evidence: TimelineEvidence[];
  disputes: TimelineDispute[];
  statements: TimelineStatement[];
  participants: TimelineParticipant[];
}

const DOMAIN_AUDIT_PREFIXES = [
  'agreement.',
  'agreement_approval.',
  'agreement_change_request.',
  'commitment.',
  'milestone.',
  'evidence.',
  'dispute.',
  'dispute_statement.',
  'payment.',
  'participant.',
  'transaction.insert',
];

function entry(
  id: string,
  type: TimelineEntryType,
  title: string,
  occurredAt: string,
  options: {
    description?: string | null;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
): TimelineEntry {
  return {
    id,
    type,
    title,
    description: options.description ?? null,
    actor_id: options.actorId ?? null,
    occurred_at: occurredAt,
    metadata: options.metadata || {},
  };
}

function humanize(value: string): string {
  return value.replace(/[._]/g, ' ');
}

export function buildTransactionTimeline(input: TimelineInput): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  entries.push(
    entry(
      `transaction:${input.transaction.id}:created`,
      'transaction',
      'Transaction created',
      input.transaction.created_at,
      { actorId: input.transaction.buyer_id }
    )
  );

  const agreementById = new Map(
    input.agreements.map((agreement) => [agreement.id, agreement])
  );

  for (const message of input.messages) {
    entries.push(
      entry(`message:${message.id}`, 'message', 'Message added', message.created_at, {
        description: message.content.slice(0, 500),
        actorId: message.sender_id,
        metadata: { message_id: message.id },
      })
    );
  }

  for (const payment of input.payments) {
    entries.push(
      entry(
        `payment:${payment.id}`,
        'payment',
        `Payment event: ${humanize(payment.event_type)}`,
        payment.created_at,
        {
          description:
            payment.amount != null
              ? `${payment.amount} ${payment.currency || ''}`.trim()
              : null,
          metadata: {
            payment_event_id: payment.id,
            payload_summary: payment.payload_summary || {},
          },
        }
      )
    );
  }

  for (const agreement of input.agreements) {
    entries.push(
      entry(
        `agreement:${agreement.id}:created`,
        'agreement',
        `Deal DNA v${agreement.version} created`,
        agreement.created_at,
        {
          description:
            agreement.source === 'ai'
              ? 'AI-assisted draft — requires review and mutual approval'
              : 'Manual draft — requires mutual approval',
          metadata: {
            agreement_id: agreement.id,
            version: agreement.version,
            status: agreement.status,
          },
        }
      )
    );

    if (agreement.approved_at) {
      entries.push(
        entry(
          `agreement:${agreement.id}:approved`,
          'agreement',
          `Deal DNA v${agreement.version} approved`,
          agreement.approved_at,
          {
            metadata: {
              agreement_id: agreement.id,
              version: agreement.version,
            },
          }
        )
      );
    }
  }

  for (const approval of input.approvals) {
    const agreement = agreementById.get(approval.agreement_id);
    entries.push(
      entry(
        `approval:${approval.id}`,
        'approval',
        agreement
          ? `Deal DNA v${agreement.version}: ${humanize(approval.decision)}`
          : `Agreement decision: ${humanize(approval.decision)}`,
        approval.decided_at,
        {
          actorId: approval.user_id,
          metadata: {
            agreement_id: approval.agreement_id,
            decision: approval.decision,
          },
        }
      )
    );
  }

  for (const request of input.changeRequests) {
    const agreement = agreementById.get(request.agreement_id);
    entries.push(
      entry(
        `change-request:${request.id}:created`,
        'change_request',
        agreement
          ? `Change requested on Deal DNA v${agreement.version}`
          : 'Agreement change requested',
        request.created_at,
        {
          description: request.description,
          metadata: { change_request_id: request.id },
        }
      )
    );

    if (request.resolved_at) {
      entries.push(
        entry(
          `change-request:${request.id}:resolved`,
          'change_request',
          `Change request ${humanize(request.status)}`,
          request.resolved_at,
          { metadata: { change_request_id: request.id } }
        )
      );
    }
  }

  for (const commitment of input.commitments) {
    entries.push(
      entry(
        `commitment:${commitment.id}:created`,
        'commitment',
        'Commitment created',
        commitment.created_at,
        {
          description: commitment.description,
          actorId: commitment.owner_id,
          metadata: { commitment_id: commitment.id },
        }
      )
    );

    if (commitment.completed_at) {
      entries.push(
        entry(
          `commitment:${commitment.id}:completed`,
          'commitment',
          'Commitment completed',
          commitment.completed_at,
          {
            description: commitment.description,
            actorId: commitment.owner_id,
            metadata: { commitment_id: commitment.id },
          }
        )
      );
    }
  }

  for (const milestone of input.milestones) {
    entries.push(
      entry(
        `milestone:${milestone.id}:created`,
        'milestone',
        `Milestone added: ${milestone.title}`,
        milestone.created_at,
        {
          description: `${milestone.amount} ${milestone.currency}`,
          metadata: {
            milestone_id: milestone.id,
            status: milestone.status,
          },
        }
      )
    );

    if (milestone.paid_at) {
      entries.push(
        entry(
          `milestone:${milestone.id}:paid`,
          'milestone',
          `Milestone paid: ${milestone.title}`,
          milestone.paid_at,
          {
            description: `${milestone.amount} ${milestone.currency}`,
            metadata: { milestone_id: milestone.id },
          }
        )
      );
    }
  }

  for (const item of input.evidence) {
    entries.push(
      entry(
        `evidence:${item.id}`,
        'evidence',
        `Evidence uploaded: ${item.file_name}`,
        item.created_at,
        {
          description: item.kind ? `${humanize(item.kind)} evidence` : null,
          actorId: item.uploaded_by,
          metadata: { attachment_id: item.id },
        }
      )
    );
  }

  for (const dispute of input.disputes) {
    entries.push(
      entry(
        `dispute:${dispute.id}:opened`,
        'dispute',
        'Dispute opened',
        dispute.created_at,
        {
          description: dispute.reason,
          metadata: {
            dispute_id: dispute.id,
            status: dispute.status,
          },
        }
      )
    );

    if (dispute.resolved_at) {
      entries.push(
        entry(
          `dispute:${dispute.id}:resolved`,
          'dispute',
          'Dispute resolved',
          dispute.resolved_at,
          { metadata: { dispute_id: dispute.id } }
        )
      );
    }
  }

  for (const statement of input.statements) {
    entries.push(
      entry(
        `statement:${statement.id}`,
        'statement',
        'Party statement submitted',
        statement.created_at,
        {
          actorId: statement.author_id,
          metadata: { statement_id: statement.id },
        }
      )
    );
  }

  for (const participant of input.participants) {
    entries.push(
      entry(
        `participant:${participant.user_id}:joined`,
        'participant',
        `${humanize(participant.role)} joined the transaction`,
        participant.joined_at || input.transaction.created_at,
        {
          actorId: participant.user_id,
          metadata: {
            user_id: participant.user_id,
            role: participant.role,
          },
        }
      )
    );
  }

  for (const audit of input.audits) {
    if (DOMAIN_AUDIT_PREFIXES.some((prefix) => audit.event_type.startsWith(prefix))) {
      continue;
    }

    entries.push(
      entry(
        `audit:${audit.id}`,
        'audit',
        humanize(audit.event_type),
        audit.created_at,
        {
          actorId: audit.actor_id,
          metadata: audit.metadata,
        }
      )
    );
  }

  const transactionCreatedId = `transaction:${input.transaction.id}:created`;

  return entries.sort((a, b) => {
    const timeDiff = Date.parse(a.occurred_at) - Date.parse(b.occurred_at);
    if (timeDiff !== 0) return timeDiff;
    // The transaction must open the timeline when participants are recorded
    // at the same timestamp (for example, the buyer's auto-created row).
    if (a.id === transactionCreatedId) return -1;
    if (b.id === transactionCreatedId) return 1;
    return a.id.localeCompare(b.id);
  });
}

import type {
  DemoAgreement,
  DemoTransaction,
  DemoTransactionStatus,
  AgreementApprovalStatus,
  ChatMessage,
  TimelineEvent,
  PromiseItem,
} from '@/lib/demo/types';
import type { Transaction, TransactionWithDetails } from '@/lib/types';

function formatDateLabels(iso: string) {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    return { label: 'Recently', short: 'Recent', time: '12:00 PM' };
  }
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) {
    return { label: `Today, ${time}`, short: time, time };
  }
  if (diffDays === 1) {
    return { label: `Yesterday, ${time}`, short: 'Yesterday', time };
  }
  const dateLabel = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return { label: `${dateLabel}, ${time}`, short: dateLabel, time };
}

export function mapSupabaseToDemoTransaction(
  tx: Transaction | TransactionWithDetails,
  currentUserId?: string
): DemoTransaction {
  const isBuyer = currentUserId ? tx.buyer_id === currentUserId : true;
  const direction: 'in' | 'out' = isBuyer ? 'out' : 'in';

  let status: DemoTransactionStatus = 'pending';
  let agreementStatus: AgreementApprovalStatus = 'awaiting';
  let held = 0;
  let released = 0;

  const rawStatus = (tx.status || 'CREATED').toUpperCase();
  const numAmount = Number(tx.amount) || 0;

  switch (rawStatus) {
    case 'CREATED':
    case 'PENDING':
      status = 'pending';
      agreementStatus = 'awaiting';
      held = 0;
      released = 0;
      break;
    case 'APPROVED':
      // Approved = Escrow Funded via PayPal
      status = 'in_progress';
      agreementStatus = 'approved';
      held = numAmount;
      released = 0;
      break;
    case 'COMPLETED':
      status = 'completed';
      agreementStatus = 'approved';
      held = 0;
      released = numAmount;
      break;
    case 'FAILED':
      status = 'disputed';
      agreementStatus = 'partial';
      held = 0;
      released = 0;
      break;
    case 'CANCELLED':
    case 'REFUNDED':
      status = 'cancelled';
      agreementStatus = 'cancelled';
      held = 0;
      released = 0;
      break;
    default:
      status = 'pending';
      agreementStatus = 'none';
  }

  const { label: dateLabel, short: dateShort, time: timeLabel } = formatDateLabels(
    tx.created_at
  );

  const otherProfile = isBuyer ? tx.seller : tx.buyer;
  const counterpartyName =
    otherProfile?.display_name || otherProfile?.email || 'Counterparty';
  const counterpartyId = otherProfile?.id || (isBuyer ? 'rahul' : 'arjun');

  const detailedTx = tx as TransactionWithDetails;

  const messages: ChatMessage[] = (detailedTx.messages || []).map((msg) => {
    const isSystem =
      msg.sender_id === 'system' ||
      msg.content.includes('🔒') ||
      msg.content.includes('🎉') ||
      msg.content.includes('⚠️');
    return {
      id: msg.id,
      authorId: isSystem
        ? 'system'
        : msg.sender_id === currentUserId
          ? 'arjun'
          : 'rahul',
      content: msg.content,
      time: formatDateLabels(msg.created_at).time,
      system: isSystem,
      tone: isSystem ? 'receipt' : 'default',
    };
  });

  const timeline: TimelineEvent[] = [
    {
      id: `tl-create-${tx.id}`,
      label: 'Deal created',
      date: dateLabel,
      state: 'done',
      detail: `Deal initialized by ${isBuyer ? 'buyer' : 'seller'}`,
    },
  ];

  if (rawStatus === 'APPROVED' || rawStatus === 'COMPLETED') {
    timeline.push({
      id: `tl-escrow-${tx.id}`,
      label: 'Escrow funded with PayPal Sandbox',
      date: 'Payment captured into PayTrust escrow',
      state: 'done',
      detail: `${tx.currency} ${numAmount} held in trust`,
    });
  }

  if (rawStatus === 'COMPLETED') {
    timeline.push({
      id: `tl-complete-${tx.id}`,
      label: 'Payment released to seller',
      date: 'Settled',
      state: 'done',
      detail: 'Funds released from escrow',
    });
  } else if (rawStatus === 'APPROVED') {
    timeline.push({
      id: `tl-next-${tx.id}`,
      label: 'Milestone delivery & approval',
      date: 'In progress',
      state: 'current',
      detail: 'Awaiting completion review',
    });
  }

  const promises: PromiseItem[] = [
    {
      id: `pr-1-${tx.id}`,
      label: 'Fund escrow deposit via PayPal Sandbox',
      ownerId: 'arjun',
      ownerLabel: 'Buyer',
      dueLabel: 'Step 1',
      status: rawStatus === 'APPROVED' || rawStatus === 'COMPLETED' ? 'done' : 'current',
    },
    {
      id: `pr-2-${tx.id}`,
      label: 'Deliver agreed scope and work deliverables',
      ownerId: 'rahul',
      ownerLabel: 'Seller',
      dueLabel: 'Step 2',
      status:
        rawStatus === 'COMPLETED'
          ? 'done'
          : rawStatus === 'APPROVED'
            ? 'current'
            : 'upcoming',
    },
    {
      id: `pr-3-${tx.id}`,
      label: 'Review deliverables and release payment',
      ownerId: 'arjun',
      ownerLabel: 'Buyer',
      dueLabel: 'Step 3',
      status: rawStatus === 'COMPLETED' ? 'done' : 'upcoming',
    },
  ];

  const agreement: DemoAgreement = {
    version: 'Deal DNA v1',
    overview: `${tx.title} between ${tx.buyer?.display_name || 'Buyer'} and ${tx.seller?.display_name || 'Seller'}. Payment is protected in PayTrust Escrow until deliverables are confirmed.`,
    paymentAmount: numAmount,
    split: `${tx.currency} ${numAmount}`,
    deadline: 'Mutual milestone agreement',
    deadlineTime: 'Standard completion',
    responsibilities: tx.description || tx.title,
    revisions: 'Two revision cycles included as standard.',
    cancellation: 'Refund available if milestones cannot be completed.',
    approvals: {
      you: rawStatus !== 'CREATED',
      counterparty: rawStatus === 'APPROVED' || rawStatus === 'COMPLETED',
    },
    missing: [],
    tags: ['Escrow Protection', 'PayPal Sandbox', tx.currency],
  };

  const receiptCount = (detailedTx.payment_events || []).length;
  const attachmentCount = (detailedTx.attachments || []).length;

  return {
    id: tx.id,
    title: tx.title,
    counterpartyId,
    direction,
    amount: numAmount,
    currency: tx.currency || 'USD',
    status,
    dateLabel,
    dateShort,
    messageCount: messages.length,
    agreementStatus,
    verified: true,
    purpose: tx.description || tx.title,
    created: dateLabel,
    method: 'PayPal Sandbox Escrow',
    released,
    held,
    messages,
    timeline,
    promises,
    evidence: {
      receipts: receiptCount > 0 ? receiptCount : rawStatus === 'APPROVED' || rawStatus === 'COMPLETED' ? 1 : 0,
      images: 0,
      files: attachmentCount,
    },
    agreement,
    aiInsight: {
      headline:
        rawStatus === 'APPROVED'
          ? 'Funds safely protected in Escrow'
          : rawStatus === 'COMPLETED'
            ? 'Transaction settled successfully'
            : 'Awaiting PayPal Escrow funding',
      body:
        rawStatus === 'APPROVED'
          ? `Deposit of ${tx.currency} ${numAmount} is locked in PayTrust escrow. Buyer can release funds when satisfied.`
          : rawStatus === 'COMPLETED'
            ? 'Both parties confirmed completion. Funds transferred to seller.'
            : 'Buyer must fund the escrow deposit using PayPal Sandbox before seller commences work.',
      conflicts: 'No conflicting terms detected.',
      dispute: 'Zero open disputes.',
    },
  };
}

import { z } from 'zod';

export const currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'] as const;

export const currencySchema = z.enum(currencies);

export const createTransactionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional(),
  amount: z.coerce
    .number()
    .positive('Amount must be positive')
    .max(999999.99, 'Amount is too large'),
  currency: currencySchema,
  seller_email: z.string().trim().email('Valid email required'),
  role: z.enum(['buyer', 'seller']).optional().default('buyer'),
});

export const updateTransactionSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const sendMessageSchema = z.object({
  transaction_id: z.string().uuid(),
  content: z.string().trim().min(1, 'Message cannot be empty').max(5000),
});

export const createPaymentSchema = z.object({
  transaction_id: z.string().uuid(),
});

export const capturePaymentSchema = z.object({
  order_id: z.string().trim().min(1, 'Order ID is required').max(100),
  transaction_id: z.string().uuid(),
});

export const aiSummarizeSchema = z.object({
  transaction_id: z.string().uuid(),
  type: z.enum(['conversation', 'commitments', 'evidence_report', 'missing_evidence']),
});

const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);

const optionalNumber = z
  .number()
  .nullish()
  .transform((value) => value ?? undefined);

export const qrParsedSchema = z.object({
  provider: optionalString,
  recipient: optionalString,
  amount: optionalNumber,
  currency: optionalString,
  reference: optionalString,
  url: z
    .string()
    .url()
    .nullish()
    .transform((value) => value ?? undefined),
  // PayTrust references are not guaranteed to be UUIDs.
  transaction_id: z
    .string()
    .max(200)
    .nullish()
    .transform((value) => value ?? undefined),
});

export const qrPayloadSchema = z.object({
  type: z.enum(['paytrust', 'paypal', 'upi', 'emvco', 'unknown']),
  raw: z.string().min(1).max(4000),
  parsed: qrParsedSchema,
  is_valid: z.boolean(),
  validation_message: optionalString,
});

export const qrGenerateSchema = z.object({
  data: z.string().trim().min(1, 'Data is required').max(2000),
});

export const createDisputeSchema = z.object({
  transaction_id: z.string().uuid(),
  reason: z.string().trim().min(3, 'Reason is required').max(2000),
  report: z.string().trim().max(10000).optional(),
});

export const disputeStatusSchema = z.enum([
  'draft',
  'open',
  'under_review',
  'resolved',
  'closed',
]);

export const signUpSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().trim().min(2, 'Display name is required').max(50),
});

export const signInSchema = z.object({
  email: z.string().trim().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

// ------------------------------------------------------------------
// Blueprint backend: agreements, commitments, milestones, evidence,
// disputes, Trust Passport and AI-assisted workflows.
// ------------------------------------------------------------------

export const uuidSchema = z.string().uuid('Valid ID required');

const dateTimeStringSchema = z
  .string()
  .trim()
  .min(1, 'Date is required')
  .max(100)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Valid date required');

const optionalMoneySchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number()
    .positive('Amount must be positive')
    .max(999999.99, 'Amount is too large')
    .nullable()
);

const agreementTermsShape = {
  purpose: z.string().trim().max(2000).optional().default(''),
  amount: optionalMoneySchema.optional(),
  currency: currencySchema.nullable().optional(),
  deliverables: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .optional()
    .default([]),
  deadline: z.string().trim().max(200).nullable().optional(),
  responsibilities: z
    .array(
      z.object({
        owner: z.string().trim().min(1).max(100),
        description: z.string().trim().min(1).max(1000),
      })
    )
    .max(50)
    .optional()
    .default([]),
  revision_policy: z.string().trim().max(2000).nullable().optional(),
  cancellation_policy: z.string().trim().max(2000).nullable().optional(),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        amount: optionalMoneySchema.optional(),
        due_date: z.string().trim().max(200).nullable().optional(),
      })
    )
    .max(50)
    .optional()
    .default([]),
  open_questions: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .optional()
    .default([]),
  summary: z.string().trim().max(3000).optional(),
  missing_terms: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .optional(),
  uncertainties: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .optional(),
};

export const agreementTermsSchema = z.object(agreementTermsShape).strict();

const extractedAgreementTermsSchema = z.object(agreementTermsShape);

export const dealDnaExtractionSchema = z.object({
  summary: z.string().trim().min(1).max(3000),
  terms: extractedAgreementTermsSchema,
  missing_terms: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .optional()
    .default([]),
  uncertainties: z
    .array(z.string().trim().min(1).max(500))
    .max(50)
    .optional()
    .default([]),
  confidence: z.number().min(0).max(1).optional().default(0.5),
});

export const createAgreementSchema = z
  .object({
    terms: agreementTermsSchema,
  })
  .strict();

export const updateAgreementSchema = createAgreementSchema;

export const approvalDecisionSchema = z.enum([
  'approved',
  'changes_requested',
  'rejected',
]);

export const agreementApprovalSchema = z
  .object({
    decision: approvalDecisionSchema,
    comment: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.decision !== 'approved' &&
      (!value.comment || value.comment.length < 3)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A comment is required when requesting changes or rejecting',
        path: ['comment'],
      });
    }
  });

export const commitmentStatusSchema = z.enum([
  'open',
  'in_progress',
  'completed',
  'overdue',
  'cancelled',
]);

export const createCommitmentSchema = z
  .object({
    owner_id: uuidSchema.optional(),
    description: z.string().trim().min(1, 'Description is required').max(1000),
    due_at: dateTimeStringSchema.nullable().optional(),
    agreement_id: uuidSchema.nullable().optional(),
  })
  .strict();

export const updateCommitmentSchema = z
  .object({
    status: commitmentStatusSchema.optional(),
    description: z.string().trim().min(1).max(1000).optional(),
    due_at: dateTimeStringSchema.nullable().optional(),
    owner_id: uuidSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const milestoneStatusSchema = z.enum([
  'pending',
  'in_progress',
  'submitted',
  'approved',
  'cancelled',
]);

export const createMilestoneSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().trim().max(2000).optional(),
    amount: z.coerce
      .number()
      .positive('Amount must be positive')
      .max(999999.99),
    due_at: dateTimeStringSchema.nullable().optional(),
    position: z.coerce.number().int().min(0).max(1000).optional(),
  })
  .strict();

export const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    amount: z.coerce
      .number()
      .positive('Amount must be positive')
      .max(999999.99)
      .optional(),
    due_at: dateTimeStringSchema.nullable().optional(),
    position: z.coerce.number().int().min(0).max(1000).optional(),
    status: milestoneStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const evidenceKindSchema = z.enum([
  'file',
  'image',
  'receipt',
  'document',
]);

export const evidenceVisibilitySchema = z.enum(['participants', 'private']);

export const evidenceMetadataSchema = z
  .object({
    kind: evidenceKindSchema.optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    visibility: evidenceVisibilitySchema.optional(),
    commitment_id: uuidSchema.nullable().optional(),
    milestone_id: uuidSchema.nullable().optional(),
    supersedes_id: uuidSchema.nullable().optional(),
    version: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const updateEvidenceSchema = evidenceMetadataSchema.refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field is required' }
);

export const createDisputeStatementSchema = z
  .object({
    statement: z
      .string()
      .trim()
      .min(3, 'Statement is required')
      .max(10000),
    evidence_ids: z.array(uuidSchema).max(50).optional().default([]),
  })
  .strict();

export const updateDisputeSchema = z
  .object({
    status: disputeStatusSchema.optional(),
    resolution: z.string().trim().min(3).max(10000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine((value, context) => {
    if (value.status === 'resolved' && !value.resolution) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A resolution is required when resolving a dispute',
        path: ['resolution'],
      });
    }
  });

export const trustPassportUpdateSchema = z
  .object({
    is_public: z.boolean().optional(),
    headline: z.string().trim().max(160).nullable().optional(),
    location: z.string().trim().max(120).nullable().optional(),
    show_completed_deals: z.boolean().optional(),
    show_milestones: z.boolean().optional(),
    show_response_time: z.boolean().optional(),
    show_in_community: z.boolean().optional(),
    show_dispute_history: z.boolean().optional(),
    share_evidence: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const dealDnaRequestSchema = z
  .object({
    transaction_id: uuidSchema,
    source_text: z.string().trim().max(20000).optional(),
  })
  .strict();

export const mediatorRequestSchema = z
  .object({
    dispute_id: uuidSchema,
  })
  .strict();

export const addParticipantSchema = z
  .object({
    email: z.string().trim().email('Valid email required'),
    role: z.literal('witness').optional().default('witness'),
    permission_level: z
      .enum(['full', 'comment', 'view'])
      .optional()
      .default('comment'),
  })
  .strict();

export const simulatePaymentSchema = z
  .object({
    transaction_id: uuidSchema,
    type: z.enum(['release', 'refund', 'milestone_payment']),
    milestone_id: uuidSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === 'milestone_payment' && !value.milestone_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'milestone_id is required for a milestone payment',
        path: ['milestone_id'],
      });
    }
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type AISummarizeInput = z.infer<typeof aiSummarizeSchema>;
export type QRPayloadInput = z.infer<typeof qrPayloadSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type AgreementTermsInput = z.infer<typeof agreementTermsSchema>;
export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type AgreementApprovalInput = z.infer<typeof agreementApprovalSchema>;
export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>;
export type UpdateCommitmentInput = z.infer<typeof updateCommitmentSchema>;
export type CommitmentStatus = z.infer<typeof commitmentStatusSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;
export type EvidenceMetadataInput = z.infer<typeof evidenceMetadataSchema>;
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
export type CreateDisputeStatementInput = z.infer<
  typeof createDisputeStatementSchema
>;
export type UpdateDisputeInput = z.infer<typeof updateDisputeSchema>;
export type TrustPassportUpdateInput = z.infer<
  typeof trustPassportUpdateSchema
>;
export type DealDnaRequestInput = z.infer<typeof dealDnaRequestSchema>;
export type MediatorRequestInput = z.infer<typeof mediatorRequestSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
export type DealDnaExtractionResult = z.infer<
  typeof dealDnaExtractionSchema
>;

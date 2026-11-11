'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createDispute } from '@/actions/disputes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { DisputeStatus, DisputeWithRelations } from '@/lib/types';
import { AlertTriangle, ChevronRight } from 'lucide-react';

interface DisputesClientProps {
  initialDisputes: DisputeWithRelations[];
}

function getDisputeBadgeVariant(status: DisputeStatus) {
  switch (status) {
    case 'open':
      return 'warning' as const;
    case 'resolved':
      return 'success' as const;
    case 'under_review':
    case 'closed':
      return 'secondary' as const;
    default:
      return 'default' as const;
  }
}

export default function DisputesClient({
  initialDisputes,
}: DisputesClientProps) {
  const [disputes, setDisputes] =
    useState<DisputeWithRelations[]>(initialDisputes);
  const [openCreate, setOpenCreate] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('');
  const [report, setReport] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!transactionId.trim() || !reason.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const result = await createDispute({
      transaction_id: transactionId.trim(),
      reason: reason.trim(),
      report: report.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      setDisputes((previous) => [
        { ...result.data, transaction: null, opener: null },
        ...previous,
      ]);
    }

    setOpenCreate(false);
    setTransactionId('');
    setReason('');
    setReport('');
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-blue-600"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Disputes</h1>
        </div>
        <Button onClick={() => setOpenCreate((open) => !open)}>
          <AlertTriangle className="h-4 w-4" /> Open Dispute
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispute Resolution</CardTitle>
          <CardDescription>
            Open, track, and resolve disputes on transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="pb-3 font-medium">Transaction</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Opened By</th>
                  <th className="pb-3 font-medium">Opened</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No disputes yet.
                    </td>
                  </tr>
                ) : (
                  disputes.map((dispute) => (
                    <tr key={dispute.id} className="border-b last:border-0">
                      <td className="py-4">
                        <Link
                          href={`/transactions/${dispute.transaction_id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {dispute.transaction?.title ||
                            `Transaction #${dispute.transaction_id.slice(0, 8)}`}
                        </Link>
                      </td>
                      <td className="py-4 font-medium">
                        {dispute.transaction
                          ? formatCurrency(
                              Number(dispute.transaction.amount),
                              dispute.transaction.currency
                            )
                          : '—'}
                      </td>
                      <td className="py-4">
                        <Badge variant={getDisputeBadgeVariant(dispute.status)}>
                          {dispute.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {dispute.opener?.display_name || '—'}
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {formatRelativeTime(dispute.created_at)}
                      </td>
                      <td className="py-4">
                        <Link
                          href={`/disputes/${dispute.id}`}
                          className="inline-flex items-center text-sm text-blue-600 hover:underline"
                        >
                          View <ChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {openCreate && (
        <Card className="mt-6 max-w-md">
          <CardHeader>
            <CardTitle>Open New Dispute</CardTitle>
            <CardDescription>
              Describe the issue with the transaction.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Input
                label="Transaction ID"
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder="Enter transaction UUID"
                required
              />
              <Input
                label="Reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why are you opening this dispute?"
                required
              />
              <Input
                label="Report (optional)"
                value={report}
                onChange={(event) => setReport(event.target.value)}
                placeholder="Additional details or evidence reference"
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
              >
                Open Dispute
              </Button>
            </CardContent>
          </form>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => setOpenCreate(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

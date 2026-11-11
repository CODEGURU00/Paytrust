'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateDisputeStatus } from '@/actions/disputes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import type { Dispute, DisputeStatus } from '@/lib/types';
import { AlertTriangle, CheckCircle, RefreshCw, Shield } from 'lucide-react';

interface DisputeDetailClientProps {
  disputeId: string;
  initialDispute: Dispute;
}

const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  draft: ['open', 'closed'],
  open: ['under_review', 'resolved', 'closed'],
  under_review: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

function getStatusVariant(status: DisputeStatus) {
  switch (status) {
    case 'resolved':
      return 'success' as const;
    case 'open':
      return 'warning' as const;
    case 'under_review':
    case 'closed':
      return 'secondary' as const;
    default:
      return 'default' as const;
  }
}

export default function DisputeDetailClient({
  disputeId,
  initialDispute,
}: DisputeDetailClientProps) {
  const [status, setStatus] = useState<DisputeStatus>(initialDispute.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = ALLOWED_TRANSITIONS[status];

  async function handleStatusChange(newStatus: DisputeStatus) {
    if (isUpdating) return;

    setError(null);
    setIsUpdating(true);
    const result = await updateDisputeStatus(disputeId, newStatus);
    setIsUpdating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStatus(newStatus);
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/disputes"
          className="text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          &larr; Back to Disputes
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dispute Resolution</CardTitle>
              <Badge variant={getStatusVariant(status)}>
                {status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded border border-blue-100 bg-blue-50 p-4">
              <Shield className="mb-2 h-5 w-5 text-blue-600" />
              <h3 className="mb-1 font-semibold text-gray-900">Dispute Review</h3>
              <p className="text-sm text-blue-800">
                Dispute ID: <span className="font-mono">{disputeId}</span>
              </p>
              <p className="mt-2 text-sm text-gray-700">
                <b>Reason:</b> {initialDispute.reason}
              </p>
              {initialDispute.report && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                  <b>Report:</b> {initialDispute.report}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs uppercase text-gray-500">
                  Current Status
                </span>
                <Badge
                  variant={getStatusVariant(status)}
                  className="mt-1 w-fit"
                >
                  {status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase text-gray-500">
                  Last Updated
                </span>
                <span className="mt-1 text-sm text-gray-600">
                  {formatRelativeTime(initialDispute.updated_at)}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                Resolution Actions
              </h4>

              {nextStatuses.length === 0 ? (
                <p className="text-sm text-gray-500">
                  This dispute is closed. No further actions are available.
                </p>
              ) : (
                <div className="space-y-2">
                  {nextStatuses.includes('open') && (
                    <Button
                      onClick={() => handleStatusChange('open')}
                      variant="outline"
                      disabled={isUpdating}
                      className="w-full"
                    >
                      <AlertTriangle className="h-4 w-4" /> Open Dispute
                    </Button>
                  )}
                  {nextStatuses.includes('under_review') && (
                    <Button
                      onClick={() => handleStatusChange('under_review')}
                      variant="outline"
                      disabled={isUpdating}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4" /> Send for Review
                    </Button>
                  )}
                  {nextStatuses.includes('resolved') && (
                    <Button
                      onClick={() => handleStatusChange('resolved')}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      <CheckCircle className="h-4 w-4" /> Mark Resolved
                    </Button>
                  )}
                  {nextStatuses.includes('closed') && (
                    <Button
                      onClick={() => handleStatusChange('closed')}
                      variant="secondary"
                      disabled={isUpdating}
                      className="w-full"
                    >
                      Close Dispute
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Link
              href="/disputes"
              className="flex items-center text-sm text-gray-600 hover:underline"
            >
              Back to Disputes
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

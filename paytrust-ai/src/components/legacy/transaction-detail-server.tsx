import { getTransactionById } from '@/actions/transactions';
import { createClient } from '@/lib/supabase/server';
import TransactionDetailClient from '@/components/legacy/transaction-detail-client';

export const dynamic = 'force-dynamic';

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TransactionDetailPage({
  params,
  searchParams,
}: TransactionDetailPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const paymentStatus =
    typeof query.payment === 'string' ? query.payment : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-xl font-medium text-red-900">
            Please sign in to view this transaction
          </h2>
        </div>
      </div>
    );
  }

  const { data, error } = await getTransactionById(id);

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <h2 className="text-xl font-medium text-red-900">
            {error || 'Transaction not found'}
          </h2>
          <p className="mt-4 text-sm text-red-700">
            Unable to load this transaction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <TransactionDetailClient
          initialTransaction={data}
          currentUserId={user.id}
          paymentStatus={paymentStatus}
        />
      </main>
    </div>
  );
}

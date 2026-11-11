import DisputeDetailClient from './client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface DisputeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DisputeDetailPage({
  params,
}: DisputeDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-500">Please sign in to view this dispute.</p>
      </div>
    );
  }

  const { data: dispute } = await supabase
    .from('disputes')
    .select('*')
    .eq('id', id)
    .single();

  if (!dispute) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-500">Dispute not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <DisputeDetailClient disputeId={id} initialDispute={dispute} />
      </main>
    </div>
  );
}

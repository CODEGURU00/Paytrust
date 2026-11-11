import { getDisputes } from '@/actions/disputes';
import DisputesClient from './client';

export const dynamic = 'force-dynamic';

export default async function DisputesPage() {
  const { data, error } = await getDisputes();

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-7xl px-4 py-6">
        <DisputesClient initialDisputes={data || []} />
      </main>
    </div>
  );
}

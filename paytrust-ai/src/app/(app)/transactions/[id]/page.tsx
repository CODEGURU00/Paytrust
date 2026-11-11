import { TransactionWorkspace } from '@/components/demo/transaction-workspace';

export const dynamic = 'force-dynamic';

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  return <TransactionWorkspace transactionId={id} />;
}

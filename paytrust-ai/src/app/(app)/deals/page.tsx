'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/components/demo/demo-provider';
import { Loader2 } from 'lucide-react';

export default function DealsIndexPage() {
  const router = useRouter();
  const { transactions } = useDemo();

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      router.replace(`/deals/${transactions[0].id}`);
    } else {
      router.replace('/deals/TX-48213');
    }
  }, [transactions, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas text-center">
      <Loader2 className="h-8 w-8 animate-spin text-cyan" />
      <p className="text-sm text-muted">Opening Deal DNA workspace...</p>
    </div>
  );
}

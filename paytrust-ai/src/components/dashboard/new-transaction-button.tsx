'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreateTransactionDialog } from '@/components/dashboard/create-transaction-dialog';

export function NewTransactionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>New Transaction</Button>
      <CreateTransactionDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

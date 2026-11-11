'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTransaction } from '@/actions/transactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { currencies, createTransactionSchema } from '@/lib/validations';

const currencyOptions = currencies.map((currency) => ({
  value: currency,
  label: currency,
}));

export default function NewTransactionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const input = {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || '') || undefined,
      amount: Number(formData.get('amount')),
      currency: String(formData.get('currency') || 'USD'),
      seller_email: String(formData.get('seller_email') || ''),
    };

    const parsed = createTransactionSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid input');
      setIsLoading(false);
      return;
    }

    const result = await createTransaction(parsed.data);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    if (result.data?.id) {
      router.push(`/transactions/${result.data.id}`);
      router.refresh();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-blue-600"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Transaction</CardTitle>
            <CardDescription>
              Set up a new transaction record with a buyer or seller.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Title"
                name="title"
                placeholder="e.g. Website design project"
                maxLength={200}
                required
              />
              <Input
                label="Description"
                name="description"
                placeholder="Brief description of what is being sold"
                maxLength={1000}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  placeholder="0.00"
                  required
                />
                <Select
                  label="Currency"
                  name="currency"
                  options={currencyOptions}
                  defaultValue="USD"
                />
              </div>
              <Input
                label="Seller Email"
                type="email"
                name="seller_email"
                placeholder="seller@example.com"
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Create Transaction
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-600">
              Transactions start in <b>CREATED</b> status. Payments are processed
              via PayPal.
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

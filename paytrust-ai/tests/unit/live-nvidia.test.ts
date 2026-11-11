import { describe, expect, it } from 'vitest';
import { loadEnvConfig } from '@next/env';
import { generateDealDna, generateSummary, getAiProvider, getConfiguredAiModel } from '@/lib/ai';

loadEnvConfig(process.cwd());

let provider: string | null = null;
try {
  provider = getAiProvider();
} catch {
  provider = null;
}

const transaction = {
  title: 'Logo redesign',
  description: 'Freelance logo work',
  amount: 800,
  currency: 'USD',
  status: 'pending',
};

const messages = [
  {
    content: 'I need the logo redesign done by March 15, budget 800 USD.',
    created_at: '2026-03-01T10:00:00.000Z',
    sender_id: 'buyer',
  },
  {
    content: 'Works for me. Two revision rounds included, 50% upfront.',
    created_at: '2026-03-01T10:05:00.000Z',
    sender_id: 'seller',
  },
  {
    content: 'Deal. Can you send a contract?',
    created_at: '2026-03-01T10:07:00.000Z',
    sender_id: 'buyer',
  },
];

describe.skipIf(provider !== 'nvidia')('live NVIDIA provider', () => {
  it('reports the configured provider', () => {
    expect(getAiProvider()).toBe('nvidia');
    expect(getConfiguredAiModel()).toBe('mistralai/mistral-large-4-1t-a52b');
  });

  it('generates a real summary through the new code path', async () => {
    const summary = await generateSummary('conversation', transaction, messages);
    console.log('\n--- LIVE SUMMARY ---\n' + summary + '\n--- END ---');
    expect(summary.length).toBeGreaterThan(80);
  }, 600_000);

  it('extracts a schema-valid Deal DNA payload through the new code path', async () => {
    const result = await generateDealDna(transaction, messages);
    console.log(
      '\n--- LIVE DEAL DNA ---\n' +
        JSON.stringify(result.extraction, null, 2) +
        '\n--- END ---'
    );
    expect(result.extraction.terms.amount).toBe(800);
    expect(result.extraction.terms.currency).toBe('USD');
  }, 600_000);
});

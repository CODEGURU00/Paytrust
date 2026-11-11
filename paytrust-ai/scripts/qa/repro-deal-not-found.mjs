/*
 * Reproduction for the "Deal not found" report.
 *
 * Creates a deal through the real UI as a signed-in buyer and compares the
 * transaction id in the URL with the id that was actually persisted.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.QA_APP_URL || 'http://localhost:3000';
const EMAIL = 'buyer@paytrust.demo';
const PASSWORD = 'PayTrustDemo123!';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const { createClient } = await import('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

// Sign in
await page.goto(`${BASE}/auth/login`);
await page.getByLabel('Email').fill(EMAIL);
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/dashboard', { timeout: 30000 });
console.log('signed in');

// Create a deal through the UI
await page.goto(`${BASE}/transactions`);
const createDeal = page.getByRole('button', { name: 'Create Deal' }).first();
await createDeal.click();

await page.getByLabel('Amount (INR)').fill('4242');
await page.getByLabel('Title').fill(`REPRO deal ${Date.now()}`);
await page
  .getByLabel('Scope and deliverables')
  .fill('Reproduction of the Deal not found report');
await page
  .getByRole('button', { name: 'Create deal', exact: true })
  .click();

await page.waitForURL(/\/deals\//, { timeout: 30000 });
await page.waitForTimeout(6000);

const url = page.url();
const urlId = url.split('/deals/')[1]?.split('?')[0];
console.log('URL after creating a deal:', url);
console.log('id in URL:', urlId);

const heading = await page.locator('h1').first().textContent().catch(() => null);
console.log('page heading:', JSON.stringify(heading));

// Does the URL id exist in the database?
const { data: byUrlId } = await admin
  .from('transactions')
  .select('id, title, buyer_id')
  .eq('id', urlId || '')
  .maybeSingle();
console.log('DB row for the URL id:', byUrlId ? byUrlId.id : 'NONE');

// What record actually exists for this buyer with this title?
const { data: byTitle } = await admin
  .from('transactions')
  .select('id, title')
  .eq('buyer_id', (await (async () => {
    const { data: u } = await admin.auth.admin.listUsers();
    return u.users.find((x) => x.email === EMAIL)?.id;
  })()) || '')
  .ilike('title', 'REPRO deal%')
  .order('created_at', { ascending: false })
  .limit(3);
console.log('DB rows for the same title:', JSON.stringify(byTitle, null, 2));

// What does the app's own API say?
const apiRes = await page.request.get(`/api/transactions/${urlId}`);
console.log('GET /api/transactions/<urlId> ->', apiRes.status());

const listRes = await page.request.get('/api/transactions');
const listBody = await listRes.json();
const match = (listBody?.data || []).find((t) => (t.title || '').startsWith('REPRO deal'));
console.log('API list id for the same title:', match?.id ?? 'NONE');

console.log('console errors:', consoleErrors.slice(0, 10));

await browser.close();

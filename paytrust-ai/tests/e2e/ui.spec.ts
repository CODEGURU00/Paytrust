import { expect, test, type Page } from '@playwright/test';

/*
 * The seeded transaction id changes every time the demo database is
 * re-seeded, so it is resolved by title through the signed-in session
 * instead of being hardcoded. A stale id made the workspace tests fail
 * with "Record not found" even though the feature worked.
 */
const SEEDED_TRANSACTION_TITLE = 'Demo: Website redesign with escrow';
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

type PageIssue = { type: string; text: string; url: string };

const IGNORED_CONSOLE = [
  'Failed to load resource',
  'Download the React DevTools',
  'net::ERR_',
];

function trackPageIssues(page: Page): PageIssue[] {
  const issues: PageIssue[] = [];

  page.on('pageerror', (error) => {
    issues.push({ type: 'pageerror', text: error.message, url: page.url() });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((ignored) => text.includes(ignored))) return;
    issues.push({ type: 'console', text, url: page.url() });
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() < 500) return;
    if (!url.startsWith('http://localhost:3000')) return;
    issues.push({
      type: 'http-500',
      text: `${response.status()} ${response.request().method()} ${url}`,
      url: page.url(),
    });
  });

  return issues;
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;
    return {
      documentWidth,
      viewportWidth,
      overflowing: documentWidth > viewportWidth + 1,
    };
  });
  expect(
    overflow.overflowing,
    `horizontal overflow: document ${overflow.documentWidth}px > viewport ${overflow.viewportWidth}px`
  ).toBe(false);
}

/**
 * The dev server occasionally stalls while compiling, which can make the
 * Supabase session check time out for a single request. Retry once when the
 * page reports the signed-out boundary so tests measure the workspace, not a
 * transient dev-server hiccup.
 */
async function resolveSeededTransactionId(page: Page): Promise<string> {
  const response = await page.request.get('/api/transactions');
  expect(
    response.status(),
    'the signed-in session could not list transactions'
  ).toBe(200);

  const body = await response.json();
  const transactions = Array.isArray(body?.data) ? body.data : [];
  const match = transactions.find(
    (transaction: { title?: string }) =>
      transaction.title === SEEDED_TRANSACTION_TITLE
  );

  if (!match) {
    throw new Error(
      `Seeded transaction "${SEEDED_TRANSACTION_TITLE}" was not found for the signed-in buyer. Run "npm run seed" to recreate it.`
    );
  }

  return match.id as string;
}

async function openDatabaseWorkspace(page: Page) {
  const transactionId = await resolveSeededTransactionId(page);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`/transactions/${transactionId}`);
    const signedOut = page.getByRole('heading', {
      name: 'Please sign in to view this transaction',
    });
    if (!(await signedOut.isVisible().catch(() => false))) return;
  }
  await expect(
    page.getByRole('heading', {
      name: 'Please sign in to view this transaction',
    })
  ).toHaveCount(0);
}

async function expectHealthyPage(page: Page, title: string | RegExp | null) {
  await expect(page.locator('main')).toBeVisible();
  if (title === null) {
    await expect(page.locator('h1').first()).toBeVisible();
  } else {
    await expect(
      page.getByRole('heading', { name: title, level: 1 }).first()
    ).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

test.describe('anonymous experience', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('demo dashboard is reachable without an account and marked as demo', async ({
    page,
  }) => {
    const issues = trackPageIssues(page);
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBe(200);

    await expect(
      page.getByRole('heading', { name: /Good morning/, level: 1 })
    ).toBeVisible();
    await expect(page.getByText('Demo workspace').first()).toBeVisible();
    await expect(
      page.getByText('All payments are simulated').first()
    ).toBeVisible();
    await expectHealthyPage(page, /Good morning/);
    expect(issues).toEqual([]);
  });

  test('security headers and nonce-based CSP are enforced', async ({
    request,
  }) => {
    const response = await request.get('/dashboard');
    expect(response.status()).toBe(200);

    const headers = response.headers();
    const csp = headers['content-security-policy'] ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toMatch(/'nonce-[^']+'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('anonymous visitor can browse the demo transaction list', async ({
    page,
  }) => {
    await page.goto('/transactions');
    await expectHealthyPage(page, 'Every payment has a story');
  });

  test('login rejects invalid credentials and keeps the user on the page', async ({
    page,
  }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('buyer@paytrust.demo');
    await page.getByLabel('Password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.locator('.text-red-soft').filter({ hasText: /.+/ })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('login page links to password recovery and signup', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/auth/forgot-password'
    );
    await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/auth/signup'
    );
  });
});

const routes: Array<{ path: string; title: string | RegExp | null }> = [
  { path: '/dashboard', title: /Good morning/ },
  { path: '/transactions', title: 'Every payment has a story' },
  { path: '/payments', title: 'Payments' },
  { path: '/payments/send', title: 'Send & request' },
  { path: '/payments/subscriptions', title: 'Subscriptions' },
  { path: '/payments/links', title: 'Payment links' },
  { path: '/payments/split', title: 'Split payments' },
  { path: '/milestones', title: 'Milestones' },
  { path: '/messages', title: 'Messages' },
  { path: '/evidence', title: 'Evidence Vault' },
  { path: '/trust', title: null },
  { path: '/ai', title: 'AI Assistant' },
  { path: '/mediator', title: 'AI Mediator' },
  { path: '/audit', title: 'Audit Timeline' },
  { path: '/analytics', title: 'Business analytics' },
  { path: '/clients', title: 'Client CRM' },
  { path: '/invoices', title: 'Invoices' },
  { path: '/community', title: 'Community' },
  { path: '/settings', title: 'Security & privacy' },
  { path: '/risk', title: 'Risk Radar' },
  { path: '/guardian', title: 'Payment Guardian' },
  { path: '/memory', title: 'Financial Memory' },
  { path: '/support', title: 'Support center' },
];

test.describe('authenticated product routes', () => {
  for (const route of routes) {
    test(`renders ${route.path} without errors or overflow`, async ({ page }) => {
      const issues = trackPageIssues(page);
      const response = await page.goto(route.path);
      expect(response?.status(), `HTTP status for ${route.path}`).toBe(200);
      await expectHealthyPage(page, route.title);
      expect(issues, `page issues on ${route.path}`).toEqual([]);
    });
  }

  test('signed-in identity is shown in the profile menu', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await expect(page.getByText('buyer@paytrust.demo')).toBeVisible();
    await expect(
      page.getByRole('banner').getByText('Verified')
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sign out/ })
    ).toBeVisible();
  });

  test('command palette opens with the keyboard shortcut', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+k');
    await expect(
      page.getByPlaceholder(/Search transactions, people, promises/i)
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.getByPlaceholder(/Search transactions, people, promises/i)
    ).toBeHidden();
  });

  test('seeded UUID transaction renders the real database workspace', async ({
    page,
  }) => {
    const issues = trackPageIssues(page);
    await openDatabaseWorkspace(page);

    await expect(
      page.getByRole('heading', {
        name: 'Demo: Website redesign with escrow',
        level: 1,
      })
    ).toBeVisible();
    // The workspace renders the chat thread as "Conversation".
    await expect(page.getByText('Conversation').first()).toBeVisible();
    await expect(page.getByText('Evidence Vault').first()).toBeVisible();
    await expect(page.getByText('Promise Tracker')).toBeVisible();

    // USD transactions must not be rendered with a rupee symbol.
    await expect(page.getByText('$2,400.00').first()).toBeVisible();
    await expect(page.getByText(/₹/)).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    expect(issues).toEqual([]);
  });

  test('sending a chat message through the UI persists it', async ({ page }) => {
    const marker = `UI QA message ${RUN_ID}`;
    await openDatabaseWorkspace(page);
    await expect(page.getByText('Conversation').first()).toBeVisible();

    // The workspace is a client component: interacting before React has
    // hydrated loses the click and the typed value.
    await page.waitForLoadState('networkidle');

    // The placeholder is dynamic - "Message <first name>…" - so it is
    // matched by shape rather than by a hardcoded string.
    const messageInput = page.getByPlaceholder(/^Message .+/);
    await messageInput.fill(marker);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test('trust passport privacy switches change state in the demo', async ({
    page,
  }) => {
    await page.goto('/trust');
    await expect(page.locator('h1').first()).toBeVisible();

    const privacyButton = page.getByRole('button', { name: /Privacy/i }).first();
    await privacyButton.click();
    await expect(
      page.getByRole('heading', { name: 'Passport privacy' })
    ).toBeVisible();

    const toggle = page.getByRole('switch', {
      name: 'Show response time',
    });
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-checked', before || '');
  });

  /*
   * Regression: a record created from the quick actions used to be published
   * under a client-side placeholder id. The server assigned the real id
   * afterwards, but the link in the address bar kept the placeholder, so a
   * reload asked the server for a row that never existed and the workspace
   * answered "Record not found".
   */
  test('a record created from the quick actions keeps a working link after a reload', async ({
    page,
  }) => {
    const marker = `Record link ${RUN_ID}`;

    await page.goto('/transactions');
    // The list is filled from the server after hydration, so wait for it.
    await expect(
      page.getByRole('link', { name: /Open workspace/ }).first()
    ).toBeVisible();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Send money', exact: true }).click();

    await page.getByLabel('Amount (INR)').fill('4321');
    await page.getByLabel('Title').fill(marker);
    await page.getByLabel('Purpose').fill('The link must survive a reload.');
    await page.getByRole('button', { name: 'Send (simulated)' }).click();

    // The published id is the one the server stored, not a local placeholder.
    await page.waitForURL(/\/transactions\/[0-9a-f-]{36}$/);
    const publishedUrl = page.url();

    await page.reload();
    // The workspace must resolve the record instead of reporting it missing.
    await expect(page.getByText(marker).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Record not found')).toHaveCount(0);
    expect(page.url()).toBe(publishedUrl);
  });
});

test.describe('mobile layout', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('mobile drawer opens and navigates to transactions', async ({ page }) => {
    const issues = trackPageIssues(page);
    await page.goto('/dashboard');
    await expectNoHorizontalOverflow(page);

    // The drawer is opened by a client-side handler, so the click is lost
    // if it happens before React has hydrated.
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation).toBeVisible();

    await navigation.getByRole('link', { name: 'Transactions' }).click();
    await page.waitForURL('**/transactions');
    await expectHealthyPage(page, 'Every payment has a story');
    await expect(
      page.getByRole('navigation', { name: 'Primary navigation' })
    ).toBeHidden();
    expect(issues).toEqual([]);
  });

  test('mobile workspace has no horizontal scroll', async ({ page }) => {
    await openDatabaseWorkspace(page);
    await expect(
      page.getByRole('heading', {
        name: 'Demo: Website redesign with escrow',
        level: 1,
      })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

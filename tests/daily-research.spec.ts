import { test, expect } from '@playwright/test';

test('daily research sweep', async ({ page }) => {
  const url = new URL('https://account-intelligence.lovable.app/');
  url.searchParams.set('emailHook', process.env.EMAIL_HOOK || '');
  if (process.env.SLACK_HOOK) url.searchParams.set('slackHook', process.env.SLACK_HOOK);
  url.searchParams.set('binId', process.env.BIN_ID || '');
  url.searchParams.set('binKey', process.env.BIN_KEY || '');

  await page.goto(url.toString());

  // Wait for research to auto-trigger (3s delay + research time)
  await page.waitForTimeout(10000);

  // Wait for research to complete (spinning icon disappears)
  await page.waitForSelector('text=Updated', { timeout: 240000 });

  // Screenshot for debugging
  await page.screenshot({ path: 'test-results/research-complete.png' });

  console.log('Research complete, alerts should have fired.');
});

import { test, expect } from '@playwright/test';

const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

test('daily research sweep', async ({ page }) => {
    const binId = process.env.BIN_ID || '';
    const binKey = process.env.BIN_KEY || '';
    const forceRun = process.env.FORCE_RUN === 'true';

    // ── 24h skip check (bypassed with FORCE_RUN=true) ──────
    if (!forceRun && binId && binKey) {
        try {
            const res = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
                headers: { "X-Master-Key": binKey },
            });
            if (res.ok) {
                const data = await res.json();
                const lastRefresh = data.record?.lastRefresh;
                if (lastRefresh) {
                    const age = Date.now() - new Date(lastRefresh).getTime();
                    const hoursAgo = (age / (1000 * 60 * 60)).toFixed(1);
                    if (age < REFRESH_INTERVAL_MS) {
                        console.log(`✅ Dashboard was refreshed ${hoursAgo}h ago — skipping research.`);
                        return;
                    }
                    console.log(`⏰ Last refresh was ${hoursAgo}h ago — proceeding with research.`);
                }
            }
        } catch (e) {
            console.warn('jsonbin check failed, proceeding with research:', e);
        }
    } else if (forceRun) {
        console.log('🔧 FORCE_RUN=true — bypassing skip check.');
    }
    // ── End skip check ──────────────────────────────────────

    const url = new URL('https://account-intelligence.lovable.app/');
    url.searchParams.set('emailHook', process.env.EMAIL_HOOK || '');
    if (process.env.SLACK_HOOK) url.searchParams.set('slackHook', process.env.SLACK_HOOK);
    url.searchParams.set('binId', binId);
    url.searchParams.set('binKey', binKey);
    if (forceRun) url.searchParams.set('forceResearch', 'true');

    await page.goto(url.toString());

    // Wait for research to actually start (the "Researching X/Y" text)
    console.log('Waiting for research to start…');
    await page.waitForSelector('text=/Researching \\d+/i', { timeout: 60000 });
    console.log('Research started.');

    // Now wait for research to complete (up to 59 minutes)
    // "Updated" appears only after isResearching flips to false
    await page.waitForSelector('text=/Updated/i', { timeout: 3540000 });
    console.log('Research complete.');

    // Screenshot for debugging
    await page.screenshot({ path: 'test-results/research-complete.png' });

    console.log('Research complete, alerts should have fired.');
});

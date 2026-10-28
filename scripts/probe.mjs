import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { withPreview } from './preview.mjs';

await withPreview(async baseURL => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.addInitScript(() => localStorage.setItem('killersudoku_tutorial_seen', '1'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      if (response.url().startsWith(baseURL) && response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.getByTestId('cell-8-8').waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('gridcell').count(), 81, 'The complete playable board must load');
    assert.equal(await page.getByRole('heading', { name: 'Killer Sudoku', exact: true }).count(), 1);
    assert.deepEqual(errors, [], 'No runtime/HTTP errors');
    console.log('Smoke passed: production app, heading, 81 cells, no runtime/HTTP errors.');
  } finally {
    await browser.close();
  }
});

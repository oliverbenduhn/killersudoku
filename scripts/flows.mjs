import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { withPreview } from './preview.mjs';

// Journeys: entry -> save -> reload; tip -> entry -> undo/redo; game over -> reset;
// completed game -> locked input; parallel windows -> lease recovery; cached app -> offline level switch.
const screenshots = process.env.TEST_SCREENSHOTS_DIR ?? '/tmp/killersudoku-flows';
await mkdir(screenshots, { recursive: true });

await withPreview(async baseURL => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 568 }, { width: 320, height: 800 }, { width: 414, height: 800 }, { width: 768, height: 414 }, { width: 667, height: 375 }]) {
      const name = `${viewport.width}x${viewport.height}`;
      const context = await browser.newContext({ viewport, hasTouch: viewport.width < 768, isMobile: viewport.width < 768 });
      await context.addInitScript(() => {
        localStorage.setItem('killersudoku_tutorial_seen', '1');
        window.__flowShifts = [];
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__flowShifts.push(entry.value);
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const page = await context.newPage();
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      let failed = false;
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const ready = async () => { await page.getByTestId('cell-8-8').waitFor({ state: 'visible' }); };
      const stored = () => page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('localforage');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction('keyvaluepairs').objectStore('keyvaluepairs').get('killersudoku_level-1');
          read.onsuccess = () => { db.close(); resolve(read.result); };
          read.onerror = () => { db.close(); reject(read.error); };
        };
      }));
      const seed = async state => {
        // End the active writer before installing a test fixture in the isolated browser profile.
        await page.goto('about:blank');
        const setup = await context.newPage();
        await setup.goto(new URL('assets/levels/level_1.json', baseURL).href);
        await setup.evaluate(state => new Promise((resolve, reject) => {
          const request = indexedDB.open('localforage');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction('keyvaluepairs', 'readwrite');
            transaction.objectStore('keyvaluepairs').put(state, 'killersudoku_level-1');
            transaction.oncomplete = () => { db.close(); resolve(); };
            transaction.onerror = () => { db.close(); reject(transaction.error); };
          };
        }), state);
        await setup.close();
        await page.goto(baseURL);
        await ready();
      };
      try {
        await page.goto(baseURL);
        await ready();
        await page.waitForFunction(() => document.querySelector('[data-testid="cell-8-8"]')?.getBoundingClientRect().right <= innerWidth);
        await page.getByRole('button', { name: 'Hinweis (3)', exact: true }).click();
        await page.getByRole('button', { name: 'Hinweis (2)', exact: true }).waitFor({ state: 'visible' });
        const first = await stored();
        assert.equal(first.hintsUsed, 1);
        await page.reload(); await ready();
        assert.equal(await page.getByRole('button', { name: 'Hinweis (2)', exact: true }).count(), 1, 'Save survives reload');

        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await page.getByRole('alertdialog').waitFor({ state: 'visible' });
        await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
        assert.equal((await stored()).hintsUsed, 1, 'Cancel preserves progress');
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await page.getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
        await page.getByRole('button', { name: 'Hinweis (3)', exact: true }).waitFor({ state: 'visible' });

        await page.getByTestId('cell-8-8').click();
        await page.keyboard.press('h');
        const toast = page.getByRole('status').filter({ hasText: /Single|45er-Regel/ }).first();
        await toast.waitFor({ state: 'visible' });
        const text = await toast.textContent();
        const digit = Number(text.match(/→ (\d)/)?.[1]);
        assert.ok(digit >= 1 && digit <= 9);
        const selected = page.locator('[role="gridcell"][aria-selected="true"]');
        assert.equal(await selected.count(), 1);
        assert.notEqual(await selected.getAttribute('data-testid'), 'cell-8-8', 'Tip selects its actual target');
        const selectedId = await selected.getAttribute('data-testid');
        await page.keyboard.press(String(digit));
        const valueId = selectedId.replace('cell-', 'value-');
        assert.equal(await page.getByTestId(valueId).textContent(), String(digit));
        await page.keyboard.press('Control+z');
        assert.equal(await page.getByTestId(valueId).textContent(), '');
        assert.equal((await stored()).hintsUsed, 1, 'Undo does not refund a tip');
        await page.keyboard.press('Control+y');
        assert.equal(await page.getByTestId(valueId).textContent(), String(digit));
        await page.keyboard.press('Tab');
        assert.notEqual(await page.evaluate(() => document.activeElement?.getAttribute('role')), 'grid', 'Tab exits the board');

        await page.getByRole('button', { name: 'Tastenkombinationen anzeigen' }).click();
        await page.getByRole('dialog').waitFor({ state: 'visible' });
        await page.keyboard.press('r');
        assert.equal((await stored()).hintsUsed, 1, 'Help does not consume a hint');
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });

        // Every control must be scrollable into the viewport and have a usable touch target.
        for (const label of ['Zahl 9', 'Auswahl löschen', 'Reset', 'Tastenkombinationen anzeigen']) {
          const button = page.getByRole('button', { name: label, exact: true });
          await button.scrollIntoViewIfNeeded();
          const rect = await button.boundingBox();
          assert.ok(rect && rect.width >= 44 && rect.height >= 44, `${label}: touch target`);
          assert.ok(rect.x >= -1 && rect.x + rect.width <= viewport.width + 1 && rect.y >= -1 && rect.y < viewport.height, `${label}: reachable`);
        }
        assert.deepEqual(errors, []);
        const cls = await page.evaluate(() => window.__flowShifts.reduce((sum, shift) => sum + shift, 0));
        assert.ok(cls < 0.25, `Layout shift ${cls}`);
        await page.screenshot({ path: `${screenshots}/${name}-journey.png` });
        console.log(`PASS ${name}: save/reload, reset/cancel, tip/entry/undo/redo, dialog isolation, Tab exit, touch targets; CLS=${cls.toFixed(3)}`);

        if (viewport.width === 1280) {
          const other = await context.newPage();
          await other.goto(baseURL);
          await other.getByText(/bereits in einem anderen Fenster/).waitFor({ state: 'visible' });
          await other.close();
          const level = await (await page.request.get(new URL('assets/levels/level_1.json', baseURL).href)).json();
          const notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
          await seed({ id: 'over-fixture', cellValues: level.initialValues, notes, mistakesUsed: 3, hintsUsed: 0, gameOver: true, startTime: Date.now(), elapsedTime: 0 });
          await page.getByRole('heading', { name: 'Game Over', exact: true }).waitFor({ state: 'visible' });
          await page.keyboard.press('h');
          assert.equal((await stored()).hintsUsed, 0, 'Game Over blocks keyboard hints');
          await page.getByRole('button', { name: 'Neu starten', exact: true }).click();
          // No player entries: resetting this fixture does not require destructive confirmation.
          await page.getByRole('heading', { name: 'Game Over', exact: true }).waitFor({ state: 'hidden' });
          await page.waitForFunction(() => document.querySelector('[data-board-root]')?.getAttribute('aria-readonly') === 'false');
          // Use the actual timer seam; allow the next interval tick after reset.
          await page.waitForTimeout(2200);
          await page.getByRole('button', { name: 'Hinweis (3)', exact: true }).click();
          assert.ok((await stored()).elapsedTime >= 1000, 'Timer resumes after Game Over/reset');
          await seed({ id: 'solved-fixture', cellValues: level.solution, notes, mistakesUsed: 0, hintsUsed: 0, solved: true, startTime: Date.now(), elapsedTime: 1000 });
          await page.getByTestId('cell-0-0').click({ force: true });
          await page.keyboard.press('Delete');
          assert.deepEqual((await stored()).cellValues, level.solution, 'A completed game is immutable');
          await page.getByRole('button', { name: 'Level', exact: true }).click();
          const solvedButton = page.getByRole('button', { name: 'Level 1, gelöst', exact: true });
          await solvedButton.waitFor({ state: 'visible' });
          assert.match(await solvedButton.textContent(), /1/);
          await solvedButton.click(); await ready();

          await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
          await context.setOffline(true);
          await page.reload(); await ready();
          await page.getByRole('button', { name: 'Level', exact: true }).click();
          await page.getByRole('button', { name: 'Level 2', exact: true }).click(); await ready();
          await page.screenshot({ path: `${screenshots}/${name}-offline-level.png` });
          console.log('PASS desktop: competing window rejected, terminal/reset timer, solved immutability and labels, offline reload and level change');
        }
      } catch (error) {
        failed = true;
        await context.tracing.stop({ path: `${screenshots}/${name}-failure-trace.zip` });
        await page.screenshot({ path: `${screenshots}/${name}-failure.png` }).catch(() => undefined);
        throw error;
      } finally {
        if (!failed) await context.tracing.stop();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
});

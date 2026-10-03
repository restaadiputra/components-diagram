import { expect, test } from '@playwright/test';
import { addComponent, addItem } from './helpers';

test('without IndexedDB a banner warns and the app still works', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });
  await page.goto('/');

  await expect(
    page.getByRole('alert').filter({ hasText: 'Browser storage is unavailable' }),
  ).toBeVisible();
  await addComponent(page, 'Page', { x: 150, y: 200 });
});

test('a failed save is reported and blocks switching diagrams', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('diagram-name').click();
  await page.getByRole('button', { name: 'New diagram' }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new Error('quota exceeded');
    };
  });
  await addComponent(page, 'Page', { x: 150, y: 200 });
  await expect(page.getByTestId('save-status')).toHaveText(
    'Save failed — export to keep your work',
  );

  await page.getByTestId('diagram-name').click();
  const other = page.getByTestId('diagram-row').filter({ hasNot: page.getByText('open now') });
  await other.getByRole('button', { name: 'Open' }).click();

  await expect(
    page.getByRole('status').filter({
      hasText: 'This diagram could not be saved, so it is still open. Export it to keep your work.',
    }),
  ).toBeVisible();
  await expect(page.getByTestId('node-Page')).toBeVisible();
});

test('a file from a newer app version is refused', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'future.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 2 })),
  });

  await expect(
    page.getByRole('status').filter({
      hasText:
        'This diagram was saved by a newer version of the app (format 2). Update the app to open it.',
    }),
  ).toBeVisible();
});

test('incompatible items dim while a connection is dragged', async ({ page }) => {
  await page.goto('/');
  await addComponent(page, 'Page', { x: 230, y: 280 });
  await addComponent(page, 'List', { x: 620, y: 280 });
  await addItem(page, 'Page', { kind: 'state', name: 'cartItems' });
  await addItem(page, 'List', { kind: 'prop', name: 'items' });
  await addItem(page, 'List', { kind: 'effect', name: 'sync' });
  const accepting = page.getByTestId('item-List-items');
  const refusing = page.getByTestId('item-List-sync');

  await page.getByTestId('item-Page-cartItems').locator('.react-flow__handle-right').hover();
  await page.mouse.down();
  await page.mouse.move(400, 500, { steps: 10 });

  await expect(refusing).toHaveClass(/opacity-30/);
  await expect(accepting).not.toHaveClass(/opacity-30/);

  await page.mouse.up();
  await expect(refusing).not.toHaveClass(/opacity-30/);
});

import { expect, test, type Locator, type Page } from '@playwright/test';
import { addComponent, addItem, connect } from './helpers';

/** Page.cartItems (state) is passed as a prop to List.items. */
async function buildCart(page: Page) {
  await page.goto('/');
  await addComponent(page, 'Page', { x: 150, y: 200 });
  await addComponent(page, 'List', { x: 550, y: 200 });
  await addItem(page, 'Page', { kind: 'state', name: 'cartItems' });
  await addItem(page, 'List', { kind: 'prop', name: 'items' });
  await connect(page, page.getByTestId('item-Page-cartItems'), page.getByTestId('item-List-items'));
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
}

test('a diagram survives a reload', async ({ page }) => {
  await buildCart(page);
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  await page.reload();

  await expect(page.getByTestId('item-Page-cartItems')).toBeVisible();
  await expect(page.getByTestId('item-List-items')).toBeVisible();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
});

test('selecting an item traces its data flow', async ({ page }) => {
  await buildCart(page);
  const footer = await addComponent(page, 'Footer', { x: 350, y: 420 });

  await page.getByTestId('item-Page-cartItems').click();

  await expect(page.getByRole('list', { name: 'Trace' })).toContainText(
    'Page.cartItems is passed as prop to List.items',
  );
  await expect(footer).toHaveClass(/opacity-30/);
  await expect(page.getByTestId('node-List')).not.toHaveClass(/opacity-30/);

  await page.keyboard.press('Escape');
  await expect(footer).not.toHaveClass(/opacity-30/);
});

test('undo and redo restore a deleted item and its edge', async ({ page }) => {
  await buildCart(page);
  await page.getByTestId('item-List-items').click();
  await page.keyboard.press('Delete');
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);

  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('item-List-items')).toBeVisible();
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);

  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.react-flow__edge')).toHaveCount(0);
});

test('an exported diagram can be imported as a new one', async ({ page }) => {
  await buildCart(page);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const file = await (await download).path();

  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await (await chooser).setFiles(file);

  await expect(page.getByTestId('item-Page-cartItems')).toBeVisible();
  await page.getByTestId('diagram-name').click();
  await expect(page.getByTestId('diagram-row')).toHaveCount(2);
});

test('an invalid file is rejected with a message', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not json'),
  });

  await expect(
    page.getByRole('status').filter({ hasText: 'This file is not valid JSON.' }),
  ).toBeVisible();
  await page.getByTestId('diagram-name').click();
  await expect(page.getByTestId('diagram-row')).toHaveCount(1);
});

async function position(node: Locator) {
  return node.evaluate(
    (element) => (element.closest('.react-flow__node') as HTMLElement).style.transform,
  );
}

/** Arrow keys only move a node that holds focus; wait for that instead of assuming it. */
async function focusNode(page: Page, name: string) {
  const node = page.getByTestId(`node-${name}`);
  await node.getByText(name, { exact: true }).click();
  await expect(page.locator('.react-flow__node').filter({ has: node })).toBeFocused();
}

test('a keyboard nudge is saved and can be undone', async ({ page }) => {
  await page.goto('/');
  const node = await addComponent(page, 'Page', { x: 150, y: 200 });
  const before = await position(node);

  await focusNode(page, 'Page');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => position(node)).not.toBe(before);
  const nudged = await position(node);
  await expect(page.getByTestId('save-status')).toHaveText('Saved');

  await page.reload();
  await expect.poll(() => position(page.getByTestId('node-Page'))).toBe(nudged);

  // History does not survive a reload, so undo is checked on a second nudge.
  await focusNode(page, 'Page');
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => position(page.getByTestId('node-Page'))).not.toBe(nudged);
  await page.keyboard.press('Control+z');
  await expect.poll(() => position(page.getByTestId('node-Page'))).toBe(nudged);
});

test('a mouse drag is one undo step', async ({ page }) => {
  await page.goto('/');
  const node = await addComponent(page, 'Page', { x: 230, y: 280 });
  const before = await position(node);

  const box = await node.getByText('Page', { exact: true }).boundingBox();
  if (!box) throw new Error('node header has no layout box');
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(box.x + 125, box.y + 65, { steps: 10 });
  await page.mouse.up();
  const moved = await position(node);
  expect(moved).not.toBe(before);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => position(node)).toBe(before);
});

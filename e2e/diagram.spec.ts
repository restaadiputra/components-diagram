import { expect, test, type Locator, type Page } from '@playwright/test';

/** The double-click menu is the dependable way to add a node; Playwright's dragTo does not reliably deliver the HTML5 drop. */
async function addComponent(page: Page, name: string, at: { x: number; y: number }) {
  await page.locator('.react-flow__pane').dblclick({ position: at });
  await page.getByRole('menuitem', { name: /Component/ }).click();
  const node = page.getByTestId('node-Component');
  await node.getByText('Component', { exact: true }).dblclick();
  await node.getByLabel('Name').fill(name);
  await node.getByLabel('Name').press('Enter');
  const renamed = page.getByTestId(`node-${name}`);
  await expect(renamed).toBeVisible();
  return renamed;
}

async function addItem(page: Page, nodeName: string, item: { kind: string; name: string }) {
  const node = page.getByTestId(`node-${nodeName}`);
  const open = node.getByRole('button', { name: '+ add item' });
  if (await open.isVisible()) await open.click();
  await node.getByLabel('Item kind').selectOption(item.kind);
  await node.getByLabel('Item name').fill(item.name);
  await node.getByLabel('Item name').press('Enter');
  await expect(page.getByTestId(`item-${nodeName}-${item.name}`)).toBeVisible();
}

/** React Flow listens for pointer moves, so the drag needs intermediate steps. */
async function connect(page: Page, from: Locator, to: Locator) {
  const source = from.locator('.react-flow__handle-right');
  const target = to.locator('.react-flow__handle-left');
  await source.hover();
  await page.mouse.down();
  const box = await target.boundingBox();
  if (!box) throw new Error('target handle has no layout box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
}

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
  await expect(page.getByTestId('save-status')).toHaveText('Saving…');
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
  await page.getByRole('button', { name: 'Import' }).click();
  await (await chooser).setFiles(file);

  await expect(page.getByTestId('item-Page-cartItems')).toBeVisible();
  await page.getByTestId('diagram-name').click();
  await expect(page.getByTestId('diagram-row')).toHaveCount(2);
});

test('an invalid file is rejected with a message', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import' }).click();
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

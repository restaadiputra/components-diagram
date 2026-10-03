import { expect, type Locator, type Page } from '@playwright/test';

interface NewNode {
  /** The quick-add menu entry, e.g. `Component` or `Query / cache`. */
  menuLabel: string;
  /** Name a fresh node of this kind gets before renaming. */
  defaultName: string;
  name: string;
  at: { x: number; y: number };
}

/** The double-click menu is the dependable way to add a node; Playwright's dragTo does not reliably deliver the HTML5 drop. */
export async function addNode(page: Page, { menuLabel, defaultName, name, at }: NewNode) {
  await page.locator('.react-flow__pane').dblclick({ position: at });
  await page.getByRole('menuitem', { name: menuLabel }).click();
  const node = page.getByTestId(`node-${defaultName}`);
  await node.getByText(defaultName, { exact: true }).dblclick();
  await node.getByLabel('Name').fill(name);
  await node.getByLabel('Name').press('Enter');
  const renamed = page.getByTestId(`node-${name}`);
  await expect(renamed).toBeVisible();
  return renamed;
}

export function addComponent(page: Page, name: string, at: { x: number; y: number }) {
  return addNode(page, { menuLabel: 'Component', defaultName: 'Component', name, at });
}

export async function addItem(page: Page, nodeName: string, item: { kind: string; name: string }) {
  const node = page.getByTestId(`node-${nodeName}`);
  const open = node.getByRole('button', { name: '+ add item' });
  if (await open.isVisible()) await open.click();
  await node.getByLabel('Item kind').selectOption(item.kind);
  await node.getByLabel('Item name').fill(item.name);
  await node.getByLabel('Item name').press('Enter');
  await expect(page.getByTestId(`item-${nodeName}-${item.name}`)).toBeVisible();
}

/** The node's own handles (not an item's) come first in the DOM, so `.first()` picks them. */
export function nodeHandles(node: Locator) {
  return {
    out: node.locator('.react-flow__handle-right').first(),
    in: node.locator('.react-flow__handle-left').first(),
  };
}

/** React Flow listens for pointer moves, so the drag needs intermediate steps. */
export async function connectHandles(page: Page, source: Locator, target: Locator) {
  await source.hover();
  await page.mouse.down();
  const box = await target.boundingBox();
  if (!box) throw new Error('target handle has no layout box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
}

/** Connects one item to another: its right handle to the other's left handle. */
export function connect(page: Page, from: Locator, to: Locator) {
  return connectHandles(
    page,
    from.locator('.react-flow__handle-right'),
    to.locator('.react-flow__handle-left'),
  );
}

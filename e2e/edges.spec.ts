import { expect, test, type Page } from '@playwright/test';
import { addComponent, addItem, addNode, connect, connectHandles, nodeHandles } from './helpers';

/** The edge inspector names the kind of the selected edge. */
async function expectEdgeKinds(page: Page, kinds: string[]) {
  const edges = page.locator('.react-flow__edge');
  await expect(edges).toHaveCount(kinds.length);
  for (const [index, kind] of kinds.entries()) {
    // The click handler sits on the edge group; the curve itself is a thin target.
    await edges.nth(index).dispatchEvent('click');
    await expect(page.getByRole('heading', { name: kind })).toBeVisible();
  }
}

test('a component uses a hook and binds its value', async ({ page }) => {
  await page.goto('/');
  const view = await addComponent(page, 'Page', { x: 230, y: 280 });
  const hook = await addNode(page, {
    menuLabel: 'Hook',
    defaultName: 'useHook',
    name: 'useCart',
    at: { x: 620, y: 280 },
  });
  await addItem(page, 'Page', { kind: 'state', name: 'count' });
  await addItem(page, 'useCart', { kind: 'parameter', name: 'initial' });

  // binds-hook is only allowed once the component is known to use the hook.
  await connectHandles(page, nodeHandles(view).out, nodeHandles(hook).in);
  await connect(
    page,
    page.getByTestId('item-Page-count'),
    page.getByTestId('item-useCart-initial'),
  );

  await expectEdgeKinds(page, ['Uses hook', 'Binds hook value']);
});

test('a component provides a context that another item consumes', async ({ page }) => {
  await page.goto('/');
  const view = await addComponent(page, 'Page', { x: 230, y: 280 });
  const context = await addNode(page, {
    menuLabel: 'Context',
    defaultName: 'Context',
    name: 'Theme',
    at: { x: 620, y: 280 },
  });
  await addItem(page, 'Page', { kind: 'state', name: 'mode' });
  await addItem(page, 'Theme', { kind: 'value', name: 'current' });

  await connectHandles(page, nodeHandles(view).out, nodeHandles(context).in);
  await connect(page, page.getByTestId('item-Theme-current'), page.getByTestId('item-Page-mode'));

  await expectEdgeKinds(page, ['Provides context', 'Consumes']);
});

test('a handler calls a service method', async ({ page }) => {
  await page.goto('/');
  await addComponent(page, 'Page', { x: 230, y: 280 });
  await addNode(page, {
    menuLabel: 'Service',
    defaultName: 'service',
    name: 'api',
    at: { x: 620, y: 280 },
  });
  await addItem(page, 'Page', { kind: 'handler', name: 'onSave' });
  await addItem(page, 'api', { kind: 'method', name: 'save' });

  await connect(page, page.getByTestId('item-Page-onSave'), page.getByTestId('item-api-save'));

  await expectEdgeKinds(page, ['Calls']);
});

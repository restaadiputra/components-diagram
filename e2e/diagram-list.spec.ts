import { expect, test, type Page } from '@playwright/test';
import { addComponent } from './helpers';

async function openList(page: Page) {
  await page.getByTestId('diagram-name').click();
  const dialog = page.getByRole('dialog', { name: 'Diagrams' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Whether the focused element is inside the dialog. */
function focusInside(page: Page) {
  return page.evaluate(
    () => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false,
  );
}

test('Escape closes the dialog and focus returns to its opener', async ({ page }) => {
  await page.goto('/');
  const dialog = await openList(page);
  expect(await focusInside(page)).toBe(true);

  await page.keyboard.press('Escape');

  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('diagram-name')).toBeFocused();
});

test('Tab and Shift+Tab stay inside the dialog', async ({ page }) => {
  await page.goto('/');
  await openList(page);

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await focusInside(page)).toBe(true);
  }
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await focusInside(page)).toBe(true);
  }
});

test('Escape cancels a name edit first, then closes the dialog', async ({ page }) => {
  await page.goto('/');
  const dialog = await openList(page);
  const name = dialog.getByLabel(/^Name/).first();
  const original = await name.inputValue();

  await name.fill('Half typed');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue(original);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('global shortcuts are off while the dialog is open and back after it closes', async ({
  page,
}) => {
  await page.goto('/');
  const node = await addComponent(page, 'Cart', { x: 300, y: 250 });
  await node.click();
  await expect(page.getByTestId('inspector')).toBeVisible();

  const dialog = await openList(page);
  await page.keyboard.press('Delete');
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByTestId('inspector')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('node-Cart')).toBeVisible();
  await expect(page.getByTestId('inspector')).toBeVisible();

  await page.keyboard.press('Delete');
  await expect(page.getByTestId('node-Cart')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('node-Cart')).toBeVisible();
});

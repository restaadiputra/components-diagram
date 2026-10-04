import { expect, test } from '@playwright/test';

/** The real picker needs a native dialog, so the page gets a fake folder handle instead. */
const FAKE_FOLDER = `
  const file = (name, text) => ({ kind: 'file', name, getFile: async () => ({ size: text.length, text: async () => text }) });
  const dir = (name, entries) => ({ kind: 'directory', name, values: async function* () { yield* entries; } });
  window.showDirectoryPicker = async () => dir('shop', [
    dir('src', [
      file('list.tsx', 'export function List() { return <ul />; }'),
      file('app.tsx', "import { List } from './list'; export function App() { return <List />; }"),
    ]),
  ]);
`;

test('importing a project folder opens a laid-out diagram and a summary', async ({ page }) => {
  await page.addInitScript(FAKE_FOLDER);
  await page.goto('/');
  await page.getByTestId('import-project').click();

  const dialog = page.getByRole('dialog', { name: 'Import summary' });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText('shop');
  await dialog.getByRole('button', { name: 'Close' }).click();

  const app = page.getByTestId('node-App');
  const list = page.getByTestId('node-List');
  await expect(app).toBeVisible();
  await expect(list).toBeVisible();
  const [a, l] = [await app.boundingBox(), await list.boundingBox()];
  expect(a && l && Math.abs(a.x - l.x) + Math.abs(a.y - l.y)).toBeGreaterThan(50);
  await expect(page.getByTestId('diagram-name')).toHaveText('shop');
});

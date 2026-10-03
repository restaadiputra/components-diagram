import { expect, test } from '@playwright/test';
import { addComponent } from './helpers';

test('a second tab that is out of date refuses to overwrite the first tab', async ({ context }) => {
  const tabA = await context.newPage();
  await tabA.goto('/');
  await expect(tabA.getByTestId('save-status')).toHaveText('Saved');
  // Opened only after A stored the diagram, so both tabs start from the same record.
  const tabB = await context.newPage();
  await tabB.goto('/');
  await expect(tabB.getByTestId('save-status')).toHaveText('Saved');

  await addComponent(tabA, 'FromA', { x: 150, y: 200 });
  await expect(tabA.getByTestId('save-status')).toHaveText('Saved');

  await addComponent(tabB, 'FromB', { x: 150, y: 200 });
  await expect(tabB.getByTestId('save-status')).toHaveText(
    'Changed in another tab — export to keep your work',
  );
  await expect(
    tabB.getByRole('status').filter({ hasText: 'This tab will not overwrite it' }),
  ).toBeVisible();
  // The conflicted tab keeps its work on screen.
  await expect(tabB.getByTestId('node-FromB')).toBeVisible();

  await tabA.reload();
  await expect(tabA.getByTestId('node-FromA')).toBeVisible();
  await expect(tabA.getByTestId('node-FromB')).toHaveCount(0);
});

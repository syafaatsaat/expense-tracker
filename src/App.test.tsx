import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';
import { createRepository, STORAGE_KEY, type LoadResult } from './storage/repository.ts';
import { makeExpense, makeRoot } from './test/factories.ts';
import { MemoryBackend } from './test/memoryBackend.ts';
import { setDesktop } from './test/viewport.ts';

const TODAY = '2026-11-12';

const root = makeRoot({
  expenses: [
    makeExpense({ date: '2026-11-03', categoryId: 'food', amountCents: 1250 }),
    makeExpense({ date: '2026-11-02', categoryId: 'savings', amountCents: 50000 }),
    makeExpense({ date: '2026-10-20', categoryId: 'transport', amountCents: 3000 }),
  ],
});

/** App with a canned load result, for tests that only read. */
function renderApp(result: LoadResult) {
  const repository = createRepository({ backend: new MemoryBackend() });
  render(<App today={TODAY} repository={repository} loaded={Promise.resolve(result)} />);
  return userEvent.setup();
}

/** App over a real repository on an in-memory backend, for tests that print lines. */
function renderWithStorage() {
  const backend = new MemoryBackend();
  backend.data.set(STORAGE_KEY, JSON.stringify(root));
  const repository = createRepository({ backend });
  render(<App today={TODAY} repository={repository} loaded={repository.load(TODAY)} />);
  return { user: userEvent.setup(), backend };
}

async function printLine(
  user: ReturnType<typeof userEvent.setup>,
  description: string,
  digits: string[],
) {
  await user.type(screen.getByRole('textbox', { name: /new line/i }), description);
  const keypad = within(screen.getByRole('group', { name: 'Amount keypad' }));
  for (const digit of digits) await user.click(keypad.getByRole('button', { name: digit }));
  await user.click(screen.getByRole('button', { name: /^print line/i }));
}

// The header and the receipt footer both print the month's total, so scope total checks.
const header = () => within(screen.getByRole('banner'));

describe('App', () => {
  it('shows the current month and its totals once data has loaded', async () => {
    renderApp({ status: 'ready', root, seeded: false, persistent: true });
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(await header().findByText('S$12.50')).toBeInTheDocument();
    expect(screen.getByText('SAVED 500.00')).toBeInTheDocument();
  });

  it('switches month and recomputes the totals', async () => {
    const user = renderApp({ status: 'ready', root, seeded: false, persistent: true });
    await header().findByText('S$12.50');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('SPENT IN OCT')).toBeInTheDocument();
    expect(header().getByText('S$30.00')).toBeInTheDocument();
    expect(screen.getByText('SAVED 0.00')).toBeInTheDocument();
  });

  it('explains corrupt data without crashing', async () => {
    renderApp({ status: 'corrupt', reason: 'invalid-json', detail: 'bad', raw: 'garbage' });
    expect(
      await screen.findByRole('heading', { name: /can't read your saved lines/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('S$—')).toBeInTheDocument();
  });

  it('warns when changes will not be kept', async () => {
    renderApp({ status: 'ready', root, seeded: true, persistent: false });
    expect(await screen.findByText(/this browser isn't saving changes/i)).toBeInTheDocument();
  });

  it('prints the month on the receipt', async () => {
    renderApp({ status: 'ready', root, seeded: false, persistent: true });
    const receipt = await screen.findByRole('region', { name: 'Receipt, November 2026' });
    expect(receipt).toHaveTextContent('S$12.50');
  });

  it('tears off a past month and goes back to the current one', async () => {
    const user = renderApp({ status: 'ready', root, seeded: false, persistent: true });
    await header().findByText('S$12.50');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('CLOSED')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to nov/i }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.queryByText('CLOSED')).not.toBeInTheDocument();
  });

  it('has a main landmark for the receipt', () => {
    renderApp({ status: 'ready', root, seeded: false, persistent: true });
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  describe('printing a line on a phone', () => {
    it('opens the new-line screen, prints to the receipt and comes back to ADD LINE', async () => {
      const { user, backend } = renderWithStorage();
      await user.click(await screen.findByRole('button', { name: 'ADD LINE' }));
      expect(screen.getByRole('region', { name: 'New line' })).toBeInTheDocument();
      expect(screen.queryByRole('banner')).not.toBeInTheDocument();

      await printLine(user, 'chicken rice', ['5', '8', '0']);

      const receipt = await screen.findByRole('region', { name: 'Receipt, November 2026' });
      const line = within(receipt)
        .getAllByRole('listitem')
        .find((li) => li.textContent?.includes('chicken rice'));
      expect(line).toHaveTextContent(/new line/i);
      expect(header().getByText('S$18.30')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ADD LINE' })).toHaveFocus();
      expect(
        screen.getByText('Printed chicken rice, S$5.80 to the November 2026 receipt.'),
      ).toBeInTheDocument();
      expect(backend.data.get(STORAGE_KEY)).toContain('chicken rice');
    });

    it('jumps to the month a back-dated line printed to', async () => {
      const { user } = renderWithStorage();
      await user.click(await screen.findByRole('button', { name: 'ADD LINE' }));
      await user.click(screen.getByRole('button', { name: /pick date/i }));
      const sheet = within(screen.getByRole('dialog', { name: 'Pick a date' }));
      await user.click(sheet.getByRole('button', { name: 'Previous month' }));
      await user.click(sheet.getByRole('button', { name: /friday 30 october/i }));
      await printLine(user, 'late bill', ['9', '9']);

      const receipt = await screen.findByRole('region', { name: 'Receipt, October 2026' });
      expect(within(receipt).getByText('CLOSED')).toBeInTheDocument();
      expect(within(receipt).getByText('late bill').closest('li')).toHaveTextContent(/new line/i);
      expect(header().getByText('S$30.99')).toBeInTheDocument();
    });

    it('back-fills a past month from its last day', async () => {
      const { user } = renderWithStorage();
      await screen.findByRole('button', { name: 'ADD LINE' });
      await user.click(screen.getByRole('button', { name: 'Previous month' }));
      await user.click(screen.getByRole('button', { name: 'ADD TO OCT' }));
      expect(screen.getAllByText('SAT 31 OCT').length).toBeGreaterThan(0);
    });

    it('returns to ADD LINE on cancel, without printing', async () => {
      const { user, backend } = renderWithStorage();
      await user.click(await screen.findByRole('button', { name: 'ADD LINE' }));
      await user.click(screen.getByRole('button', { name: 'CANCEL' }));
      expect(screen.getByRole('button', { name: 'ADD LINE' })).toHaveFocus();
      expect(backend.writes).toBe(0);
    });

    it('offers no ADD LINE until the data has loaded', () => {
      const repository = createRepository({ backend: new MemoryBackend() });
      render(<App today={TODAY} repository={repository} loaded={new Promise(() => {})} />);
      expect(screen.queryByRole('button', { name: 'ADD LINE' })).not.toBeInTheDocument();
    });
  });

  describe('on a desktop', () => {
    it('keeps the new-line card in its own column beside the receipt', async () => {
      setDesktop(true);
      const { user } = renderWithStorage();
      expect(await screen.findByRole('region', { name: 'New line' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'ADD LINE' })).not.toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();

      await printLine(user, 'kopi', ['1', '8', '0']);
      const receipt = await screen.findByRole('region', { name: 'Receipt, November 2026' });
      expect(within(receipt).getByText('kopi')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /new line/i })).toHaveValue('');
    });
  });
});

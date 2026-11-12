import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';
import type { LoadResult } from './storage/repository.ts';
import { makeExpense, makeRoot } from './test/factories.ts';

const TODAY = '2026-11-12';

const root = makeRoot({
  expenses: [
    makeExpense({ date: '2026-11-03', categoryId: 'food', amountCents: 1250 }),
    makeExpense({ date: '2026-11-02', categoryId: 'savings', amountCents: 50000 }),
    makeExpense({ date: '2026-10-20', categoryId: 'transport', amountCents: 3000 }),
  ],
});

function renderApp(result: LoadResult) {
  render(<App today={TODAY} loaded={Promise.resolve(result)} />);
  return userEvent.setup();
}

describe('App', () => {
  it('shows the current month and its totals once data has loaded', async () => {
    renderApp({ status: 'ready', root, seeded: false, persistent: true });
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(await screen.findByText('S$12.50')).toBeInTheDocument();
    expect(screen.getByText('SAVED 500.00')).toBeInTheDocument();
  });

  it('switches month and recomputes the totals', async () => {
    const user = renderApp({ status: 'ready', root, seeded: false, persistent: true });
    await screen.findByText('S$12.50');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('SPENT IN OCT')).toBeInTheDocument();
    expect(screen.getByText('S$30.00')).toBeInTheDocument();
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

  it('has a main landmark for the receipt', () => {
    renderApp({ status: 'ready', root, seeded: false, persistent: true });
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

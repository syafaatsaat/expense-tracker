import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { MonthKey } from '../domain/types.ts';
import { MonthSwitcher } from './MonthSwitcher.tsx';

function setup(month: MonthKey, currentMonth: MonthKey = '2026-11') {
  const onChange = vi.fn();
  render(<MonthSwitcher month={month} currentMonth={currentMonth} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe('MonthSwitcher', () => {
  it('shows the month as a receipt code and speaks it in full', () => {
    setup('2026-11');
    expect(screen.getByText('NOV 2026')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Month' })).toBeInTheDocument();
  });

  it('goes back one month', async () => {
    const { onChange, user } = setup('2026-11');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenCalledWith('2026-10');
  });

  it('goes back across a year boundary', async () => {
    const { onChange, user } = setup('2026-01');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(onChange).toHaveBeenCalledWith('2025-12');
  });

  it('locks Next on the current month', async () => {
    const { onChange, user } = setup('2026-11');
    const next = screen.getByRole('button', { name: 'Next month' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    await user.click(next);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves forward from a past month', async () => {
    const { onChange, user } = setup('2026-10');
    const next = screen.getByRole('button', { name: 'Next month' });
    expect(next).not.toHaveAttribute('aria-disabled');
    await user.click(next);
    expect(onChange).toHaveBeenCalledWith('2026-11');
  });

  it('works from the keyboard with Enter and Space', async () => {
    const { onChange, user } = setup('2026-09');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Previous month' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    await user.keyboard(' ');
    expect(onChange.mock.calls).toEqual([['2026-08'], ['2026-10']]);
  });

  it('keeps focus on Next when it reaches the current month', async () => {
    function Stateful() {
      const [month, setMonth] = useState<MonthKey>('2026-10');
      return <MonthSwitcher month={month} currentMonth="2026-11" onChange={setMonth} />;
    }
    render(<Stateful />);
    const user = userEvent.setup();
    const next = screen.getByRole('button', { name: 'Next month' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute('aria-disabled', 'true');
  });
});

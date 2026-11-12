import { render, screen } from '@testing-library/react';
import { Header } from './Header.tsx';

const noop = () => undefined;

describe('Header', () => {
  it('shows the logo as the page heading', () => {
    render(<Header month="2026-11" currentMonth="2026-11" onMonthChange={noop} totals={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'TILL' })).toBeInTheDocument();
  });

  it('shows spent and saved for the current month', () => {
    render(
      <Header
        month="2026-11"
        currentMonth="2026-11"
        onMonthChange={noop}
        totals={{ spentCents: 219438, savedCents: 50000 }}
      />,
    );
    expect(screen.getByText('SPENT THIS MONTH')).toBeInTheDocument();
    expect(screen.getByText('S$2,194.38')).toBeInTheDocument();
    expect(screen.getByText('SAVED 500.00')).toBeInTheDocument();
  });

  it('names a past month in the label', () => {
    render(
      <Header
        month="2026-10"
        currentMonth="2026-11"
        onMonthChange={noop}
        totals={{ spentCents: 259065, savedCents: 0 }}
      />,
    );
    expect(screen.getByText('SPENT IN OCT')).toBeInTheDocument();
    expect(screen.getByText('S$2,590.65')).toBeInTheDocument();
    expect(screen.getByText('SAVED 0.00')).toBeInTheDocument();
  });

  it('shows placeholders until totals are known', () => {
    render(<Header month="2026-11" currentMonth="2026-11" onMonthChange={noop} totals={null} />);
    expect(screen.getByText('S$—')).toBeInTheDocument();
    expect(screen.getByText('SAVED —')).toBeInTheDocument();
  });
});

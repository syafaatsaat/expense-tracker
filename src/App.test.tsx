import { render, screen } from '@testing-library/react';
import App from './App.tsx';

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Expense Tracker' })).toBeInTheDocument();
  });
});

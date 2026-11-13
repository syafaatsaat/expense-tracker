import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Keycap } from './Keycap.tsx';

describe('Keycap', () => {
  it('is a real button that clicks', async () => {
    const onClick = vi.fn();
    render(
      <Keycap variant="paper" onClick={onClick}>
        PRINT
      </Keycap>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'PRINT' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reports a toggle state with aria-pressed, and none for plain buttons', () => {
    render(
      <>
        <Keycap variant="selected" pressed>
          FOOD
        </Keycap>
        <Keycap variant="paper" pressed={false}>
          HOUSING
        </Keycap>
        <Keycap variant="ink">ADD LINE</Keycap>
      </>,
    );
    expect(screen.getByRole('button', { name: 'FOOD' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'HOUSING' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'ADD LINE' })).not.toHaveAttribute('aria-pressed');
  });

  it('stays focusable when disabled but ignores clicks', async () => {
    const onClick = vi.fn();
    render(
      <Keycap variant="paper" disabled onClick={onClick}>
        FIX 1 ERROR TO PRINT
      </Keycap>,
    );
    const button = screen.getByRole('button', { name: 'FIX 1 ERROR TO PRINT' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeEnabled();
    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.click(button);
    await userEvent.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not submit forms by default', () => {
    render(<Keycap variant="key">7</Keycap>);
    expect(screen.getByRole('button', { name: '7' })).toHaveAttribute('type', 'button');
  });
});

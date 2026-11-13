import type { ComponentPropsWithRef, MouseEvent } from 'react';

/**
 * Face, side and outline colours.
 * - `paper`: paper face (date keys, PRINT, unselected departments).
 * - `key`: dark number-key face (keypad, unselected date keys).
 * - `ink`: ink face (ADD LINE, BACK TO TODAY).
 * - `selected`: ink face with the red outline of a chosen department or day.
 * - `danger`: red face (DISCARD, VOID).
 */
export type KeycapVariant = 'paper' | 'key' | 'ink' | 'selected' | 'danger';

const VARIANTS: Record<KeycapVariant, string> = {
  paper: 'bg-paper text-ink [--bd:var(--color-ink-edge)] [--side:var(--color-paper-side)]',
  key: 'bg-key text-light [--bd:var(--color-ink-edge)] [--side:var(--color-ink-deep)]',
  ink: 'bg-ink text-light [--bd:var(--color-ink-edge)] [--side:var(--color-ink-deep)]',
  selected: 'bg-ink text-light [--bd:var(--color-red)] [--side:var(--color-ink-edge)]',
  danger: 'bg-red text-light [--bd:var(--color-ink-edge)] [--side:var(--color-danger-side)]',
};

const DISABLED = 'bg-disabled text-disabled-ink';

interface KeycapProps extends Omit<ComponentPropsWithRef<'button'>, 'disabled'> {
  variant: KeycapVariant;
  /** For toggles: sets aria-pressed, and a pressed key stays down. */
  pressed?: boolean;
  /**
   * Shown flat and grey with aria-disabled, so it stays focusable and can explain itself.
   * Clicks are ignored.
   */
  disabled?: boolean;
}

/** Every real button in the Till look. Touch targets stay at least 44px tall. */
export function Keycap({
  variant,
  pressed,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}: KeycapProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      type={type}
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      className={`keycap min-h-11 ${disabled ? DISABLED : VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

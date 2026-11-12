import type { ComponentPropsWithoutRef } from 'react';

/** Ink panel with a 3px ink-deep border and a hard shadow. */
export function DarkCard({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={`dark-card ${className}`} {...props} />;
}

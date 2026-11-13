import type { ReactNode } from 'react';

/** Red Silkscreen stamp with a 2px red border (CLOSED, VOID). */
export function Stamp({ children }: { children: ReactNode }) {
  return (
    <span className="px-1.5 font-pixel text-pixel-8 font-bold text-red shadow-[0_-2px_0_0_var(--color-red),0_2px_0_0_var(--color-red),-2px_0_0_0_var(--color-red),2px_0_0_0_var(--color-red)]">
      {children}
    </span>
  );
}

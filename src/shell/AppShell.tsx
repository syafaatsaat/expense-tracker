import type { ReactNode } from 'react';

interface AppShellProps {
  header: ReactNode;
  /** Notices under the header, e.g. storage warnings. */
  notice?: ReactNode;
  /** The entry column (new-line card on desktop). Omitted until that phase. */
  entry?: ReactNode;
  receipt: ReactNode;
  /** Chart and category shares. Omitted until that phase. */
  side?: ReactNode;
  /** The phone's ADD LINE button, fixed to the bottom of the screen. */
  action?: ReactNode;
}

/**
 * The desk and the responsive grid. One column up to 1024px wide; two columns
 * (entry, receipt) from 1024px with the side panel under the entry column; three
 * columns from 1280px, as on the desktop canvas.
 */
export function AppShell({ header, notice, entry, receipt, side, action }: AppShellProps) {
  return (
    <div className="desk min-h-dvh">
      <a
        href="#receipt"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-ink focus:px-3 focus:py-2 focus:font-pixel focus:text-pixel-8 focus:text-light"
      >
        Skip to receipt
      </a>
      <div
        className={`mx-auto grid max-w-[560px] grid-cols-1 gap-[18px] px-[15px] pt-4 ${action ? 'pb-32' : 'pb-10'} lg:max-w-[1220px] lg:grid-cols-[minmax(320px,380px)_minmax(420px,1fr)] lg:gap-8 lg:px-6 lg:pt-7 xl:grid-cols-[minmax(320px,380px)_minmax(420px,1fr)_minmax(300px,340px)]`}
      >
        <div className="flex min-w-0 flex-col gap-[22px] lg:col-start-1 lg:row-start-1">
          {header}
          {notice}
          {entry}
        </div>
        <main
          id="receipt"
          tabIndex={-1}
          className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 xl:row-span-1"
        >
          {receipt}
        </main>
        {side ? (
          <aside
            aria-label="Month summary"
            className="min-w-0 lg:col-start-1 lg:row-start-2 xl:col-start-3 xl:row-start-1"
          >
            {side}
          </aside>
        ) : null}
      </div>
      {action ? (
        <div className="fixed inset-x-0 bottom-0 z-20 px-[15px] pb-[18px]">
          <div className="mx-auto max-w-[530px]">{action}</div>
        </div>
      ) : null}
    </div>
  );
}

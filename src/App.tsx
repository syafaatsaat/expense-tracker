import { useEffect, useMemo, useState } from 'react';
import { filterExpenses } from './domain/filters.ts';
import { summarize } from './domain/totals.ts';
import type { LocalDate, MonthKey } from './domain/types.ts';
import { monthKey } from './lib/dates.ts';
import { AppShell } from './shell/AppShell.tsx';
import { Header } from './shell/Header.tsx';
import type { LoadResult } from './storage/repository.ts';

interface AppProps {
  /** Today's local date, read from the clock once at startup (main.tsx). */
  today: LocalDate;
  /** The repository load, started before render so it runs exactly once. */
  loaded: Promise<LoadResult>;
}

type Data = { status: 'loading' } | LoadResult | { status: 'failed' };

export default function App({ today, loaded }: AppProps) {
  const currentMonth = monthKey(today);
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const [data, setData] = useState<Data>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    loaded.then(
      (result) => live && setData(result),
      () => live && setData({ status: 'failed' }),
    );
    return () => {
      live = false;
    };
  }, [loaded]);

  const totals = useMemo(() => {
    if (data.status !== 'ready') return null;
    const { spentCents, savedCents } = summarize(filterExpenses(data.root.expenses, { month }));
    return { spentCents, savedCents };
  }, [data, month]);

  const unreadable = data.status === 'corrupt' || data.status === 'failed';

  return (
    <AppShell
      header={
        <Header
          month={month}
          currentMonth={currentMonth}
          onMonthChange={setMonth}
          totals={totals}
        />
      }
      notice={
        // Light text, not olive: olive on the desk is 4.1:1, under AA.
        data.status === 'ready' && !data.persistent ? (
          <p className="font-pixel text-pixel-8 leading-4 text-light">
            This browser isn&apos;t saving changes. They&apos;ll be lost when you close the tab.
          </p>
        ) : null
      }
      receipt={
        <>
          {/* Printer slot: the receipt feeds out of here in the next phase. */}
          <div className="relative z-10 -mx-[3px] h-2 bg-ink-deep" />
          {unreadable ? (
            <section className="paper hard-shadow mx-[7px] flex flex-col gap-2 px-4 pt-[18px] pb-4">
              <h2 className="font-pixel text-pixel-16 text-red">
                Can&apos;t read your saved lines
              </h2>
              <p className="text-line">
                The data in this browser couldn&apos;t be loaded. Nothing has been changed or
                deleted.
              </p>
            </section>
          ) : null}
        </>
      }
    />
  );
}

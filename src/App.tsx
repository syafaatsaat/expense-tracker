import { useEffect, useMemo, useRef, useState } from 'react';
import { filterExpenses } from './domain/filters.ts';
import { lineDescription } from './domain/receipt.ts';
import { summarize } from './domain/totals.ts';
import type { LocalDate, MonthKey } from './domain/types.ts';
import { NewLine } from './entry/NewLine.tsx';
import { formatMonthLong, lastDayOfMonth, monthCode, monthKey } from './lib/dates.ts';
import { formatCents } from './lib/money.ts';
import { DESKTOP_QUERY, useMediaQuery } from './lib/useMediaQuery.ts';
import { Receipt } from './receipt/Receipt.tsx';
import { AppShell } from './shell/AppShell.tsx';
import { Header } from './shell/Header.tsx';
import type { ExpenseInput, LoadResult, Repository } from './storage/repository.ts';
import { Keycap } from './ui/Keycap.tsx';
import { PixelIcon } from './ui/PixelIcon.tsx';
import { TallText } from './ui/TallText.tsx';

interface AppProps {
  /** Today's local date, read from the clock once at startup (main.tsx). */
  today: LocalDate;
  /** Where printed lines are saved. */
  repository: Repository;
  /** The repository load, started before render so it runs exactly once. */
  loaded: Promise<LoadResult>;
}

type Data = { status: 'loading' } | LoadResult | { status: 'failed' };

export default function App({ today, repository, loaded }: AppProps) {
  const currentMonth = monthKey(today);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const [month, setMonth] = useState<MonthKey>(currentMonth);
  const [data, setData] = useState<Data>({ status: 'loading' });
  // On a phone the new-line card is a screen of its own; on a desktop it's a column.
  const [view, setView] = useState<'home' | 'entry'>('home');
  // The line just printed, highlighted until the next action.
  const [fresh, setFresh] = useState<{ id: string; n: number } | null>(null);
  const prints = useRef(0);
  const [announcement, setAnnouncement] = useState('');
  const addLineRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

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

  // Back on the receipt after printing or cancelling, focus returns to ADD LINE.
  useEffect(() => {
    if (view === 'home' && returnFocus.current) {
      returnFocus.current = false;
      addLineRef.current?.focus();
    }
  }, [view]);

  const monthLines = useMemo(
    () => (data.status === 'ready' ? filterExpenses(data.root.expenses, { month }) : null),
    [data, month],
  );

  const totals = useMemo(() => {
    if (!monthLines) return null;
    const { spentCents, savedCents } = summarize(monthLines);
    return { spentCents, savedCents };
  }, [monthLines]);

  const unreadable = data.status === 'corrupt' || data.status === 'failed';
  const ready = data.status === 'ready';

  const changeMonth = (next: MonthKey) => {
    setMonth(next);
    setFresh(null);
  };

  const printLine = async (input: ExpenseInput) => {
    const result = await repository.addExpense(input);
    if (!result.ok) return result;
    const line = result.value;
    setData((prev) =>
      prev.status === 'ready'
        ? { ...prev, root: { ...prev.root, expenses: [...prev.root.expenses, line] } }
        : prev,
    );
    // A line dated in another month prints to that month's receipt, so show it there.
    const printedTo = monthKey(line.date);
    setMonth(printedTo);
    prints.current += 1;
    setFresh({ id: line.id, n: prints.current });
    setAnnouncement(
      `Printed ${lineDescription(line)}, ${formatCents(line.amountCents)} to the ${formatMonthLong(printedTo)} receipt.`,
    );
    if (view === 'entry') {
      returnFocus.current = true;
      setView('home');
    }
    return result;
  };

  const openEntry = () => {
    setFresh(null);
    setView('entry');
  };

  const closeEntry = () => {
    returnFocus.current = true;
    setView('home');
  };

  // Back-filling a past month starts on its last day; otherwise today.
  const entryDate: LocalDate = month < currentMonth ? lastDayOfMonth(month) : today;

  const status = (
    <p role="status" className="sr-only">
      {announcement}
    </p>
  );

  if (ready && view === 'entry' && !desktop) {
    return (
      <>
        <div className="desk min-h-dvh">
          <div className="mx-auto max-w-[560px]">
            <NewLine
              today={today}
              initialDate={entryDate}
              layout="screen"
              onPrint={printLine}
              onCancel={closeEntry}
            />
          </div>
        </div>
        {status}
      </>
    );
  }

  return (
    <>
      <AppShell
        header={
          <Header
            month={month}
            currentMonth={currentMonth}
            onMonthChange={changeMonth}
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
        entry={
          ready && desktop ? (
            <NewLine today={today} initialDate={today} layout="column" onPrint={printLine} />
          ) : undefined
        }
        receipt={
          monthLines && totals ? (
            <Receipt
              key={month}
              month={month}
              currentMonth={currentMonth}
              expenses={monthLines}
              totals={totals}
              onBackToCurrent={() => changeMonth(currentMonth)}
              fresh={fresh}
            />
          ) : (
            <>
              {/* Printer slot, empty until the data has loaded. */}
              <div aria-hidden="true" className="relative z-10 -mx-[3px] h-2 bg-ink-deep" />
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
          )
        }
        action={
          ready && !desktop ? (
            <Keycap
              ref={addLineRef}
              variant="ink"
              onClick={openEntry}
              className="mb-[9px] flex h-[54px] w-full items-center justify-center gap-[22px]"
            >
              <PixelIcon name="plus" />
              <TallText sx={2} sy={3}>
                {month < currentMonth ? `ADD TO ${monthCode(month)}` : 'ADD LINE'}
              </TallText>
            </Keycap>
          ) : undefined
        }
      />
      {status}
    </>
  );
}

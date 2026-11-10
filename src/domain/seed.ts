import { addMonths, dateInMonth, monthKey } from '../lib/dates.ts';
import type { CategoryId, Expense, LocalDate, RecurringTemplate } from './types.ts';

// Demo data for a first visit: the current month up to today, plus the two before it,
// dated relative to `today` so the demo never looks stale. Pure and deterministic.

interface Entry {
  day: number;
  categoryId: CategoryId;
  amountCents: number;
  note: string;
}

const EVERY_MONTH: Entry[] = [
  { day: 1, categoryId: 'housing', amountCents: 150000, note: 'Rent' },
  { day: 2, categoryId: 'savings', amountCents: 80000, note: 'Transfer to savings account' },
  { day: 10, categoryId: 'insurance', amountCents: 18500, note: 'Health insurance premium' },
  { day: 15, categoryId: 'debts', amountCents: 35000, note: 'Study loan repayment' },
];

// Index 0 is two months ago, 2 is the current month.
const BY_MONTH: Entry[][] = [
  [
    { day: 3, categoryId: 'food', amountCents: 8620, note: 'Groceries' },
    { day: 4, categoryId: 'transport', amountCents: 3000, note: 'Transit card top-up' },
    { day: 6, categoryId: 'utilities', amountCents: 9860, note: 'Electricity and water' },
    { day: 9, categoryId: 'food', amountCents: 650, note: 'Hawker lunch' },
    { day: 13, categoryId: 'entertainment', amountCents: 2700, note: 'Movie tickets' },
    { day: 18, categoryId: 'healthcare', amountCents: 3500, note: 'GP visit' },
    { day: 20, categoryId: 'food', amountCents: 4800, note: 'Dinner with friends' },
    { day: 22, categoryId: 'personal-care', amountCents: 1800, note: 'Haircut' },
    { day: 26, categoryId: 'savings', amountCents: 50000, note: 'ETF investment' },
    { day: 30, categoryId: 'other', amountCents: 6000, note: 'Birthday gift' },
  ],
  [
    { day: 3, categoryId: 'food', amountCents: 9145, note: 'Groceries' },
    { day: 5, categoryId: 'transport', amountCents: 1850, note: 'Ride to the airport' },
    { day: 6, categoryId: 'utilities', amountCents: 10420, note: 'Electricity and water' },
    { day: 8, categoryId: 'food', amountCents: 420, note: 'Kopi and kaya toast' },
    { day: 11, categoryId: 'transport', amountCents: 3000, note: 'Transit card top-up' },
    { day: 16, categoryId: 'personal-care', amountCents: 4590, note: 'Skincare' },
    { day: 19, categoryId: 'entertainment', amountCents: 12800, note: 'Concert ticket' },
    { day: 23, categoryId: 'food', amountCents: 720, note: 'Hawker dinner' },
    { day: 27, categoryId: 'healthcare', amountCents: 1290, note: 'Pharmacy' },
  ],
  [
    { day: 1, categoryId: 'food', amountCents: 550, note: 'Hawker breakfast' },
    { day: 3, categoryId: 'food', amountCents: 7860, note: 'Groceries' },
    { day: 4, categoryId: 'transport', amountCents: 3000, note: 'Transit card top-up' },
    { day: 6, categoryId: 'utilities', amountCents: 9530, note: 'Electricity and water' },
    { day: 9, categoryId: 'food', amountCents: 680, note: 'Hawker lunch' },
    { day: 14, categoryId: 'entertainment', amountCents: 3200, note: 'Bowling with friends' },
    { day: 21, categoryId: 'other', amountCents: 2500, note: 'Stationery' },
  ],
];

const SUBSCRIPTIONS: (Omit<Entry, 'day'> & { dayOfMonth: number })[] = [
  {
    dayOfMonth: 12,
    categoryId: 'entertainment',
    amountCents: 1798,
    note: 'Streaming subscription',
  },
  { dayOfMonth: 5, categoryId: 'personal-care', amountCents: 12900, note: 'Gym membership' },
  // Day 31 shows the clamp: 30 Nov, 28 Feb, back to 31 in March.
  { dayOfMonth: 31, categoryId: 'utilities', amountCents: 2500, note: 'Mobile plan' },
];

export interface SeedData {
  expenses: Expense[];
  recurring: RecurringTemplate[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function createSeedData(today: LocalDate, newId: () => string): SeedData {
  const months = [-2, -1, 0].map((n) => addMonths(monthKey(today), n));
  const expenses: Expense[] = [];

  const add = (date: LocalDate, entry: Omit<Entry, 'day'>, recurringId?: string) => {
    if (date > today) return;
    // createdAt only orders same-day expenses, so a fixed time per insert is enough.
    const i = expenses.length;
    const createdAt = `${date}T${pad2(Math.floor(i / 60))}:${pad2(i % 60)}:00.000Z`;
    const { categoryId, amountCents, note } = entry;
    expenses.push({
      id: newId(),
      amountCents,
      date,
      categoryId,
      note,
      ...(recurringId === undefined ? {} : { recurringId }),
      createdAt,
    });
  };

  months.forEach((month, index) => {
    for (const entry of [...EVERY_MONTH, ...(BY_MONTH[index] ?? [])]) {
      add(dateInMonth(month, entry.day), entry);
    }
  });

  const recurring = SUBSCRIPTIONS.map((sub): RecurringTemplate => {
    const id = newId();
    const dates = months.map((m) => dateInMonth(m, sub.dayOfMonth)).filter((d) => d <= today);
    for (const d of dates) add(d, sub, id);
    // The oldest month is always before today, so there is at least one date.
    const startDate = dates[0] as LocalDate;
    return {
      id,
      amountCents: sub.amountCents,
      categoryId: sub.categoryId,
      note: sub.note,
      startDate,
      dayOfMonth: sub.dayOfMonth,
      lastGeneratedDate: dates.at(-1) ?? startDate,
      active: true,
    };
  });

  return { expenses, recurring };
}

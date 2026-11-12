import {
  addMonths,
  dateInMonth,
  formatMonthLong,
  formatMonthShort,
  daysInMonth,
  isInMonth,
  isLocalDate,
  isMonthKey,
  monthCode,
  monthKey,
  monthRange,
  toLocalDate,
} from './dates.ts';

describe('toLocalDate', () => {
  // Built from local components, so each case means the same wall-clock time in any TZ.
  // A UTC-based implementation fails the late-evening case west of UTC (New York)
  // and the early-morning case east of UTC (Singapore).
  it('uses the local calendar date late in the evening', () => {
    expect(toLocalDate(new Date(2026, 10, 30, 23, 30))).toBe('2026-11-30');
  });

  it('uses the local calendar date just after midnight', () => {
    expect(toLocalDate(new Date(2026, 11, 1, 0, 15))).toBe('2026-12-01');
  });

  it('handles the last moment of the year', () => {
    expect(toLocalDate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDate(new Date(2027, 0, 5, 12))).toBe('2027-01-05');
  });

  it('throws on an invalid Date', () => {
    expect(() => toLocalDate(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('isLocalDate', () => {
  it.each(['2026-11-05', '2024-02-29', '2026-12-31', '2026-01-01'])('accepts %s', (s) => {
    expect(isLocalDate(s)).toBe(true);
  });

  it.each([
    '2026-02-29', // not a leap year
    '1900-02-29', // century, not a leap year
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-11-00',
    '2026-11-5',
    '26-11-05',
    '2026/11/05',
    '2026-11-05T00:00:00.000Z',
    ' 2026-11-05',
    '',
  ])('rejects %j', (s) => {
    expect(isLocalDate(s)).toBe(false);
  });

  it('accepts 29 Feb in a 400-year leap year', () => {
    expect(isLocalDate('2000-02-29')).toBe(true);
  });
});

describe('monthKey / isMonthKey', () => {
  it('is the first 7 characters of the date', () => {
    expect(monthKey('2026-11-05')).toBe('2026-11');
    expect(monthKey('2026-12-31')).toBe('2026-12');
  });

  it.each(['2026-11', '2026-01', '2026-12'])('accepts %s', (s) => {
    expect(isMonthKey(s)).toBe(true);
  });

  it.each(['2026-13', '2026-00', '2026-1', '2026-11-05', ''])('rejects %j', (s) => {
    expect(isMonthKey(s)).toBe(false);
  });
});

describe('daysInMonth', () => {
  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2024, 2, 29],
    [2000, 2, 29],
    [1900, 2, 28],
    [2026, 4, 30],
    [2026, 12, 31],
  ])('%i-%i has %i days', (year, month, days) => {
    expect(daysInMonth(year, month)).toBe(days);
  });
});

describe('monthRange', () => {
  it.each([
    ['2026-11', '2026-11-01', '2026-11-30'],
    ['2026-02', '2026-02-01', '2026-02-28'],
    ['2028-02', '2028-02-01', '2028-02-29'],
    ['2026-12', '2026-12-01', '2026-12-31'],
  ] as const)('%s spans %s to %s', (key, start, end) => {
    expect(monthRange(key)).toEqual({ start, end });
  });
});

describe('addMonths', () => {
  it.each([
    ['2026-11', 1, '2026-12'],
    ['2026-12', 1, '2027-01'],
    ['2027-01', -1, '2026-12'],
    ['2026-11', -11, '2025-12'],
    ['2026-11', 14, '2028-01'],
    ['2026-11', 0, '2026-11'],
  ] as const)('%s %+i months is %s', (key, n, expected) => {
    expect(addMonths(key, n)).toBe(expected);
  });
});

describe('isInMonth', () => {
  it('includes the first and last day of the month', () => {
    expect(isInMonth('2026-11-01', '2026-11')).toBe(true);
    expect(isInMonth('2026-11-30', '2026-11')).toBe(true);
  });

  it('excludes neighbouring months', () => {
    expect(isInMonth('2026-10-31', '2026-11')).toBe(false);
    expect(isInMonth('2026-12-01', '2026-11')).toBe(false);
    expect(isInMonth('2025-11-15', '2026-11')).toBe(false);
  });
});

describe('dateInMonth', () => {
  it.each([
    ['2026-11', 5, '2026-11-05'],
    ['2026-11', 31, '2026-11-30'],
    ['2026-02', 31, '2026-02-28'],
    ['2028-02', 30, '2028-02-29'],
    ['2026-03', 31, '2026-03-31'],
    ['2026-01', 1, '2026-01-01'],
  ] as const)('%s day %i is %s (clamped to month end)', (key, day, expected) => {
    expect(dateInMonth(key, day)).toBe(expected);
  });

  it.each([0, 32, 1.5, Number.NaN])('rejects day %d', (day) => {
    expect(() => dateInMonth('2026-11', day)).toThrow(RangeError);
  });
});

describe('month labels', () => {
  it.each([
    ['2026-01', 'JAN', 'JAN 2026', 'January 2026'],
    ['2026-09', 'SEP', 'SEP 2026', 'September 2026'],
    ['2026-11', 'NOV', 'NOV 2026', 'November 2026'],
    ['2027-12', 'DEC', 'DEC 2027', 'December 2027'],
  ] as const)('%s is %s / %s / %s', (key, code, short, long) => {
    expect(monthCode(key)).toBe(code);
    expect(formatMonthShort(key)).toBe(short);
    expect(formatMonthLong(key)).toBe(long);
  });
});

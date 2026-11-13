import { makeExpense } from '../test/factories.ts';
import { groupByDay, lineDescription, previewGroups, sortForReceipt } from './receipt.ts';

describe('sortForReceipt', () => {
  it('puts the newest date first', () => {
    const a = makeExpense({ id: 'a', date: '2026-11-01' });
    const b = makeExpense({ id: 'b', date: '2026-11-10' });
    const c = makeExpense({ id: 'c', date: '2026-10-31' });
    expect(sortForReceipt([a, b, c]).map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks same-day ties by creation time, newest first, then by id', () => {
    const early = makeExpense({ id: 'early', createdAt: '2026-11-10T01:00:00.000Z' });
    const late = makeExpense({ id: 'late', createdAt: '2026-11-10T09:00:00.000Z' });
    const twinA = makeExpense({ id: 'twin-a', createdAt: '2026-11-10T05:00:00.000Z' });
    const twinB = makeExpense({ id: 'twin-b', createdAt: '2026-11-10T05:00:00.000Z' });
    const same = { date: '2026-11-10' } as const;
    const sorted = sortForReceipt([early, twinA, late, twinB].map((e) => ({ ...e, ...same }))).map(
      (e) => e.id,
    );
    expect(sorted).toEqual(['late', 'twin-b', 'twin-a', 'early']);
  });

  it('does not mutate its input', () => {
    const input = [makeExpense({ date: '2026-11-01' }), makeExpense({ date: '2026-11-02' })];
    const copy = [...input];
    sortForReceipt(input);
    expect(input).toEqual(copy);
  });
});

describe('groupByDay', () => {
  it('groups consecutive lines by date, keeping order', () => {
    const lines = sortForReceipt([
      makeExpense({ id: 'x', date: '2026-11-10' }),
      makeExpense({ id: 'y', date: '2026-11-09' }),
      makeExpense({ id: 'z', date: '2026-11-10' }),
    ]);
    const groups = groupByDay(lines);
    expect(groups.map((g) => g.date)).toEqual(['2026-11-10', '2026-11-09']);
    expect(groups[0]?.lines.map((e) => e.id).sort()).toEqual(['x', 'z']);
    expect(groups[1]?.lines.map((e) => e.id)).toEqual(['y']);
  });

  it('returns no groups for no lines', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('previewGroups', () => {
  const day = (date: `2026-11-${string}`, n: number) => ({
    date: date as `${number}-${number}-${number}`,
    lines: Array.from({ length: n }, () => makeExpense({ date: date as never })),
  });

  it('shows everything when it fits', () => {
    const groups = [day('2026-11-10', 3), day('2026-11-09', 5)];
    expect(previewGroups(groups, 8)).toEqual({ visible: groups, hiddenCount: 0 });
  });

  it('cuts at whole days and counts the hidden lines', () => {
    const groups = [
      day('2026-11-10', 3),
      day('2026-11-09', 3),
      day('2026-11-08', 3),
      day('2026-11-07', 1),
    ];
    const { visible, hiddenCount } = previewGroups(groups, 8);
    expect(visible.map((g) => g.date)).toEqual(['2026-11-10', '2026-11-09']);
    expect(hiddenCount).toBe(4);
  });

  it('always keeps the first day, even when it alone is over the limit', () => {
    const groups = [day('2026-11-10', 12), day('2026-11-09', 2)];
    const { visible, hiddenCount } = previewGroups(groups, 8);
    expect(visible.map((g) => g.date)).toEqual(['2026-11-10']);
    expect(hiddenCount).toBe(2);
  });

  it('handles no groups', () => {
    expect(previewGroups([], 8)).toEqual({ visible: [], hiddenCount: 0 });
  });
});

describe('lineDescription', () => {
  it('uses the note, trimmed', () => {
    expect(lineDescription(makeExpense({ note: '  Chicken rice ' }))).toBe('Chicken rice');
  });

  it('falls back to the department name when the note is missing or blank', () => {
    expect(lineDescription(makeExpense({ categoryId: 'food', note: undefined }))).toBe(
      'Food & dining',
    );
    expect(lineDescription(makeExpense({ categoryId: 'transport', note: '   ' }))).toBe(
      'Transportation',
    );
  });
});

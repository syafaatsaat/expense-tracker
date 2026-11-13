import {
  AMOUNT_MAX_DIGITS,
  DESCRIPTION_MAX,
  digitsToCents,
  draftToInput,
  emptyDraft,
  isDraftDirty,
  pressKey,
  validateDraft,
  type Draft,
  type KeypadKey,
} from './draft.ts';

const TODAY = '2026-11-13';

function typeKeys(keys: KeypadKey[], start = ''): string {
  return keys.reduce(pressKey, start);
}

describe('emptyDraft', () => {
  it('starts with no amount, no description, Food & dining and the given date', () => {
    expect(emptyDraft('2026-11-13')).toEqual({
      digits: '',
      description: '',
      categoryId: 'food',
      date: '2026-11-13',
    });
  });
});

describe('pressKey', () => {
  it('fills from the right like a till: 5, 8, 0 is 5.80', () => {
    const digits = typeKeys(['5', '8', '0']);
    expect(digits).toBe('580');
    expect(digitsToCents(digits)).toBe(580);
  });

  it('ignores leading zeros', () => {
    expect(typeKeys(['0', '0', '0'])).toBe('');
    expect(typeKeys(['00', '4', '2'])).toBe('42');
    expect(typeKeys(['0', '7', '0'])).toBe('70');
  });

  it('adds two zeros with 00', () => {
    expect(typeKeys(['1', '2', '00'])).toBe('1200');
  });

  it(`holds at most ${AMOUNT_MAX_DIGITS} digits (S$99,999.99) and ignores the rest`, () => {
    const full = typeKeys(['9', '9', '9', '9', '9', '9', '9']);
    expect(digitsToCents(full)).toBe(9_999_999);
    expect(pressKey(full, '1')).toBe(full);
    expect(pressKey(full, '00')).toBe(full);
  });

  it('ignores 00 whole when only one digit is left, rather than adding half of it', () => {
    expect(pressKey('123456', '00')).toBe('123456');
    expect(pressKey('123456', '0')).toBe('1234560');
  });

  it('deletes the last digit, and does nothing when empty', () => {
    expect(pressKey('580', 'del')).toBe('58');
    expect(typeKeys(['del', 'del'], '58')).toBe('');
    expect(pressKey('', 'del')).toBe('');
  });
});

describe('digitsToCents', () => {
  it('reads an empty amount as zero', () => {
    expect(digitsToCents('')).toBe(0);
  });
});

describe('validateDraft', () => {
  const valid: Draft = { ...emptyDraft(TODAY), digits: '580', description: 'chicken rice' };

  it('passes a complete line', () => {
    expect(validateDraft(valid, TODAY)).toEqual([]);
  });

  it('needs an amount above zero', () => {
    expect(validateDraft({ ...valid, digits: '' }, TODAY)).toEqual([
      { field: 'amount', message: 'Type an amount above 0.00.' },
    ]);
  });

  it(`allows ${DESCRIPTION_MAX} characters and says how long a longer description is`, () => {
    expect(validateDraft({ ...valid, description: 'x'.repeat(40) }, TODAY)).toEqual([]);
    expect(validateDraft({ ...valid, description: 'x'.repeat(43) }, TODAY)).toEqual([
      { field: 'description', message: 'Description is 43 characters. Keep it to 40.' },
    ]);
  });

  it('measures the description without its outer spaces', () => {
    expect(validateDraft({ ...valid, description: `  ${'x'.repeat(40)}  ` }, TODAY)).toEqual([]);
  });

  it('allows an empty description (the department name prints instead)', () => {
    expect(validateDraft({ ...valid, description: '   ' }, TODAY)).toEqual([]);
  });

  it('refuses a future date, as a guard behind the locked calendar', () => {
    expect(validateDraft({ ...valid, date: '2026-11-14' }, TODAY)).toEqual([
      { field: 'date', message: 'Pick today or an earlier date.' },
    ]);
  });

  it('reports every error at once, amount first', () => {
    const errors = validateDraft({ ...valid, digits: '', description: 'x'.repeat(41) }, TODAY);
    expect(errors.map((e) => e.field)).toEqual(['amount', 'description']);
  });
});

describe('draftToInput', () => {
  it('turns a draft into repository input', () => {
    expect(
      draftToInput({
        digits: '580',
        description: '  chicken rice ',
        categoryId: 'food',
        date: '2026-11-12',
      }),
    ).toEqual({ amountCents: 580, note: 'chicken rice', categoryId: 'food', date: '2026-11-12' });
  });

  it('leaves the note out when the description is blank', () => {
    const input = draftToInput({ ...emptyDraft(TODAY), digits: '100', description: '  ' });
    expect(input).not.toHaveProperty('note');
  });
});

describe('isDraftDirty', () => {
  const initial = emptyDraft(TODAY);

  it('is clean when nothing changed', () => {
    expect(isDraftDirty(initial, initial)).toBe(false);
    expect(isDraftDirty({ ...initial, description: '   ' }, initial)).toBe(false);
  });

  it.each([
    ['amount', { digits: '5' }],
    ['description', { description: 'kopi' }],
    ['department', { categoryId: 'transport' }],
    ['date', { date: '2026-11-12' }],
  ] as const)('is dirty when the %s changed', (_field, change) => {
    expect(isDraftDirty({ ...initial, ...change }, initial)).toBe(true);
  });
});

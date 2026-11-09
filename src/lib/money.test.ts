import { centsToDecimalString, formatCents, MAX_AMOUNT_CENTS, parseAmount } from './money.ts';

describe('parseAmount', () => {
  it.each([
    ['12.50', 1250],
    ['12.5', 1250],
    ['12', 1200],
    ['12.', 1200],
    ['.5', 50],
    ['0.01', 1],
    ['0.10', 10],
    ['  7.25  ', 725],
    ['1,234.56', 123456],
    ['12,345', 1234500],
    ['$12.50', 1250],
    ['S$12.50', 1250],
    ['007.10', 710],
    ['999999.99', 99999999],
  ])('parses %j to %i cents', (input, cents) => {
    expect(parseAmount(input)).toEqual({ ok: true, cents });
  });

  it('avoids float drift: 0.1 + 0.2 style inputs come out exact', () => {
    // parseFloat('1.15') * 100 === 114.99999999999999
    expect(parseAmount('1.15')).toEqual({ ok: true, cents: 115 });
    expect(parseAmount('4.35')).toEqual({ ok: true, cents: 435 });
    expect(parseAmount('1005.07')).toEqual({ ok: true, cents: 100507 });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'invalid'],
    ['.', 'invalid'],
    ['$', 'invalid'],
    ['1.2.3', 'invalid'],
    ['12,34', 'invalid'],
    ['1,2345', 'invalid'],
    ['1 000', 'invalid'],
    ['1e3', 'invalid'],
    ['0x10', 'invalid'],
    ['Infinity', 'invalid'],
    ['12.345', 'too-many-decimals'],
    ['0.001', 'too-many-decimals'],
    ['0', 'not-positive'],
    ['0.00', 'not-positive'],
    ['-5', 'not-positive'],
    ['-0', 'not-positive'],
    ['1000000', 'too-large'],
    ['1,000,000.00', 'too-large'],
    ['99999999999999999999', 'too-large'],
  ])('rejects %j as %s', (input, error) => {
    expect(parseAmount(input)).toEqual({ ok: false, error });
  });

  it('accepts exactly the cap and rejects one cent above it', () => {
    expect(parseAmount(centsToDecimalString(MAX_AMOUNT_CENTS))).toEqual({
      ok: true,
      cents: MAX_AMOUNT_CENTS,
    });
    expect(parseAmount(centsToDecimalString(MAX_AMOUNT_CENTS + 1))).toEqual({
      ok: false,
      error: 'too-large',
    });
  });
});

describe('formatCents', () => {
  it.each([
    [1250, '$12.50'],
    [0, '$0.00'],
    [5, '$0.05'],
    [123456789, '$1,234,567.89'],
    [-1250, '-$12.50'],
  ])('formats %i as %j', (cents, text) => {
    expect(formatCents(cents)).toBe(text);
  });

  it('throws on non-integer cents instead of hiding a bug', () => {
    expect(() => formatCents(12.5)).toThrow(RangeError);
    expect(() => formatCents(Number.NaN)).toThrow(RangeError);
  });
});

describe('centsToDecimalString', () => {
  it.each([
    [1250, '12.50'],
    [5, '0.05'],
    [0, '0.00'],
    [123456789, '1234567.89'],
    [-1250, '-12.50'],
  ])('converts %i to %j', (cents, text) => {
    expect(centsToDecimalString(cents)).toBe(text);
  });

  it('round-trips through parseAmount', () => {
    for (const cents of [1, 99, 100, 101, 4350, 99999999]) {
      expect(parseAmount(centsToDecimalString(cents))).toEqual({ ok: true, cents });
    }
  });

  it('throws on non-integer cents', () => {
    expect(() => centsToDecimalString(0.5)).toThrow(RangeError);
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT, readNotebook, validateRequest } from '../src/model';

describe('expression boundary', () => {
  it('accepts supported notation and blocks equation mode confusion', () => {
    expect(validateRequest(DEFAULT)).toBeNull();
    expect(validateRequest({ ...DEFAULT, expression: 'x=2' })).toMatch(/Solve/);
    expect(validateRequest({ ...DEFAULT, expression: 'x=2', operation: 'solve' })).toBeNull();
  });
  it('requires both expressions and caps work', () => {
    expect(validateRequest({ ...DEFAULT, operation: 'equivalence' })).toMatch(/Enter/);
    expect(validateRequest({ ...DEFAULT, expression: 'x'.repeat(241) })).toMatch(/240/);
    expect(validateRequest({ ...DEFAULT, expression: '__import__("os")' })).toMatch(/mathematical/);
    expect(validateRequest({ ...DEFAULT, variable: 'i' })).toMatch(/constants/);
  });
});
describe('notebook recovery', () => {
  it('recovers safely from corrupt storage', () => {
    expect(readNotebook({ getItem: () => 'broken' })).toEqual([]);
    expect(readNotebook({ getItem: () => '{}' })).toEqual([]);
    expect(readNotebook({ getItem: () => { throw Error('denied'); } })).toEqual([]);
  });
  it('rejects malformed stored entries', () => {
    expect(readNotebook({ getItem: () => JSON.stringify([{ ...DEFAULT, id: '1', created: 'today', result: { result: 1 } }]) })).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { loadProgress, proofSource, puzzles } from '../src/model';
describe('proof source boundary', () => {
  it('never interpolates untrusted choice strings into Lean source', () => {
    const source = proofSource(puzzles[0], ['import Fake', 'sorry']);
    expect(source).not.toContain('import Fake');
    expect(source).not.toContain('sorry');
    expect(source).toContain('-- choose a step');
  });
  it('constructs the fixed complete proof selected by IDs', () => {
    expect(proofSource(puzzles[0], ['introduce', 'use'])).toContain('  intro hp\n  exact hp');
  });
  it('recovers safely from invalid saved progress', () => {
    expect(loadProgress({ getItem: () => '{bad' })).toEqual({});
    expect(loadProgress({ getItem: () => JSON.stringify({ identity: { choices: ['bad'], engine: 'fake' } }) })).toEqual({});
  });
});

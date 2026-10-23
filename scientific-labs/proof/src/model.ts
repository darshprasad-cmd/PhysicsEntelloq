import data from './puzzles.json';
export type Puzzle = typeof data[number];
export const puzzles = data;
export type Checked = { status: string; verified: boolean; message: string; diagnostics?: string; source?: string; sourceHash?: string; engine?: string; elapsedMs?: number };
export type Saved = { choices: string[]; engine: string; sourceHash: string; checkedAt: string };
export function proofSource(puzzle: Puzzle, choices: string[]): string {
  return 'set_option maxHeartbeats 100000\nset_option maxRecDepth 512\n\n' + puzzle.theorem + '\n' + puzzle.steps.map((step, i) => '  ' + (step.options.find(o => o.id === choices[i])?.code || '-- choose a step')).join('\n') + '\n';
}
export function loadProgress(storage: Pick<Storage, 'getItem'>): Record<string, Saved> {
  try {
    const saved = JSON.parse(storage.getItem('entelloq-proof-v1') || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([id, value]) => {
      const puzzle = puzzles.find(p => p.id === id); const item = value as Saved;
      return !!puzzle && !!item && Array.isArray(item.choices) && item.choices.length === puzzle.steps.length && item.choices.every((c, i) => puzzle.steps[i].options.some(o => o.id === c)) && typeof item.engine === 'string' && /^[a-f0-9]{64}$/.test(item.sourceHash) && typeof item.checkedAt === 'string';
    })) as Record<string, Saved>;
  } catch { return {}; }
}

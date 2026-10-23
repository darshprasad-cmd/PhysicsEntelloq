export type Operation = 'simplify' | 'differentiate' | 'integrate' | 'solve' | 'equivalence';
export type Domain = 'real' | 'positive' | 'complex';
export type Request = { operation: Operation; expression: string; comparison: string; variable: string; domain: Domain };
export type Result = { result: string; latex: string; inputLatex: string; summary: string; notes: string[]; verdict?: 'equivalent' | 'different' | 'unknown'; engine: string };
export type Entry = Request & { id: string; created: string; result: Result };
export const operations: { id: Operation; label: string; symbol: string; hint: string }[] = [
  { id: 'simplify', label: 'Simplify', symbol: '≡', hint: 'Find a simpler form of the same expression.' },
  { id: 'differentiate', label: 'Differentiate', symbol: '∂', hint: 'Explore how an expression changes with your variable.' },
  { id: 'integrate', label: 'Integrate', symbol: '∫', hint: 'Find an antiderivative, with a constant of integration.' },
  { id: 'solve', label: 'Solve', symbol: '=', hint: 'Find the solution set of an equation in your selected domain.' },
  { id: 'equivalence', label: 'Check a step', symbol: '⇄', hint: 'Compare two expressions under the same assumptions.' },
];
export const examples: (Request & { title: string; detail: string; tag: string })[] = [
  { title: 'A hidden identity', detail: 'Two trigonometric terms. One simpler idea.', tag: 'TRIGONOMETRY', operation: 'simplify', expression: 'sin(x)^2 + cos(x)^2', comparison: '', variable: 'x', domain: 'real' },
  { title: 'Follow the change', detail: 'Differentiate a product of two familiar functions.', tag: 'CALCULUS', operation: 'differentiate', expression: 'x^2 * sin(x)', comparison: '', variable: 'x', domain: 'real' },
  { title: 'Work backwards', detail: 'Recover a function from its rate of change.', tag: 'CALCULUS', operation: 'integrate', expression: '2*x * cos(x^2)', comparison: '', variable: 'x', domain: 'real' },
  { title: 'Find the intersections', detail: 'Find every real solution of a quadratic.', tag: 'ALGEBRA', operation: 'solve', expression: 'x^2 - 5*x + 6 = 0', comparison: '', variable: 'x', domain: 'real' },
  { title: 'Does that step hold?', detail: 'Discover why the domain changes the answer.', tag: 'ASSUMPTIONS', operation: 'equivalence', expression: 'sqrt(x^2)', comparison: 'x', variable: 'x', domain: 'real' },
];
export const DEFAULT: Request = { operation: 'simplify', expression: 'sin(x)^2 + cos(x)^2', comparison: '', variable: 'x', domain: 'real' };
export function validateRequest(value: Request): string | null {
  if (!operations.some(o => o.id === value.operation)) return 'Choose a supported operation.';
  if (!['real', 'positive', 'complex'].includes(value.domain)) return 'Choose a supported domain.';
  if (!/^[a-z]$/.test(value.variable)) return 'Use a single lowercase letter as the variable.';
  if (['e', 'i'].includes(value.variable)) return 'e and i are constants. Choose another variable.';
  for (const source of [value.expression, ...(value.operation === 'equivalence' ? [value.comparison] : [])]) {
    if (!source.trim()) return 'Enter an expression to continue.';
    if (source.length > 240) return 'Keep each expression within 240 characters.';
    if (!/^[a-zA-Z0-9+\-*/^().,\s=]+$/.test(source)) return 'Use numbers, letters, parentheses, and mathematical operators only.';
    if (value.operation !== 'solve' && source.includes('=')) return 'Use Solve for equations. Here, enter one expression.';
  }
  return null;
}
export function readNotebook(storage: Pick<Storage, 'getItem'>): Entry[] {
  try {
    const data: unknown = JSON.parse(storage.getItem('entelloq-reason-notebook-v1') || '[]');
    if (!Array.isArray(data)) return [];
    return data.slice(0, 50).filter((e): e is Entry => !!e && typeof e === 'object' && typeof e.id === 'string' && typeof e.created === 'string' && typeof e.expression === 'string' && typeof e.comparison === 'string' && typeof e.variable === 'string' && !validateRequest(e) && !!e.result && typeof e.result.result === 'string' && typeof e.result.latex === 'string' && typeof e.result.inputLatex === 'string' && typeof e.result.summary === 'string' && Array.isArray(e.result.notes) && e.result.notes.every((n: unknown) => typeof n === 'string') && typeof e.result.engine === 'string');
  } catch { return []; }
}

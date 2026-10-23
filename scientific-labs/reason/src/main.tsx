import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowRight, Check, Copy, Download, BookOpen, ChevronRight, CircleHelp, History, LoaderCircle, Plus, Trash2, X, Braces, ShieldCheck } from 'lucide-react';
import 'katex/dist/katex.min.css';
import './style.css';
import { DEFAULT, examples, operations, readNotebook, validateRequest } from './model';
import type { Entry, Request, Result } from './model';

const RenderMath = lazy(() => import('./MathView'));
function MathView(props: { value: string; large?: boolean }) { return <Suspense fallback={<div className="math-view">Formatting mathematics…</div>}><RenderMath {...props}/></Suspense>; }

function App() {
  const [request, setRequest] = useState<Request>(DEFAULT);
  const [entries, setEntries] = useState<Entry[]>(() => { try { return readNotebook(localStorage); } catch { return []; } });
  const [selected, setSelected] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Engine loads on your first calculation');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Request | null>(null);
  const sequence = useRef(0);
  const resultRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { localStorage.setItem('entelloq-reason-notebook-v1', JSON.stringify(entries)); }
    catch { setNotice('This browser could not save your notebook. Export it to keep a copy.'); }
  }, [entries]);
  useEffect(() => () => { worker.current?.terminate(); if (timer.current) clearTimeout(timer.current); }, []);

  function stop(message = 'Calculation cancelled. Your notebook is safe.') {
    worker.current?.terminate(); worker.current = null;
    if (timer.current) clearTimeout(timer.current);
    sequence.current += 1; pending.current = null;
    setBusy(false); setReady(false); setStatus('Engine will reload for the next calculation'); setError(message);
  }
  function deadline(ms: number, message: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => stop(message), ms);
  }
  function calculate(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const validation = validateRequest(request);
    if (validation) { setError(validation); return; }
    setBusy(true); setError(''); setNotice(''); pending.current = { ...request };
    const id = ++sequence.current;
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.current.onmessage = ({ data }) => {
        if (data.kind === 'status') { setStatus(data.message); return; }
        if (data.kind === 'ready') { setReady(true); return; }
        if (data.id !== sequence.current) return;
        if (data.kind === 'calculating') { setStatus('Calculating exactly with SymPy…'); deadline(15000, 'This calculation exceeded 15 seconds and was stopped. Try a simpler expression.'); return; }
        if (timer.current) clearTimeout(timer.current);
        setBusy(false);
        if (data.kind === 'error') { setError(data.message); setStatus(data.fatal ? 'Engine will reload on your next attempt' : 'Ready for another expression'); if (data.fatal) { worker.current?.terminate(); worker.current = null; setReady(false); } return; }
        if (data.kind === 'result' && pending.current) {
          const entry: Entry = { ...pending.current, id: crypto.randomUUID(), created: new Date().toISOString(), result: data.result as Result };
          setSelected(entry); setEntries(old => [entry, ...old].slice(0, 50));
          setStatus(`${data.result.engine} · ready`); pending.current = null;
        }
      };
      worker.current.onerror = () => stop('The mathematics engine could not load. Check your connection, then try again.');
    }
    deadline(120000, 'The engine took too long to load. Check your connection and try again.');
    worker.current.postMessage({ id, request });
  }
  function loadExample(example: Request) {
    if (busy) return;
    setRequest({ operation: example.operation, expression: example.expression, comparison: example.comparison, domain: example.domain, variable: example.variable });
    setError(''); setSelected(null); inputRef.current?.focus();
  }
  function loadEntry(entry: Entry) {
    loadExample(entry); setSelected(entry); setShowNotebook(false);
  }
  function exportNotebook() {
    const blob = new Blob([JSON.stringify({ application: 'Entelloq Reason', schema: 1, exported: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'entelloq-reason-notebook.json'; anchor.click(); URL.revokeObjectURL(url);
    setNotice('Notebook exported.');
  }
  async function copyResult() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected.result.result); setNotice('Result copied.'); }
    catch { setNotice('Clipboard unavailable. Select and copy the result below.'); }
  }
  const dirty = selected && ['expression', 'comparison', 'operation', 'domain', 'variable'].some(key => request[key as keyof Request] !== selected[key as keyof Request]);
  const activeOperation = operations.find(item => item.id === request.operation)!;

  return <>
    <a className="skip-link" href="#workbench">Skip to workbench</a>
    <header className="topbar">
      <a className="brand" href="../" aria-label="Entelloq home"><span className="brand-mark">e</span><span>entelloq<span className="brand-divider">/</span><strong>reason</strong></span></a>
      <div className="top-actions"><span className="edition">THE MATHEMATICS STUDIO</span><button className="notebook-toggle subtle" onClick={() => setShowNotebook(!showNotebook)} aria-expanded={showNotebook}><BookOpen size={17}/> Notebook <span className="count">{entries.length}</span></button><a className="suite-link" href="../">Explore Entelloq <ArrowUpRight size={16}/></a></div>
    </header>
    <main>
      <section className="hero" aria-labelledby="hero-title"><div><div className="eyebrow"><span className="little-line"/> LESS GUESSING. MORE UNDERSTANDING.</div><h1 id="hero-title">Make sense<br/>of the <em>symbols.</em></h1><p>An open space to explore mathematics.<br/>Change an expression. Question a step. See what holds.</p></div><div className="hero-art" aria-hidden="true"><span className="art-label">ONE IDEA, MANY FORMS</span><div className="orbit orbit-one"/><div className="orbit orbit-two"/><span className="art-formula">sin²x + cos²x</span><span className="art-equals">=</span><span className="art-result">1</span><span className="art-dot"/><span className="art-caption">Complexity, made clear.</span></div></section>
      <div className="studio-layout">
        <section id="workbench" className="workbench" aria-labelledby="workbench-title">
          <div className="panel-title"><div><span className="section-index">01</span><h2 id="workbench-title">Your workbench</h2></div><span className="private-badge"><ShieldCheck size={14}/> Runs in your browser</span></div>
          <div className="operations" aria-label="Mathematics operation">{operations.map(item => <button key={item.id} disabled={busy} className={request.operation === item.id ? 'operation active' : 'operation'} aria-pressed={request.operation === item.id} onClick={() => { setRequest(old => ({ ...old, operation: item.id })); setError(''); }}><span>{item.symbol}</span>{item.label}</button>)}</div>
          <form onSubmit={calculate} className="expression-form">
            <div className="input-heading"><label htmlFor="expression">{request.operation === 'solve' ? 'Your equation' : request.operation === 'equivalence' ? 'Original expression' : 'Your expression'}</label><span>{request.expression.length}/240</span></div>
            <textarea ref={inputRef} id="expression" value={request.expression} maxLength={240} disabled={busy} spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={2} aria-describedby="syntax-help" onChange={e => setRequest(old => ({ ...old, expression: e.target.value }))} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); calculate(); } }}/>
            {request.operation === 'equivalence' && <div className="comparison"><label htmlFor="comparison">Proposed expression <span>Does it say the same thing?</span></label><textarea id="comparison" rows={2} value={request.comparison} maxLength={240} disabled={busy} spellCheck={false} onChange={e => setRequest(old => ({ ...old, comparison: e.target.value }))} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); calculate(); } }}/></div>}
            <p id="syntax-help" className="syntax-help">Use <code>*</code> to multiply, <code>^</code> for powers, and <code>sin(x)</code> for functions.</p>
            <div className="settings"><div><label htmlFor="variable">WITH RESPECT TO</label><select id="variable" value={request.variable} disabled={busy} onChange={e => setRequest(old => ({ ...old, variable: e.target.value }))}>{['x', 'y', 'z', 't', 'a', 'b', 'n', 'r', 's'].map(v => <option key={v}>{v}</option>)}</select></div><div className="domain-setting"><label htmlFor="domain">ALL VARIABLES ARE</label><select id="domain" value={request.domain} disabled={busy} onChange={e => setRequest(old => ({ ...old, domain: e.target.value as Request['domain'] }))}><option value="real">Real numbers</option><option value="positive">Positive real numbers</option><option value="complex">Complex numbers</option></select></div></div>
            <div className="form-bottom"><p>{activeOperation.hint}</p><button type="submit" className="calculate" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin"/> Working</> : <>Explore result <ArrowRight size={18}/></>}</button></div>
            <div className="engine-line"><span className={`status-dot ${ready ? 'ready' : ''}`}/><span role="status">{status}</span>{busy ? <button type="button" className="text-button" onClick={() => stop()}>Cancel</button> : <kbd>Ctrl ↵</kbd>}</div>
            {error && <div role="alert" className="error"><CircleHelp size={18}/><span>{error}</span></div>}
          </form>
          <section className="result" ref={resultRef} aria-live="polite" aria-label="Calculation result">
            <div className="result-top"><span>{selected ? dirty ? 'PREVIOUS RESULT · RUN TO UPDATE' : 'YOUR RESULT' : 'ROOM FOR A LITTLE DISCOVERY'}</span>{selected && <button onClick={copyResult} className="icon-button" aria-label="Copy result"><Copy size={16}/></button>}</div>
            {selected ? <><div className="result-meta"><span>{operations.find(o => o.id === selected.operation)?.label}</span><span>{selected.domain === 'positive' ? 'positive real' : selected.domain} variables</span></div><div className="input-preview"><MathView value={selected.result.inputLatex}/></div>{selected.result.verdict && <div className={`verdict ${selected.result.verdict}`}>{selected.result.verdict === 'equivalent' ? <Check size={17}/> : <CircleHelp size={17}/>} {selected.result.verdict === 'equivalent' ? 'Equivalent on the common domain' : selected.result.verdict === 'different' ? 'Not identical' : 'Inconclusive'}</div>}{selected.operation === 'equivalence' && <div className="difference-label">SIMPLIFIED DIFFERENCE</div>}<MathView value={selected.result.latex} large/><p className="result-summary">{selected.result.summary}</p><details className="result-notes" open><summary>Assumptions & interpretation <ChevronRight size={15}/></summary><ul>{selected.result.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></details><div className="result-foot"><span><Check size={14}/> Saved to your notebook</span><span>{selected.result.engine}</span></div></> : <div className="empty-result"><span className="empty-symbol">∴</span><h3>Every expression has a story.</h3><p>Run a calculation to reveal its next chapter.<br/>Exact results, with assumptions in plain sight.</p></div>}
          </section>
          <div className="notice" role="status">{notice}</div>
        </section>
        <aside className={`notebook ${showNotebook ? 'open' : ''}`} aria-label="Math notebook"><div className="notebook-heading"><div><BookOpen size={19}/><h2>Your notebook</h2></div><button className="close-notebook icon-button" aria-label="Close notebook" onClick={() => setShowNotebook(false)}><X size={18}/></button><span className="count desktop-count">{entries.length}</span></div><p className="notebook-description">Ideas worth keeping.<br/>Saved on this browser, automatically.</p><button className="new-page" disabled={busy} onClick={() => { loadExample({ ...DEFAULT, expression: '' }); setShowNotebook(false); }}><Plus size={16}/> New expression</button>{entries.length ? <><div className="entry-list">{entries.map(entry => <div className={`entry ${selected?.id === entry.id ? 'selected' : ''}`} key={entry.id}><button className="entry-load" disabled={busy} onClick={() => loadEntry(entry)}><span className="entry-operation">{operations.find(o => o.id === entry.operation)?.label}<span>{new Date(entry.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span><span className="entry-expression">{entry.expression}</span><span className="entry-answer">→ {entry.result.result}</span></button><button className="delete-entry" aria-label={`Delete notebook entry ${entry.expression}`} onClick={() => { setEntries(old => old.filter(e => e.id !== entry.id)); if (selected?.id === entry.id) setSelected(null); }}><Trash2 size={13}/></button></div>)}</div><button className="export-button" onClick={exportNotebook}><Download size={15}/> Export notebook</button></> : <div className="notebook-empty"><History size={25}/><p>Your first calculation<br/>starts the collection.</p><span>Up to 50 recent explorations.</span></div>}<div className="notebook-note"><Braces size={19}/><p>Built on <a href="https://www.sympy.org/" target="_blank" rel="noreferrer">SymPy</a>.<br/>Grounded in symbolic mathematics.</p></div></aside>
      </div>
      <section className="examples" aria-labelledby="examples-heading"><div className="examples-heading"><div><span className="section-index">02</span><h2 id="examples-heading">Follow your curiosity</h2></div><p>A few good places to begin.</p></div><div className="example-grid">{examples.map((example, index) => <button className="example-card" key={example.title} disabled={busy} onClick={() => { loadExample(example); document.getElementById('workbench')?.scrollIntoView({ block: 'start' }); }}><div className="example-top"><span>{example.tag}</span><ArrowUpRight size={18}/></div><span className="example-symbol">{['≡', '∂', '∫', 'x', '⇄'][index]}</span><h3>{example.title}</h3><p>{example.detail}</p></button>)}</div></section>
      <details className="guide"><summary><CircleHelp size={18}/><span>A small guide to the notation</span><Plus size={18}/></summary><div className="guide-content"><div><h3>Write naturally, with a few rules.</h3><p><code>2*x + 3</code> · <code>x^2</code> · <code>(x+1)/(x-1)</code></p><p>Single lowercase letters are variables. <code>pi</code>, <code>e</code>, and <code>i</code> are constants. Decimal numbers are treated as exact rationals.</p></div><div><h3>Functions you can use</h3><p><code>sin cos tan asin acos atan exp log ln sqrt abs</code></p><p>Each function takes one argument. Angles are radians. <code>log</code> and <code>ln</code> mean the natural logarithm.</p></div><div><h3>Know what a result means.</h3><p>Symbolic computation can leave an integral or a solution condition unresolved. A step check compares expressions on their shared domain; it does not certify a whole proof.</p><p>The engine downloads from jsDelivr on first use. Expressions stay in your browser. Your local notebook is not encrypted.</p></div></div></details>
    </main>
    <footer><a className="footer-brand" href="../">entelloq<span>reason</span></a><span>Made for the moment it clicks.</span><a href="https://docs.sympy.org/latest/index.html" target="_blank" rel="noreferrer">The mathematics behind it <ArrowUpRight size={14}/></a></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

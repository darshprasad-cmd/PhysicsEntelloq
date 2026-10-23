import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, Code2, Download, Lightbulb, LoaderCircle, RotateCcw, ShieldCheck, Unplug, X } from 'lucide-react';
import { loadProgress, proofSource, puzzles } from './model';
import type { Checked, Saved } from './model';
import './style.css';

function App() {
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [result, setResult] = useState<Checked | null>(null);
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [setup, setSetup] = useState(false);
  const [hints, setHints] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<Record<string, Saved>>(() => { try { return loadProgress(localStorage); } catch { return {}; } });
  const [showLibrary, setShowLibrary] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const puzzle = puzzles[index];
  const source = proofSource(puzzle, choices);
  const selectedCount = puzzle.steps.filter((_, i) => !!choices[i]).length;

  async function connect() {
    setConnecting(true);
    try {
      const response = await fetch('api/health', { signal: AbortSignal.timeout(4000) });
      const data = await response.json();
      setEngine(data.available && typeof data.engine === 'string' ? data.engine : null);
    } catch { setEngine(null); }
    finally { setConnecting(false); }
  }
  useEffect(() => { void connect(); return () => { requestRef.current?.abort(); }; }, []);
  useEffect(() => { try { localStorage.setItem('entelloq-proof-v1', JSON.stringify(saved)); } catch { setMessage('This browser cannot save progress. Download proofs you want to keep.'); } }, [saved]);
  function selectPuzzle(next: number) {
    if (busy) return;
    setIndex(next); setChoices(saved[puzzles[next].id]?.choices || []); setResult(null); setHints([]); setMessage(''); setShowLibrary(false);
  }
  async function checkProof() {
    if (busy || selectedCount !== puzzle.steps.length) return;
    setBusy(true); setResult(null); setMessage('');
    const controller = new AbortController(); requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ puzzle: puzzle.id, choices }), signal: controller.signal });
      if (!response.ok) throw new Error('The local checker could not accept this request.');
      const checked: Checked = await response.json();
      if (!checked || typeof checked.status !== 'string' || typeof checked.verified !== 'boolean') throw new Error('The checker returned an unexpected response.');
      setResult(checked);
      if (checked.status === 'verified' && checked.verified && checked.sourceHash && checked.engine) {
        setSaved(old => ({ ...old, [puzzle.id]: { choices: [...choices], sourceHash: checked.sourceHash!, engine: checked.engine!, checkedAt: new Date().toISOString() } }));
        setEngine(checked.engine);
      }
    } catch {
      setEngine(null); setResult({ status: 'unavailable', verified: false, message: 'The local checker could not be reached in time. Your argument is still a draft. Start the checker, reconnect, and try again.' });
    } finally { clearTimeout(timeout); setBusy(false); requestRef.current = null; }
  }
  function download() {
    const content = result?.source || source;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${puzzle.id}${result?.verified ? '' : '-draft'}.lean`; link.click(); URL.revokeObjectURL(url);
    setMessage(result?.verified ? 'Verified proof downloaded.' : 'Draft downloaded. It has not been verified.');
  }
  const nextUnsolved = puzzles.findIndex((p, i) => i > index && !saved[p.id]);
  return <>
    <a href="#argument" className="skip-link">Skip to your argument</a>
    <header><a href="../" className="brand"><span className="brand-symbol">e</span>entelloq<span className="slash">/</span><span className="brand-product">proof studio</span></a><a href="../" className="suite-link">Explore Entelloq <ArrowUpRight size={15}/></a></header>
    <main>
      <section className="intro"><div className="intro-copy"><p className="eyebrow"><span/> THE ART OF KNOWING WHY</p><h1>From “I think”<br/>to <em>“it follows.”</em></h1><p>Build a convincing argument, one idea at a time.<br/>Then let mathematics check the mathematics.</p></div><div className="proof-path" aria-hidden="true"><div className="path-node">P</div><span className="path-line">→</span><div className="path-node">Q</div><span className="path-line">→</span><div className="path-node end">R</div><div className="path-bracket"><span>Small steps. Solid ground.</span></div></div><div className="intro-index">A LEARNING STUDIO<br/><strong>01—06</strong></div></section>
      <div className="studio">
        <aside className={`library ${showLibrary ? 'show' : ''}`}><div className="library-head"><span>YOUR PROOF JOURNEY</span><button className="library-close" onClick={() => setShowLibrary(false)} aria-label="Close proof library"><X size={18}/></button></div><div className="journey-progress"><div><strong>{Object.keys(saved).length}</strong><span>/ 6 checked proofs</span></div><div className="progress-line"><span style={{ width: `${Object.keys(saved).length / 6 * 100}%` }}/></div></div><nav aria-label="Proof puzzles">{puzzles.map((p, i) => <button className={index === i ? 'puzzle-nav active' : 'puzzle-nav'} key={p.id} onClick={() => selectPuzzle(i)} disabled={busy} aria-current={index === i ? 'step' : undefined}><span className={`nav-number ${saved[p.id] ? 'done' : ''}`}>{saved[p.id] ? <Check size={13}/> : `0${i + 1}`}</span><span><small>{p.category}</small><strong>{p.title}</strong></span><ChevronRight size={13}/></button>)}</nav><div className="library-foot"><ShieldCheck size={19}/><p>Proofs are checked by<br/><a href="https://lean-lang.org/" target="_blank" rel="noreferrer">Lean 4</a>, an open-source<br/>proof assistant.</p></div></aside>
        <div className="workspace">
          <div className="workspace-top"><button className="library-open" onClick={() => setShowLibrary(true)}>Proof {index+1} of 6 <ChevronDown size={15}/></button><div className="breadcrumb"><span>PROOF {index + 1} OF 6</span><span>•</span><span>{puzzle.level}</span></div><div className={`connection ${engine ? 'online' : ''}`}><span/>{connecting ? 'Connecting to checker…' : engine ? 'Lean checker connected' : 'Checker offline'}<button onClick={() => { void connect(); }} disabled={connecting} aria-label="Reconnect checker"><RotateCcw size={12}/></button></div></div>
          {!connecting && !engine && <div className="offline"><Unplug size={17}/><p>You can build your argument here. Verification needs the local Lean checker.</p><button onClick={() => setSetup(!setup)} aria-expanded={setup}>Start checker <ArrowUpRight size={13}/></button></div>}
          {setup && <div className="setup"><button className="setup-close" aria-label="Close setup instructions" onClick={() => setSetup(false)}><X size={16}/></button><h3>Connect the local proof checker</h3><p>From this app’s folder, install the pinned Lean runtime once, then start the local service:</p><code>powershell -File setup-lean.ps1</code><code>python server/app.py</code><p>Open <a href="http://127.0.0.1:8773">127.0.0.1:8773</a> after building the app, or use its development server. If Lean is already installed, set <code>LEAN_BIN</code> to its executable. See README for bundled Python instructions.</p><button className="reconnect" onClick={() => { void connect(); }}>Reconnect <RotateCcw size={13}/></button></div>}
          <section className="problem"><div className="problem-heading"><span className="puzzle-symbol">{puzzle.symbol}</span><div><span className="category">{puzzle.category}</span><h2>{puzzle.title}</h2></div></div><div className="statement">{puzzle.statement}</div><p className="plain-statement">{puzzle.plain}</p><div className="givens"><span>WHAT YOU KNOW</span>{puzzle.givens.map(g => <p key={g}>{g}</p>)}</div></section>
          <div className="argument-layout">
            <section id="argument" className="argument"><div className="argument-heading"><h3>Your argument</h3><span>{selectedCount} / {puzzle.steps.length} choices made</span></div><p className="goal">{puzzle.goal}</p><div className="steps">{puzzle.steps.map((step, i) => <fieldset key={`${puzzle.id}-${step.id}`} disabled={busy} className="step"><legend><span>{i + 1}</span>{step.question}</legend><div className="step-options">{step.options.map(option => <label key={option.id} className={choices[i] === option.id ? 'choice selected' : 'choice'}><input type="radio" name={`step-${step.id}`} value={option.id} checked={choices[i] === option.id} onChange={() => { setChoices(old => { const copy = [...old]; copy[i] = option.id; return copy; }); setResult(null); setMessage(''); }}/><span className="radio-dot"/><span>{option.label}</span></label>)}</div><button className="hint-button" onClick={() => setHints(old => old.includes(i) ? old.filter(n => n !== i) : [...old, i])} aria-expanded={hints.includes(i)}><Lightbulb size={13}/>{hints.includes(i) ? 'Hide hint' : 'A nudge in the right direction'}<ChevronDown size={12}/></button>{hints.includes(i) && <p className="hint">{step.hint}</p>}</fieldset>)}</div><div className="check-controls"><button className="check-button" disabled={busy || selectedCount !== puzzle.steps.length} onClick={checkProof}>{busy ? <><LoaderCircle className="spin" size={16}/> Checking with Lean…</> : <><ShieldCheck size={16}/> Check my proof <ArrowRight size={16}/></>}</button><button className="reset" disabled={busy} onClick={() => { setChoices([]); setResult(null); setHints([]); }} aria-label="Reset argument"><RotateCcw size={17}/></button></div><p className="check-caption">{selectedCount < puzzle.steps.length ? 'Make a choice for every step to check your argument.' : 'A complete proof is accepted only when Lean checks it.'}</p></section>
            <aside className="formal"><div className="formal-heading"><span><Code2 size={15}/> BEHIND THE ARGUMENT</span><span className="lean-label">LEAN 4</span></div><div className="formal-intro"><h3>Your ideas, made precise.</h3><p>Each choice becomes part of a formal proof. This is exactly what the checker reads.</p></div><pre tabIndex={0} aria-label="Generated Lean proof"><code>{source}</code></pre><div className={`check-result ${result?.status || 'draft'}`} role="status">{busy ? <><LoaderCircle size={22} className="spin"/><h3>Checking every link…</h3><p>Lean is validating the complete argument.</p></> : result ? <><span className="result-icon">{result.verified ? <Check size={24}/> : <Code2 size={24}/>}</span><h3>{result.verified ? 'This proof holds.' : result.status === 'rejected' ? 'There’s a gap to explore.' : 'Not verified yet.'}</h3><p>{result.message}</p>{result.verified && <span className="verification-label">VERIFIED BY LEAN · {result.elapsedMs} MS</span>}{result.diagnostics && <details><summary>Read Lean’s feedback <ChevronDown size={13}/></summary><pre>{result.diagnostics}</pre></details>}</> : <><span className="draft-dot"/><h3>A draft, full of possibility.</h3><p>{saved[puzzle.id] ? 'This puzzle has a saved checked proof. Check the current choices again to verify this draft.' : 'Choose your steps, then check whether the whole argument holds.'}</p></>}</div><div className="formal-actions"><button onClick={download}><Download size={14}/>{result?.verified ? 'Download proof' : 'Download draft'}</button><span>{result?.verified ? 'Checked' : 'Unverified'}</span></div></aside>
          </div>
          {result?.verified && <div className="next-proof"><div><span>ONE MORE IDEA, MADE CERTAIN.</span><p>{Object.keys(saved).length === 6 ? 'You’ve checked all six foundations. Revisit any proof and experiment with a different argument.' : 'Keep following the chain of ideas.'}</p></div>{nextUnsolved >= 0 && <button onClick={() => selectPuzzle(nextUnsolved)}>Next proof <ArrowRight size={16}/></button>}</div>}
          <p className="message" role="status">{message}</p>
        </div>
      </div>
      <section className="principles"><div><span>01 / UNDERSTAND</span><h3>Start with the idea.</h3><p>Every symbol has a meaning. Each puzzle begins with a statement you can explain in ordinary language.</p></div><div><span>02 / CONSTRUCT</span><h3>Make each step count.</h3><p>Choose evidence that fits the goal. A helpful-looking statement is useful only if it proves what you need.</p></div><div><span>03 / VERIFY</span><h3>Let the proof speak.</h3><p>Lean checks the formal argument. A verified result applies to this exact statement and proof, not to an informal claim beyond it.</p></div></section>
    </main><footer><span><strong>entelloq</strong> proof studio</span><p>Curiosity deserves solid ground.</p><a href="https://lean-lang.org/theorem_proving_in_lean4/" target="_blank" rel="noreferrer">Go deeper with Lean <ArrowUpRight size={14}/></a></footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);

import program from './engine.py?raw';
const RUNTIME = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
let runtime: Promise<any> | undefined;
let initialized = false;
async function getRuntime() {
  if (!runtime) runtime = (async () => {
    self.postMessage({ kind: 'status', message: 'Downloading the mathematics engine…' });
    const module = await import(/* @vite-ignore */ `${RUNTIME}pyodide.mjs`);
    const py = await module.loadPyodide({ indexURL: RUNTIME });
    self.postMessage({ kind: 'status', message: 'Loading SymPy…' });
    await py.loadPackage('sympy');
    await py.runPythonAsync(program);
    initialized = true;
    self.postMessage({ kind: 'ready' });
    return py;
  })();
  return runtime;
}
self.onmessage = async ({ data }) => {
  try {
    const py = await getRuntime();
    py.globals.set('request_json', JSON.stringify(data.request));
    self.postMessage({ kind: 'calculating', id: data.id });
    const result = JSON.parse(await py.runPythonAsync('calculate(request_json)'));
    py.globals.delete('request_json');
    self.postMessage({ kind: 'result', id: data.id, result });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const lines = raw.split('\n').filter(Boolean);
    const last = lines.at(-1) || 'The calculation could not be completed.';
    self.postMessage({ kind: 'error', id: data.id, fatal: !initialized, message: initialized ? last.replace(/^(ValueError|SyntaxError|TypeError):\s*/, '') : 'The mathematics engine could not load. Check your connection and try again.' });
  }
};

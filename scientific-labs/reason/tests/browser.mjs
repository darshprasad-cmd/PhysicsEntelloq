import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = process.env.REASON_URL || 'http://127.0.0.1:5191';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = [];
await fs.mkdir('test-results', { recursive: true });
async function run(operation, expression, expected, domain = 'real', comparison = '') {
  await page.getByRole('button', { name: operation, exact: false }).filter({ hasText: operation }).first().click();
  await page.locator('#expression').fill(expression);
  await page.locator('#domain').selectOption(domain);
  if (comparison) await page.locator('#comparison').fill(comparison);
  await page.getByRole('button', { name: 'Explore result' }).click();
  await page.waitForFunction(() => document.querySelector('.calculate')?.textContent?.includes('Explore result'), null, { timeout: 150000 });
  const error = await page.locator('.error').count();
  if (error) throw Error(await page.locator('.error').innerText());
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem('entelloq-reason-notebook-v1'))[0]);
  assert.equal(entry.result.result, expected);
  results.push({ operation, expression, domain, actual: entry.result.result, verdict: entry.result.verdict });
  return entry;
}
try {
  await page.goto(base);
  await run('Simplify', 'sin(x)^2 + cos(x)^2', '1');
  await run('Differentiate', 'x^3 + 2*x', '3*x**2 + 2');
  await run('Integrate', '2*x', 'x**2 + C');
  await run('Solve', 'x^2 - 5*x + 6 = 0', '{2, 3}');
  await run('Solve', 'x^2 + 1 = 0', 'EmptySet');
  await run('Solve', 'x^2 + 1 = 0', '{-I, I}', 'complex');
  await run('Solve', '(x^2 - 1)/(x - 1) = 2', 'EmptySet');
  await run('Solve', '(x^2 - 1)/(x - 1) = 2', 'EmptySet', 'complex');
  await run('Simplify', '0.1234567890123456789', '1234567890123456789/10000000000000000000');
  let checked = await run('Check a step', 'sqrt(x^2)', '-x + Abs(x)', 'real', 'x');
  assert.equal(checked.result.verdict, 'different');
  checked = await run('Check a step', 'sqrt(x^2)', '0', 'positive', 'x');
  assert.equal(checked.result.verdict, 'equivalent');
  // Python attribute access, function construction, and non-mathematical calls are rejected.
  await page.getByRole('button', { name: 'Simplify', exact: false }).first().click();
  for (const expression of ['x.real', 'open(x)', 'sin(x, x)', 'x^101', '1/0']) {
    await page.locator('#expression').fill(expression);
    await page.getByRole('button', { name: 'Explore result' }).click();
    await page.locator('.error').waitFor();
    results.push({ rejected: expression, message: await page.locator('.error').innerText() });
  }
  await page.reload();
  assert.equal(await page.locator('.entry').count(), 11);
  await page.locator('.entry-load').first().click();
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('button', { name: /Notebook/ }).click();
  await page.getByRole('button', { name: /Close notebook/ }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Simplify', exact: false }).first().click();
  await page.locator('#expression').focus();
  await page.locator('#expression').fill('x+x');
  await page.locator('#expression').press('Control+Enter');
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('entelloq-reason-notebook-v1'))?.[0]?.result.result === '2*x', null, { timeout: 150000 });
  assert.equal(errors.length, 0, errors.join('\n'));
  const recovery = await browser.newPage();
  await recovery.route('**/pyodide.mjs', route => route.abort());
  await recovery.goto(base);
  await recovery.getByRole('button', { name: 'Explore result' }).click();
  await recovery.locator('.error').waitFor();
  assert.match(await recovery.locator('.error').innerText(), /could not load/);
  await recovery.unroute('**/pyodide.mjs');
  await recovery.getByRole('button', { name: 'Explore result' }).click();
  await recovery.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.match(await recovery.locator('.error').innerText(), /cancelled/);
  await recovery.getByRole('button', { name: 'Explore result' }).click();
  await recovery.waitForFunction(() => JSON.parse(localStorage.getItem('entelloq-reason-notebook-v1') || '[]')?.[0]?.result.result === '1', null, { timeout: 150000 });
  await recovery.close();
  await fs.writeFile('test-results/browser.json', JSON.stringify({ passed: true, results, consoleErrors: errors, mobileOverflow: false, keyboard: true, persistence: true, runtimeFailureRetry: true, cancellation: true }, null, 2));
  console.log(JSON.stringify({ passed: true, checks: results.length + 6, results }));
} finally { await browser.close(); }

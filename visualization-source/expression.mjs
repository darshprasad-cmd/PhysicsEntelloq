// Bounded recursive-descent grammar, matching the legacy Grapher operators.
// New independent variables are explicit; no JavaScript evaluation is involved.
export function compile(source, variables = ["x", "y", "t"]) {
  if (typeof source !== "string" || source.length > 300)
    throw new Error("Use an expression of at most 300 characters.");
  const tokens =
    source.match(/(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z]+|[^\s]/g) || [];
  if (tokens.length > 160) throw new Error("Expression is too complex.");
  for (let i = 1; i < tokens.length; i++)
    if (/^[\d.]/.test(tokens[i]) && /^[\d.]/.test(tokens[i - 1]))
      throw new Error("Separate numbers with an explicit operator.");
  const fns = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log10,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
  };
  let pos = 0,
    depth = 0;
  const take = (t) => (tokens[pos] === t ? (pos++, true) : false);
  function expr() {
    let a = term();
    while (["+", "-"].includes(tokens[pos])) {
      const op = tokens[pos++],
        b = term(),
        old = a;
      a = (v) => (op === "+" ? old(v) + b(v) : old(v) - b(v));
    }
    return a;
  }
  function term() {
    let a = unary();
    while (tokens[pos] && ![")", ",", "+", "-"].includes(tokens[pos])) {
      let op = tokens[pos];
      if (op === "*" || op === "/") pos++;
      else op = "*";
      const b = unary(),
        old = a;
      a = (v) => (op === "*" ? old(v) * b(v) : old(v) / b(v));
    }
    return a;
  }
  function unary() {
    if (++depth > 32) throw new Error("Too many nested operations.");
    let result;
    if (take("-")) {
      const a = unary();
      result = (v) => -a(v);
    } else if (take("+")) result = unary();
    else {
      const a = atom();
      if (take("^")) {
        const b = unary();
        result = (v) => a(v) ** b(v);
      } else result = a;
    }
    depth--;
    return result;
  }
  function atom() {
    const token = tokens[pos++];
    if (!token) throw new Error("Incomplete expression.");
    if (token === "(") {
      const a = expr();
      if (!take(")")) throw new Error("Missing closing parenthesis.");
      return a;
    }
    if (/^(?:\d|\.)/.test(token)) {
      const n = Number(token);
      if (!Number.isFinite(n)) throw new Error("Invalid number.");
      return () => n;
    }
    if (token === "pi") return () => Math.PI;
    if (token === "e") return () => Math.E;
    if (variables.includes(token)) return (v) => v[token];
    if (Object.hasOwn(fns, token)) {
      if (!take("(")) throw new Error("Use parentheses after " + token + ".");
      const a = expr();
      if (!take(")")) throw new Error("Missing closing parenthesis.");
      return (v) => fns[token](a(v));
    }
    throw new Error("Unsupported symbol: " + token);
  }
  const fn = expr();
  if (pos !== tokens.length) throw new Error("Unexpected symbol.");
  return fn;
}

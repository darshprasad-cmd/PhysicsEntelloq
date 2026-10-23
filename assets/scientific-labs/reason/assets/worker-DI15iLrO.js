const e=`https://cdn.jsdelivr.net/pyodide/v314.0.7/full/`;let t,n=!1;async function r(){return t||=(async()=>{self.postMessage({kind:`status`,message:`Downloading the mathematics engine…`});let t=await(await import(
/* @vite-ignore */
`${e}pyodide.mjs`)).loadPyodide({indexURL:e});return self.postMessage({kind:`status`,message:`Loading SymPy…`}),await t.loadPackage(`sympy`),await t.runPythonAsync(`"""Fixed program. User expressions are parsed as data, never evaluated as Python."""
import ast
import json
import math
import re
import sympy as s

FUNCTIONS = {"sin": s.sin, "cos": s.cos, "tan": s.tan, "asin": s.asin,
             "acos": s.acos, "atan": s.atan, "exp": s.exp, "log": s.log,
             "ln": s.log, "sqrt": s.sqrt, "abs": s.Abs}
DOMAINS = {"real": s.S.Reals, "positive": s.Interval.open(0, s.oo), "complex": s.S.Complexes}

def parse_expression(source, symbols):
    if not isinstance(source, str) or not 0 < len(source.strip()) <= 240:
        raise ValueError("Enter an expression of 1–240 characters.")
    if not re.fullmatch(r"[a-zA-Z0-9+\\-*/^().,\\s]+", source):
        raise ValueError("Only mathematical notation is allowed. Use * for multiplication.")
    source = source.strip().replace("^", "**")
    try:
        tree = ast.parse(source, mode="eval")
    except SyntaxError:
        raise ValueError("Check your expression. Use 2*x, x^2, and sin(x).")
    if sum(1 for _ in ast.walk(tree)) > 110:
        raise ValueError("This expression is too complex. Try a smaller part first.")

    def convert(node, depth=0):
        if depth > 18:
            raise ValueError("Too many nested operations. Try a smaller expression.")
        visit = lambda child: convert(child, depth + 1)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            if not math.isfinite(node.value) or abs(node.value) > 10**9:
                raise ValueError("Use finite numbers no larger than 1,000,000,000.")
            token = ast.get_source_segment(source, node)
            if not re.fullmatch(r"(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?", token):
                raise ValueError("Use decimal numbers, fractions, or scientific notation.")
            return s.Rational(token)
        if isinstance(node, ast.Name):
            if node.id in ("pi", "e", "i"):
                return {"pi": s.pi, "e": s.E, "i": s.I}[node.id]
            if node.id in symbols:
                return symbols[node.id]
            raise ValueError("Use single lowercase variables, pi, e, or i.")
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = visit(node.operand)
            return value if isinstance(node.op, ast.UAdd) else s.Mul(-1, value, evaluate=False)
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Add): return s.Add(left, right, evaluate=False)
            if isinstance(node.op, ast.Sub): return s.Add(left, s.Mul(-1, right, evaluate=False), evaluate=False)
            if isinstance(node.op, ast.Mult): return s.Mul(left, right, evaluate=False)
            if isinstance(node.op, ast.Div):
                if right.is_zero is True: raise ValueError("Division by zero is undefined.")
                return s.Mul(left, s.Pow(right, -1, evaluate=False), evaluate=False)
            if right.is_number and (right.is_real is not True or abs(right) > 100):
                raise ValueError("Use a real numeric exponent between -100 and 100.")
            return s.Pow(left, right, evaluate=False)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS:
            if node.keywords or len(node.args) != 1:
                raise ValueError("Functions take exactly one expression, for example log(x).")
            return FUNCTIONS[node.func.id](visit(node.args[0]), evaluate=False)
        raise ValueError("Unsupported notation. Use arithmetic and the listed mathematical functions.")

    return convert(tree.body)

def calculate(raw_json):
    request = json.loads(raw_json)
    mode, domain, variable = request["operation"], request["domain"], request["variable"]
    if mode not in ("simplify", "differentiate", "integrate", "solve", "equivalence") or domain not in DOMAINS:
        raise ValueError("Choose a supported operation and domain.")
    if not re.fullmatch("[a-z]", variable) or variable in "ei":
        raise ValueError("Choose a single lowercase variable other than e or i.")
    assumptions = {"real": {"real": True}, "positive": {"positive": True}, "complex": {"complex": True}}[domain]
    symbols = {letter: s.Symbol(letter, **assumptions) for letter in "abcdfghjklmnopqrstuvwxyz"}
    x = symbols[variable]
    source = request["expression"]
    if not isinstance(source, str) or len(source) > 240:
        raise ValueError("Keep the expression within 240 characters.")
    notes = ["All variables are " + {"real": "real", "positive": "positive real", "complex": "complex"}[domain] + ". Trigonometric angles are in radians.",
             "Results hold where the original expressions are defined. Simplification can hide excluded points; keep the original restrictions."]
    if mode == "solve":
        if source.count("=") > 1:
            raise ValueError("Enter one equation with one equals sign.")
        parts = source.split("=")
        lhs = parse_expression(parts[0], symbols)
        rhs = parse_expression(parts[1], symbols) if len(parts) == 2 else s.Integer(0)
        expr = s.Add(lhs, s.Mul(-1, rhs, evaluate=False), evaluate=False)
        others = expr.free_symbols - {x}
        if others:
            raise ValueError("This solver handles one variable. Replace other variables with numbers.")
        answer = s.solveset(expr, x, domain=DOMAINS[domain])
        # Keep denominator exclusions from the unevaluated input in every domain.
        for original in (lhs, rhs):
            for node in s.preorder_traversal(original):
                if isinstance(node, s.Pow) and node.exp.is_negative is True:
                    answer = answer - s.solveset(node.base, x, domain=DOMAINS[domain])
        # Exclude original real-domain holes, even if simplification cancels them.
        if domain != "complex":
            try:
                from sympy.calculus.util import continuous_domain
                answer = answer.intersect(continuous_domain(lhs, x, DOMAINS[domain])).intersect(continuous_domain(rhs, x, DOMAINS[domain]))
            except (NotImplementedError, ValueError, TypeError):
                notes.append("Original-domain restrictions could not all be established automatically. Check the equation before accepting candidates.")
        input_latex = s.latex(s.Eq(lhs, rhs, evaluate=False))
        summary = "Solution set for " + variable + " in the selected domain."
        if answer.has(s.ConditionSet): summary = "An unresolved condition remains; this is not a complete explicit solution."
        if answer == s.EmptySet: summary = "There are no solutions in the selected domain."
        notes.append("Braces list solutions; an interval or ImageSet can represent infinitely many solutions.")
    else:
        expr = parse_expression(source, symbols)
        input_latex = s.latex(expr)
        if mode == "simplify":
            answer = s.simplify(expr)
            summary = "A simplified form under your selected assumptions."
            notes.append("Simplification is heuristic: there may be other equally useful forms.")
        elif mode == "differentiate":
            answer = s.diff(expr, x)
            summary = "The first derivative with respect to " + variable + ". Other variables are held constant."
            notes.append("This is a symbolic derivative, valid where the original function is differentiable.")
        elif mode == "integrate":
            answer = s.integrate(expr, x)
            summary = "An antiderivative with respect to " + variable + "; add an arbitrary constant C."
            notes.append("An unevaluated integral means SymPy did not find a closed form. Branches and intervals can affect the antiderivative.")
        else:
            other = parse_expression(request.get("comparison", ""), symbols)
            difference = s.simplify(expr - other)
            answer = difference
            verdict = "equivalent" if difference == 0 else "unknown"
            # A concrete exact counterexample refutes identity; inconclusive algebra stays unknown.
            witness = None
            if verdict == "unknown":
                samples = (1, 2, 3, s.Rational(1, 2)) if domain == "positive" else (-2, -1, 0, 1, 2, s.Rational(1, 2))
                free = sorted((expr.free_symbols | other.free_symbols), key=str)
                for point in samples:
                    subs = {symbol: point for symbol in free}
                    a, b = s.simplify(expr.subs(subs)), s.simplify(other.subs(subs))
                    if a.is_finite is True and b.is_finite is True and s.simplify(a-b).is_zero is False:
                        verdict = "different"
                        witness = ", ".join(str(symbol) + " = " + str(point) for symbol in free) or "these constant expressions"
                        break
            summary = {"equivalent": "The difference simplifies exactly to zero on the common domain.", "different": "These expressions are not identical: a counterexample was found.", "unknown": "The symbolic check is inconclusive. This does not establish equality or inequality."}[verdict]
            if witness: notes.append("Counterexample at " + witness + ".")
            notes.append("This checks expression identity on their common domain, not equation-solving steps or equality of domains.")
            input_latex += r"\\quad \\overset{?}{=} \\quad " + s.latex(other)
    if answer.has(s.zoo, s.nan):
        raise ValueError("The expression is undefined under these assumptions. Check division by zero and function domains.")
    rendered = s.latex(answer)
    plain = str(answer)
    if mode == "integrate": rendered += " + C"; plain += " + C"
    if len(rendered) > 16000 or len(plain) > 16000:
        raise ValueError("The result is too large to display. Try a smaller expression.")
    return json.dumps({"result": plain, "latex": rendered, "inputLatex": input_latex,
                       "summary": summary, "notes": notes, "engine": "SymPy " + s.__version__,
                       **({"verdict": verdict} if mode == "equivalence" else {})})
`),n=!0,self.postMessage({kind:`ready`}),t})(),t}self.onmessage=async({data:e})=>{try{let t=await r();t.globals.set(`request_json`,JSON.stringify(e.request)),self.postMessage({kind:`calculating`,id:e.id});let n=JSON.parse(await t.runPythonAsync(`calculate(request_json)`));t.globals.delete(`request_json`),self.postMessage({kind:`result`,id:e.id,result:n})}catch(t){let r=(t instanceof Error?t.message:String(t)).split(`
`).filter(Boolean).at(-1)||`The calculation could not be completed.`;self.postMessage({kind:`error`,id:e.id,fatal:!n,message:n?r.replace(/^(ValueError|SyntaxError|TypeError):\s*/,``):`The mathematics engine could not load. Check your connection and try again.`})}};
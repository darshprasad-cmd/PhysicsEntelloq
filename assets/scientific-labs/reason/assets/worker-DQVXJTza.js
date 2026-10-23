const e=`https://cdn.jsdelivr.net/pyodide/v314.0.7/full/`;let t,n=!1;async function r(){return t||=(async()=>{self.postMessage({kind:`status`,message:`Downloading the mathematics engine…`});let t=await(await import(
/* @vite-ignore */
`${e}pyodide.mjs`)).loadPyodide({indexURL:e});return self.postMessage({kind:`status`,message:`Loading SymPy…`}),await t.loadPackage(`sympy`),await t.runPythonAsync(`"""Fixed program. User expressions are parsed as data, never evaluated as Python."""\r
import ast\r
import json\r
import math\r
import re\r
import sympy as s\r
\r
FUNCTIONS = {"sin": s.sin, "cos": s.cos, "tan": s.tan, "asin": s.asin,\r
             "acos": s.acos, "atan": s.atan, "exp": s.exp, "log": s.log,\r
             "ln": s.log, "sqrt": s.sqrt, "abs": s.Abs}\r
DOMAINS = {"real": s.S.Reals, "positive": s.Interval.open(0, s.oo), "complex": s.S.Complexes}\r
\r
def parse_expression(source, symbols):\r
    if not isinstance(source, str) or not 0 < len(source.strip()) <= 240:\r
        raise ValueError("Enter an expression of 1–240 characters.")\r
    if not re.fullmatch(r"[a-zA-Z0-9+\\-*/^().,\\s]+", source):\r
        raise ValueError("Only mathematical notation is allowed. Use * for multiplication.")\r
    source = source.strip().replace("^", "**")\r
    try:\r
        tree = ast.parse(source, mode="eval")\r
    except SyntaxError:\r
        raise ValueError("Check your expression. Use 2*x, x^2, and sin(x).")\r
    if sum(1 for _ in ast.walk(tree)) > 110:\r
        raise ValueError("This expression is too complex. Try a smaller part first.")\r
\r
    def convert(node, depth=0):\r
        if depth > 18:\r
            raise ValueError("Too many nested operations. Try a smaller expression.")\r
        visit = lambda child: convert(child, depth + 1)\r
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):\r
            if not math.isfinite(node.value) or abs(node.value) > 10**9:\r
                raise ValueError("Use finite numbers no larger than 1,000,000,000.")\r
            token = ast.get_source_segment(source, node)\r
            if not re.fullmatch(r"(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?", token):\r
                raise ValueError("Use decimal numbers, fractions, or scientific notation.")\r
            return s.Rational(token)\r
        if isinstance(node, ast.Name):\r
            if node.id in ("pi", "e", "i"):\r
                return {"pi": s.pi, "e": s.E, "i": s.I}[node.id]\r
            if node.id in symbols:\r
                return symbols[node.id]\r
            raise ValueError("Use single lowercase variables, pi, e, or i.")\r
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):\r
            value = visit(node.operand)\r
            return value if isinstance(node.op, ast.UAdd) else s.Mul(-1, value, evaluate=False)\r
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow)):\r
            left, right = visit(node.left), visit(node.right)\r
            if isinstance(node.op, ast.Add): return s.Add(left, right, evaluate=False)\r
            if isinstance(node.op, ast.Sub): return s.Add(left, s.Mul(-1, right, evaluate=False), evaluate=False)\r
            if isinstance(node.op, ast.Mult): return s.Mul(left, right, evaluate=False)\r
            if isinstance(node.op, ast.Div):\r
                if right.is_zero is True: raise ValueError("Division by zero is undefined.")\r
                return s.Mul(left, s.Pow(right, -1, evaluate=False), evaluate=False)\r
            if right.is_number and (right.is_real is not True or abs(right) > 100):\r
                raise ValueError("Use a real numeric exponent between -100 and 100.")\r
            return s.Pow(left, right, evaluate=False)\r
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS:\r
            if node.keywords or len(node.args) != 1:\r
                raise ValueError("Functions take exactly one expression, for example log(x).")\r
            return FUNCTIONS[node.func.id](visit(node.args[0]), evaluate=False)\r
        raise ValueError("Unsupported notation. Use arithmetic and the listed mathematical functions.")\r
\r
    return convert(tree.body)\r
\r
def calculate(raw_json):\r
    request = json.loads(raw_json)\r
    mode, domain, variable = request["operation"], request["domain"], request["variable"]\r
    if mode not in ("simplify", "differentiate", "integrate", "solve", "equivalence") or domain not in DOMAINS:\r
        raise ValueError("Choose a supported operation and domain.")\r
    if not re.fullmatch("[a-z]", variable) or variable in "ei":\r
        raise ValueError("Choose a single lowercase variable other than e or i.")\r
    assumptions = {"real": {"real": True}, "positive": {"positive": True}, "complex": {"complex": True}}[domain]\r
    symbols = {letter: s.Symbol(letter, **assumptions) for letter in "abcdfghjklmnopqrstuvwxyz"}\r
    x = symbols[variable]\r
    source = request["expression"]\r
    if not isinstance(source, str) or len(source) > 240:\r
        raise ValueError("Keep the expression within 240 characters.")\r
    notes = ["All variables are " + {"real": "real", "positive": "positive real", "complex": "complex"}[domain] + ". Trigonometric angles are in radians.",\r
             "Results hold where the original expressions are defined. Simplification can hide excluded points; keep the original restrictions."]\r
    if mode == "solve":\r
        if source.count("=") > 1:\r
            raise ValueError("Enter one equation with one equals sign.")\r
        parts = source.split("=")\r
        lhs = parse_expression(parts[0], symbols)\r
        rhs = parse_expression(parts[1], symbols) if len(parts) == 2 else s.Integer(0)\r
        expr = s.Add(lhs, s.Mul(-1, rhs, evaluate=False), evaluate=False)\r
        others = expr.free_symbols - {x}\r
        if others:\r
            raise ValueError("This solver handles one variable. Replace other variables with numbers.")\r
        answer = s.solveset(expr, x, domain=DOMAINS[domain])\r
        # Keep denominator exclusions from the unevaluated input in every domain.\r
        for original in (lhs, rhs):\r
            for node in s.preorder_traversal(original):\r
                if isinstance(node, s.Pow) and node.exp.is_negative is True:\r
                    answer = answer - s.solveset(node.base, x, domain=DOMAINS[domain])\r
        # Exclude original real-domain holes, even if simplification cancels them.\r
        if domain != "complex":\r
            try:\r
                from sympy.calculus.util import continuous_domain\r
                answer = answer.intersect(continuous_domain(lhs, x, DOMAINS[domain])).intersect(continuous_domain(rhs, x, DOMAINS[domain]))\r
            except (NotImplementedError, ValueError, TypeError):\r
                notes.append("Original-domain restrictions could not all be established automatically. Check the equation before accepting candidates.")\r
        input_latex = s.latex(s.Eq(lhs, rhs, evaluate=False))\r
        summary = "Solution set for " + variable + " in the selected domain."\r
        if answer.has(s.ConditionSet): summary = "An unresolved condition remains; this is not a complete explicit solution."\r
        if answer == s.EmptySet: summary = "There are no solutions in the selected domain."\r
        notes.append("Braces list solutions; an interval or ImageSet can represent infinitely many solutions.")\r
    else:\r
        expr = parse_expression(source, symbols)\r
        input_latex = s.latex(expr)\r
        if mode == "simplify":\r
            answer = s.simplify(expr)\r
            summary = "A simplified form under your selected assumptions."\r
            notes.append("Simplification is heuristic: there may be other equally useful forms.")\r
        elif mode == "differentiate":\r
            answer = s.diff(expr, x)\r
            summary = "The first derivative with respect to " + variable + ". Other variables are held constant."\r
            notes.append("This is a symbolic derivative, valid where the original function is differentiable.")\r
        elif mode == "integrate":\r
            answer = s.integrate(expr, x)\r
            summary = "An antiderivative with respect to " + variable + "; add an arbitrary constant C."\r
            notes.append("An unevaluated integral means SymPy did not find a closed form. Branches and intervals can affect the antiderivative.")\r
        else:\r
            other = parse_expression(request.get("comparison", ""), symbols)\r
            difference = s.simplify(expr - other)\r
            answer = difference\r
            verdict = "equivalent" if difference == 0 else "unknown"\r
            # A concrete exact counterexample refutes identity; inconclusive algebra stays unknown.\r
            witness = None\r
            if verdict == "unknown":\r
                samples = (1, 2, 3, s.Rational(1, 2)) if domain == "positive" else (-2, -1, 0, 1, 2, s.Rational(1, 2))\r
                free = sorted((expr.free_symbols | other.free_symbols), key=str)\r
                for point in samples:\r
                    subs = {symbol: point for symbol in free}\r
                    a, b = s.simplify(expr.subs(subs)), s.simplify(other.subs(subs))\r
                    if a.is_finite is True and b.is_finite is True and s.simplify(a-b).is_zero is False:\r
                        verdict = "different"\r
                        witness = ", ".join(str(symbol) + " = " + str(point) for symbol in free) or "these constant expressions"\r
                        break\r
            summary = {"equivalent": "The difference simplifies exactly to zero on the common domain.", "different": "These expressions are not identical: a counterexample was found.", "unknown": "The symbolic check is inconclusive. This does not establish equality or inequality."}[verdict]\r
            if witness: notes.append("Counterexample at " + witness + ".")\r
            notes.append("This checks expression identity on their common domain, not equation-solving steps or equality of domains.")\r
            input_latex += r"\\quad \\overset{?}{=} \\quad " + s.latex(other)\r
    if answer.has(s.zoo, s.nan):\r
        raise ValueError("The expression is undefined under these assumptions. Check division by zero and function domains.")\r
    rendered = s.latex(answer)\r
    plain = str(answer)\r
    if mode == "integrate": rendered += " + C"; plain += " + C"\r
    if len(rendered) > 16000 or len(plain) > 16000:\r
        raise ValueError("The result is too large to display. Try a smaller expression.")\r
    return json.dumps({"result": plain, "latex": rendered, "inputLatex": input_latex,\r
                       "summary": summary, "notes": notes, "engine": "SymPy " + s.__version__,\r
                       **({"verdict": verdict} if mode == "equivalence" else {})})\r
`),n=!0,self.postMessage({kind:`ready`}),t})(),t}self.onmessage=async({data:e})=>{try{let t=await r();t.globals.set(`request_json`,JSON.stringify(e.request)),self.postMessage({kind:`calculating`,id:e.id});let n=JSON.parse(await t.runPythonAsync(`calculate(request_json)`));t.globals.delete(`request_json`),self.postMessage({kind:`result`,id:e.id,result:n})}catch(t){let r=(t instanceof Error?t.message:String(t)).split(`
`).filter(Boolean).at(-1)||`The calculation could not be completed.`;self.postMessage({kind:`error`,id:e.id,fatal:!n,message:n?r.replace(/^(ValueError|SyntaxError|TypeError):\s*/,``):`The mathematics engine could not load. Check your connection and try again.`})}};
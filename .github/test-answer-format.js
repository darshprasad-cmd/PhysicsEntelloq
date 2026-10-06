const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({katex:require('../experience/vendor/katex.min.js')});
for(const file of ['answer-format.js','practice-answers.js'])vm.runInContext(fs.readFileSync(path.join(root,'experience',file),'utf8'),ctx);
const A=ctx.AnswerFormat,P=ctx.PracticeAnswers;
test('Tutor Markdown and all four math delimiters become semantic text and MathML',()=>{
 const result=A.prose('## Range\n\n**Resolve** the velocity. Use \\(v_x=v_0\\cos\\theta\\).\n\n\\[T=\\frac{2v_0\\sin\\theta}{g}\\]\n\n* **Optimal angle**: $\\theta=45^\\circ$.\n\n$$R=\\frac{v_0^2}{g}\\sin(2\\theta)$$\n\n---');
 assert.match(result,/<h4>Range<\/h4>/);assert.match(result,/<strong>Resolve<\/strong>/);assert.match(result,/<ul><li><strong>Optimal angle/);assert.equal((result.match(/<math /g)||[]).length,4);assert.match(result,/<mfrac>/);assert.match(result,/<msub>/);assert.doesNotMatch(result,/\\frac|\\theta|\*\*|\\\[|<annotation/);
});
test('Legacy Solve multiplication, subscripts and powers become mathematics',()=>{
 const result=A.math('v_x = 20 * cos30; h_max = v_y^2 / (2 * g)',true);
 assert.match(result,/×/);assert.match(result,/<msub>/);assert.match(result,/<msubsup>/);assert.doesNotMatch(result,/\*|v_x|h_max|v_y\^2/);
});
test('Untrusted markup and TeX cannot create executable HTML, load images or inject stored tokens',()=>{
 for(const source of ['<script>alert(1)</script><img src=x onerror=alert(1)>','**<svg onload=alert(1)>**','[click](javascript:alert(1))','\u00000\u0000']){
  const out=A.prose(source);assert.doesNotMatch(out,/<script|<img|<svg|<a /);
 }
 for(const source of ['\\href{javascript:alert(1)}{click}','\\includegraphics{https://evil.test/pixel}','\\htmlStyle{color:red}{x}','\\def\\a{\\a}\\a']){
  const out=A.math(source,true);assert.match(out,/could not be typeset/);assert.doesNotMatch(out,/<a |<img|style="color:red/);
 }
});
test('Unsupported or excessively long mathematics preserves an escaped original',()=>{
 for(const s of ['\\notacommand{x}<img src=x>', 'x'.repeat(3000)]){
  const out=A.math(s,true);assert.match(out,/<details/);assert.match(out,/View original equation/);assert.doesNotMatch(out,/<img/);
 }
});
test('Streaming hides unfinished markup and diagram data until it can render a complete block',()=>{
 const a=A.prose('A complete sentence.\n\n\\[T=\\frac{2v',true);assert.match(a,/A complete sentence/);assert.doesNotMatch(a,/\\frac/);
 const b=A.prose('Forces attract.\n\n```physics-diagram\n{"type":"charges",\n\n',true);assert.doesNotMatch(b,/physics-diagram|charges/);
});
test('Observed provider variants repair missing opening math delimiters and render tables and misplaced diagram JSON',()=>{
 const s=A.prose('Range (R \\approx 35.3\\,\\text{m}\\); use (v_{y}=0\\). The height is h_{max}.');
 assert.equal((s.match(/<math /g)||[]).length,3);assert.doesNotMatch(s,/\\approx|\\text|h_\{max\}/);
 const table=A.prose('| Symbol | Meaning |\n|--------|---------|\n| \\(v_0\\) | initial speed |\n| g | acceleration |\n');assert.match(table,/<table>/);assert.match(table,/<th scope="col">Symbol/);assert.match(table,/<math /);
 for(const source of ['```json\n{"type":"projectile-level"}\n```','Diagram\n\n{\n"type":"projectile-level"\n}\n'])assert.match(A.prose(source),/<figure/);
 assert.match(A.math('{"type":"projectile-level"}',true),/<figure/);
 const legacy=A.math('F = 8.9875e9 * abs(q1*q2) / (0.12)^2',true);assert.doesNotMatch(legacy,/could not be typeset/);assert.match(legacy,/<msup>/);assert.match(legacy,/<msub>/);assert.doesNotMatch(legacy,/<mi>e<\/mi>|<mi>a<\/mi><mi>b<\/mi><mi>s<\/mi>/);
 const orphan=A.prose('*If the launch is vertical, use (v_{y0}=v_0\\sin\\theta).\n*If it is horizontal, time 2v_{y0}/g vanishes.');assert.match(orphan,/<ul>/);assert.doesNotMatch(orphan,/\*If|\\sin|v_\{y0\}/);
 const valid=A.prose('The value \\(\\sin(2\\theta)\\) reaches 1.');assert.doesNotMatch(valid,/could not be typeset/);assert.equal((valid.match(/<math /g)||[]).length,1);
});
test('Supported diagrams are labelled schematics and reject arbitrary SVG or unsupported setups',()=>{
 assert.match(A.diagram({type:'projectile-level'}),/equal launch and landing heights/);
 assert.match(A.diagram({type:'charges',q1:3,q2:-5}),/Opposite charges attract/);
 assert.match(A.diagram({type:'charges',q1:3,q2:5}),/Like charges repel/);
 for(const d of [{type:'charges',q1:0,q2:5},{type:'charges',q1:'<script>',q2:5},{type:'free-form',svg:'<svg onload=alert(1)>'}])assert.equal(A.diagram(d),'');
 const result=A.prose('```physics-diagram\n{"type":"charges","q1":3,"q2":-5}\n```');assert.match(result,/<figure/);assert.match(result,/role="img" aria-label=/);assert.doesNotMatch(result,/physics-diagram/);
});
test('Bounded arithmetic grammar handles SI substitutions and operator precedence without evaluation',()=>{
 assert.ok(Math.abs(P.calculate('9e9 * abs(3e-6 * -5e-6) / (0.12^2)')-9.375)<1e-12);
 assert.equal(P.calculate('-2^2'),-4);assert.equal(P.calculate('2^-2'),.25);assert.equal(P.calculate('2^3^2'),512);assert.ok(Math.abs(P.calculate('20*sin(pi/6)')-10)<1e-12);
 for(const s of ['process.exit()','1;alert(1)','1/0','sqrt(-1)','2**4','2foo','('.repeat(30)+'2'+')'.repeat(30),'1e101'])assert.throws(()=>P.calculate(s));
});
test('The reported Coulomb question has correct options, a proper worked solution and an attraction diagram',()=>{
 const q=P.coulomb();assert.equal(q.o[q.a],'9.38 N');P.validate(q);assert.match(A.worked(q),/<mfrac>/);assert.match(A.worked(q),/Why this is correct/);assert.match(A.worked(q),/figcaption/);
});
test('Wrong numerical answers, unit mismatches, ambiguous options and invalid answer indices are rejected',()=>{
 for(const mutate of [q=>q.a=0,q=>q.a=4,q=>q.a=.5,q=>q.o[1]='9.38 m',q=>q.o[2]='9.375 N',q=>q.o[2]=q.o[1],q=>q.verification=null,q=>q.kind='conceptual',q=>q.solution=null]){const q=P.coulomb();mutate(q);assert.throws(()=>P.validate(q));}
});
test('Very small physical values cannot be rounded to zero by an absolute tolerance floor',()=>{
 const q=P.coulomb();q.verification={expression:'9e-20',unit:'N'};q.o=['0 N','9e-20 N','9e-10 N','9e-5 N'];q.a=0;assert.throws(()=>P.validate(q));q.a=1;P.validate(q);
});
test('All offline subject explanations retain the model, equation and physical check',()=>{
 for(const key of ['mechanics','waves','thermo','optics','electrostatics','current','magnetism','modern','quantum','relativity']){
  const q=P.offline({o:['A'],a:0},key),out=A.worked(q);assert.ok(q.e.length>100,key);assert.match(out,/<math /);assert.doesNotMatch(out,/could not be typeset/);assert.match(out,/Model and assumptions/);assert.match(out,/>Check</);
 }
});
test('The shared formatter is embedded once before tutor use and the numerical guard before practice use',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal(html.split('var AnswerFormat=').length,2);assert.ok(html.indexOf('var AnswerFormat=')<html.indexOf('var Tutor='));assert.ok(html.indexOf('var PracticeAnswers=')<html.indexOf('var Practice='));
 assert.doesNotMatch(html,/never LaTeX|one-sentence explanation|bd\.textContent=acc/);
});

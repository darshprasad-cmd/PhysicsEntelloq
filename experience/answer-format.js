/* Shared answer typography. Input is untrusted text, never provider HTML.
 * KaTeX 0.19.0 is bundled; native MathML needs no network fonts or CDN. */
var AnswerFormat=(function(){
  var LIMIT=30000;
  function escape(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function text(s){return String(s==null?'':s).slice(0,LIMIT);}
  function diagramText(s){try{var d=JSON.parse(s);return diagram(d);}catch(e){return '';}}
  function legacy(s){
    function calls(value,depth){
      if(depth>12)return value;
      var re=/\b(sqrt|abs)\(/g,m,out='',last=0;
      while((m=re.exec(value))){var start=re.lastIndex,end=start,n=1;while(end<value.length&&n){if(value[end]==='(')n++;if(value[end]===')')n--;end++;}if(n)break;
        var inside=calls(value.slice(start,end-1),depth+1);out+=value.slice(last,m.index)+(m[1]==='sqrt'?'\\sqrt{'+inside+'}':'\\left|'+inside+'\\right|');last=end;re.lastIndex=end;
      }return out+value.slice(last);
    }
    return calls(s,0).replace(/\b((?:\d+(?:\.\d*)?|\.\d+))e([+-]?\d+)\b/gi,'$1\\times10^{$2}')
      .replace(/\*/g,'\\times ').replace(/\b(sin|cos|tan|ln|log)(?=\s|\d|\()/g,'\\$1 ')
      .replace(/\b([A-Za-z])(\d+)\b/g,'$1_{$2}').replace(/_([a-zA-Z]{2,})/g,'_{\\mathrm{$1}}').replace(/\^([+-]?\d+(?:\.\d+)?)/g,'^{$1}');
  }
  function math(s,display){
    s=text(s).trim().replace(/^\$\$([\s\S]*)\$\$$/,'$1').replace(/^\\\[([\s\S]*)\\\]$/,'$1').replace(/^\\\(([\s\S]*)\\\)$/,'$1');
    if(!s)return '';
    var schematic=diagramText(s);if(schematic)return schematic;
    var tex=s.indexOf('\\')<0?legacy(s):s;
    try{
      if(s.length>2500||/\\(?:href|url|includegraphics|html\w*|def|gdef|newcommand|renewcommand|let|global)\b/.test(tex))throw Error('unsupported');
      var out=katex.renderToString(tex,{output:'mathml',displayMode:!!display,throwOnError:true,trust:false,strict:'ignore',maxExpand:200,maxSize:10,macros:{}});
      // Source annotations are not needed for display or screen-reader MathML.
      out=out.replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/g,'');
      return '<span class="answer-math'+(display?' answer-display':'')+'"'+(display?' tabindex="0" role="group" aria-label="Equation; scroll horizontally if needed"':'')+'>'+out+'</span>';
    }catch(e){
      // Never silently delete a failed equation or show a made-up replacement.
      return '<span class="answer-math-error" title="'+escape(s)+'">Equation could not be typeset.</span>'+(display?'<details class="answer-source"><summary>View original equation</summary><code>'+escape(s)+'</code></details>':'');
    }
  }
  function inline(s){
    var tokens=[];
    // Replace input sentinels first: untrusted text cannot refer to a stored token.
    s=text(s).replace(/\u0000/g,'');
    function capture(_,a,b){var i=tokens.length;tokens.push(math(a==null?b:a,false));return '\u0000'+i+'\u0000';}
    // Protect valid math before attempting repairs on remaining prose. Otherwise
    // parentheses inside sin(2 theta), matrices, etc. can be mistaken for delimiters.
    s=s.replace(/\\\(([\s\S]*?)\\\)|\$([^$\n]+)\$/g,capture);
    // A common provider typo is a plain opening parenthesis with a TeX closing
    // delimiter. Repair that bounded pair, not arbitrary prose parentheses.
    s=s.replace(/(^|[^\\])\(([^()\n]*?)\\\)/g,'$1\\($2\\)');
    s=s.replace(/(^|[^\\])\(([^()\n]*\\[A-Za-z]+[^()\n]*)\)/g,'$1\\($2\\)');
    s=s.replace(/\\\(([\s\S]*?)\\\)|\$([^$\n]+)\$/g,capture);
    s=s.replace(/(?<![A-Za-z\\])[A-Za-z](?:_(?:\{[A-Za-z0-9]+\}|[A-Za-z0-9]+)|\^(?:\{[+-]?\d+\}|[+-]?\d+))+/g,function(value){var i=tokens.length;tokens.push(math(value,false));return '\u0000'+i+'\u0000';});
    s=escape(s).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_\n]+)__/g,'<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s.,;:)])/g,'$1<em>$2</em>').replace(/`([^`\n]+)`/g,'<code>$1</code>');
    return s.replace(/\u0000(\d+)\u0000/g,function(_,i){return tokens[+i]||'';});
  }
  function prose(s,partial){
    s=text(s).replace(/\r\n?/g,'\n').replace(/\u0000/g,'').replace(/^\*([A-Z][^\n*]+)$/gm,'* $1');
    if(partial){
      // Buffer unfinished paragraphs, math and diagram fences during streaming.
      var end=s.lastIndexOf('\n\n');s=end<0?'':s.slice(0,end);
      ['```','\\[','\\('].forEach(function(open){var close=open==='\\['?'\\]':open==='\\('?'\\)':open;var a=s.lastIndexOf(open);if(a>=0&&(open===close?(s.split(open).length%2===0):s.lastIndexOf(close)<a))s=s.slice(0,a);});
    }
    var blocks=[];
    s=s.replace(/```([^\n]*)\n([\s\S]*?)```|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g,function(_,lang,code,a,b){
      var html;
      if(code!=null){
        if(lang.trim()==='physics-diagram')html=diagramText(code);
        else if(/^(json)?$/i.test(lang.trim())&&diagramText(code))html=diagramText(code);
        else if(/^(?:math|latex|tex)$/i.test(lang.trim()))html=math(code,true);
        else html='<pre><code>'+escape(code)+'</code></pre>';
      }else html=math(a==null?b:a,true);
      var i=blocks.length;blocks.push(html||'<p class="answer-note">The diagram could not be drawn from this description.</p>');return '\n\n\u0000'+i+'\u0000\n\n';
    });
    // Providers occasionally emit a bare diagram descriptor or a Markdown
    // table. Both are rendered using our own closed markup, never raw HTML.
    s=s.replace(/^\s*\{\s*"type"\s*:[^{}]*\}\s*$/gm,function(source){var html=diagramText(source);if(!html)return source;var i=blocks.length;blocks.push(html);return '\n\n\u0000'+i+'\u0000\n\n';});
    s=s.replace(/^\|[^\n]+\|\n\|[\s:|\-]+\|\n(?:\|[^\n]+\|(?:\n|$))+/gm,function(source){
      var rows=source.trim().split('\n').slice(0,32).map(function(row){return row.replace(/^\||\|$/g,'').split(/(?<!\\)\|/).slice(0,8).map(function(cell){return inline(cell.trim().replace(/\\\|/g,'|'));});});
      var html='<div class="answer-table" tabindex="0" role="group" aria-label="Answer table; scroll horizontally if needed"><table><thead><tr>'+rows[0].map(function(c){return '<th scope="col">'+c+'</th>';}).join('')+'</tr></thead><tbody>'+rows.slice(2).map(function(row){return '<tr>'+row.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
      var i=blocks.length;blocks.push(html);return '\n\n\u0000'+i+'\u0000\n\n';
    });
    var lines=s.split('\n'),out=[],para=[],list=[],kind='';
    function flushP(){if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[];}}
    function flushL(){if(list.length){out.push('<'+kind+'>'+list.map(function(x){return '<li>'+inline(x)+'</li>';}).join('')+'</'+kind+'>');list=[];kind='';}}
    lines.forEach(function(line){
      var block=/^\u0000(\d+)\u0000$/.exec(line.trim()),heading=/^\s{0,3}#{1,6}\s+(.+)$/.exec(line),item=/^\s*(?:([-*•])\s+|\d+[.)]\s+)(.+)$/.exec(line);
      if(block){flushP();flushL();out.push(blocks[+block[1]]);}
      else if(heading){flushP();flushL();out.push('<h4>'+inline(heading[1])+'</h4>');}
      else if(/^\s*(?:---+|\*\*\*+)\s*$/.test(line)){flushP();flushL();out.push('<hr>');}
      else if(item){flushP();var k=item[1]?'ul':'ol';if(kind&&kind!==k)flushL();kind=k;list.push(item[2]);}
      else if(!line.trim()){flushP();flushL();}
      else{flushL();para.push(line.trim());}
    });flushP();flushL();
    return '<div class="answer-prose">'+out.join('')+'</div>';
  }
  function diagram(d){
    if(!d||typeof d!=='object')return '';
    var body='',caption='',label='';
    function line(x,y,a,b,arrow){return '<path d="M'+x+' '+y+' L'+a+' '+b+'" fill="none" stroke="currentColor" stroke-width="2"/>'+(arrow?'<path d="M-7 -4 L0 0 L-7 4" fill="none" stroke="currentColor" stroke-width="2" transform="translate('+a+' '+b+') rotate('+(Math.atan2(b-y,a-x)*180/Math.PI)+')"/>':'');}
    function t(x,y,s){return '<text x="'+x+'" y="'+y+'" fill="currentColor">'+escape(s)+'</text>';}
    if(d.type==='projectile-level'){
      label='Level-ground projectile: launch velocity has horizontal and vertical components; gravity acts downward.';
      caption='Schematic, not to scale. Uniform gravity, no air resistance, and equal launch and landing heights. Horizontal velocity stays constant; vertical velocity changes.';
      body=line(35,190,420,190,true)+line(45,200,45,30,true)+'<path d="M45 190 Q225 -95 405 190" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 5"/>'+
        line(45,190,112,94,true)+line(45,190,112,190,true)+line(112,190,112,94,true)+line(260,52,260,110,true)+t(66,96,'v₀')+t(112,211,'v₀ cos θ')+t(123,146,'v₀ sin θ')+t(272,95,'g')+t(32,24,'y')+t(425,195,'x')+t(190,236,'range R');
    }else if(d.type==='charges'&&Number.isFinite(d.q1)&&Number.isFinite(d.q2)&&d.q1!==0&&d.q2!==0){
      var opposite=(d.q1>0)!==(d.q2>0);
      label='Two point charges: '+(opposite?'opposite charges attract':'like charges repel')+'. The forces are equal and opposite.';
      caption='Schematic, not to scale. '+(opposite?'Opposite charges attract.':'Like charges repel.')+' Each charge experiences an equal-magnitude force along the line joining them.';
      body='<circle cx="115" cy="95" r="27" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="335" cy="95" r="27" fill="none" stroke="currentColor" stroke-width="2"/>'+t(108,101,d.q1>0?'+':'−')+t(328,101,d.q2>0?'+':'−')+
        (opposite?line(146,95,208,95,true)+line(304,95,242,95,true):line(83,95,35,95,true)+line(367,95,415,95,true))+
        t(104,51,'q₁')+t(324,51,'q₂')+t(opposite?177:45,80,'F')+t(opposite?270:394,80,'F')+line(115,150,335,150,false)+line(115,144,115,156,false)+line(335,144,335,156,false)+t(201,177,'r');
    }else return '';
    return '<figure class="answer-diagram"><svg viewBox="0 0 450 250" role="img" aria-label="'+escape(label)+'"><title>'+escape(label)+'</title>'+body+'</svg><figcaption>'+escape(caption)+'</figcaption></figure>';
  }
  function section(title,value){return value?'<section class="answer-section"><h4>'+escape(title)+'</h4>'+prose(value)+'</section>':'';}
  function worked(q){
    var s=q.solution||{};
    return '<div class="worked-answer">'+section('Answer',q.o&&q.o[q.a])+section('Why this is correct',q.e)+
      section('Model and assumptions',s.assumptions)+diagram(s.diagram)+
      (Array.isArray(s.steps)?'<ol class="answer-steps">'+s.steps.slice(0,8).map(function(step){return '<li>'+prose(step.reason||'')+(step.math?math(step.math,true):'')+'</li>';}).join('')+'</ol>':'')+
      section('Check',s.check)+'</div>';
  }
  var instruction=' Write a polished textbook answer, not notes or a transcript. Lead with the result or principle, then explain the physical cause and justify each essential step in complete sentences. State assumptions and signs, define symbols, substitute SI units, retain precision until the final result, and check dimensions and plausibility. Do not claim to have verified something you have not checked. Use short paragraphs and useful headings, no decorative asterisks or emoji. Use LaTeX inside \\( ... \\) for inline mathematics and \\[ ... \\] for display equations; never put an equation in a code block. In JSON escape backslashes correctly. Provide an explanatory solution, not private internal deliberation.';
  var diagramInstruction=' When a diagram materially explains the answer, you may use a fenced physics-diagram JSON block: {"type":"projectile-level"} ONLY for level-ground motion in uniform gravity without drag, or {"type":"charges","q1":3,"q2":-5} for two point charges (q1 and q2 determine signs). These are labelled schematics, not quantitative plots. For other setups explain the geometry clearly in words; never invent an unsupported diagram or output SVG/HTML.';
  return {prose:prose,inline:inline,math:math,diagram:diagram,worked:worked,instruction:instruction,diagramInstruction:diagramInstruction};
})();

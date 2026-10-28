/* Display-only, exact reversible hooks. No solver or camera-input changes. */
const hooks=[
  [
    'Hd=Math.max(r.height,40),pr=Math.min(devicePixelRatio||1,1.5);',
    'Hd=Math.max(r.height,40),lowDetail=(navigator.deviceMemory>0&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4),pr=Math.min(devicePixelRatio||1,lowDetail?1.5:2,Math.sqrt((lowDetail?2000000:4000000)/(Wd*Hd)));'
  ],
  [
    '<span aria-hidden="true">⌕</span><span class="pe-search-label">',
    '<svg class="pe-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><span class="pe-search-label">'
  ]
];
function change(text,undo){
  for(const [before,after] of hooks){
    const from=undo?after:before,to=undo?before:after;
    if(!undo&&text.includes(after))continue;
    if(text.split(from).length!==2)throw Error('Ambiguous precision display hook: '+from);
    text=text.replace(from,to);
  }
  return text;
}
module.exports={apply:text=>change(text,false),revert:text=>change(text,true)};

/* Rendering consumes scene/model outputs only. No guessed pixels or simulated detections. */
var CameraPhysicsRendering=(function(){
  'use strict';
  var links=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  function paint(canvas,tracks,hands,selected,analysis){var w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;var dpr=Math.min(window.devicePixelRatio||1,2),ctx=canvas.getContext('2d');if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.lineWidth=1;ctx.strokeStyle='rgba(167,209,237,.65)';
    (hands||[]).forEach(function(hand){links.forEach(function(pair){var a=hand.landmarks[pair[0]],b=hand.landmarks[pair[1]];if(!a||!b)return;ctx.beginPath();ctx.moveTo((1-a.x)*w,a.y*h);ctx.lineTo((1-b.x)*w,b.y*h);ctx.stroke();});});
    function label(text,x,y,color){ctx.font='500 12px system-ui';var tw=ctx.measureText(text).width;x=Math.max(8,Math.min(w-tw-20,x));y=Math.max(23,Math.min(h-12,y));ctx.fillStyle='rgba(5,13,21,.94)';ctx.fillRect(x-5,y-15,tw+12,23);ctx.fillStyle=color||'#e4edf7';ctx.fillText(text,x,y);}
    tracks.forEach(function(t){var b=CameraPhysicsCore.project(t.bbox,w,h,true),chosen=t.id===selected,c=chosen?'#b8d7ff':'#9ab2c7';ctx.globalAlpha=t.stale ? .45 : 1;ctx.strokeStyle=c;ctx.lineWidth=chosen?2:1;var k=Math.min(18,b.w/3,b.h/3);ctx.beginPath();[[b.x,b.y,1,1],[b.x+b.w,b.y,-1,1],[b.x,b.y+b.h,1,-1],[b.x+b.w,b.y+b.h,-1,-1]].forEach(function(p){ctx.moveTo(p[0]+k*p[2],p[1]);ctx.lineTo(p[0],p[1]);ctx.lineTo(p[0],p[1]+k*p[3]);});ctx.stroke();label(t.object_class+' · '+Math.round(t.score*100)+'%',b.x,b.y-10,c);
      if(chosen&&analysis){var x=b.x+b.w/2,y=b.y+b.h/2,len=Math.min(85,Math.max(42,h*.18));analysis.forces.forEach(function(f,i){var dx=f.direction.x,dy=f.direction.y,ex=Math.max(24,Math.min(w-24,x+dx*len)),ey=Math.max(27,Math.min(h-28,y+dy*len));var color=f.id==='weight'?'#f2c38f':f.id==='friction'?'#e1c0fa':'#aed6ff';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.setLineDash(f.id==='weight'?[]:[5,4]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();ctx.setLineDash([]);var angle=Math.atan2(ey-y,ex-x);ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-10*Math.cos(angle-.4),ey-10*Math.sin(angle-.4));ctx.lineTo(ex-10*Math.cos(angle+.4),ey-10*Math.sin(angle+.4));ctx.closePath();ctx.fill();label(f.label,ex+(dx<0?-36:9),ey+(dy>0?15:-8),color);});ctx.fillStyle='#f1f6fd';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
    });
  }
  return {paint:paint};
})();

export class CandleChart {
 constructor(canvas,tooltip){this.canvas=canvas;this.tooltip=tooltip;this.result=null;this.count=100;this.offset=0;this.hover=null;this.pointerX=null;this.drawBound=this.draw.bind(this);this.ro=new ResizeObserver(this.drawBound);this.ro.observe(canvas.parentElement);
 canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();this.pointerX=e.clientX-r.left;this.tooltip.style.left=Math.min(r.width-190,Math.max(5,this.pointerX+15))+'px';this.tooltip.style.top=Math.max(12,e.clientY-r.top-60)+'px';this.draw();});
 canvas.addEventListener('pointerleave',()=>{this.pointerX=null;this.tooltip.classList.add('hidden');this.draw();});
 let down=null;
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,at:this.offset};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointerup',()=>down=null);
 canvas.addEventListener('pointercancel',()=>down=null);
 canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x;const step=Math.max(4,(canvas.clientWidth-76)/this.count);this.offset=Math.max(0,Math.min(Math.max(0,(this.result?.bars.length||0)-this.count),down.at+Math.round(dx/step)));this.draw();});
 canvas.addEventListener('wheel',e=>{e.preventDefault();this.count=Math.max(25,Math.min(300,this.count+(e.deltaY>0?20:-20)));this.offset=0;this.draw();},{passive:false});
 }
 setData(result){this.result=result;this.draw();}
 setCount(n){this.count=Math.max(25,Math.min(300,n));this.offset=0;this.draw();}
 draw(){const canvas=this.canvas,rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3),width=rect.width,height=rect.height;if(!width||!height)return;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
 const bars=this.result?.bars||[];if(!bars.length)return;const snaps=this.result.snapshots,marks=this.result.marks,until=Math.max(0,bars.length-this.offset),from=Math.max(0,until-this.count),range=bars.slice(from,until),left=9,right=65,top=17,bottom=31,cw=width-left-right,ch=height-top-bottom;if(!range.length||cw<=0||ch<=0)return;
 const pad=(Math.max(...range.map(v=>v.high))-Math.min(...range.map(v=>v.low)))*.07||.01,lo=Math.min(...range.map(v=>v.low))-pad,hi=Math.max(...range.map(v=>v.high))+pad,step=cw/range.length,xOf=i=>left+(i+.5)*step,yOf=v=>top+(hi-v)/(hi-lo)*ch;
 ctx.font='10px system-ui';ctx.textBaseline='middle';ctx.lineWidth=1;for(let k=0;k<=5;k++){const val=hi-(hi-lo)*k/5,y=yOf(val);ctx.strokeStyle='#1c3446';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(width-right+5,y);ctx.stroke();ctx.fillStyle='#7d92a8';ctx.textAlign='right';ctx.fillText(val.toLocaleString('en-US',{maximumFractionDigits:val>100?2:6}),width-3,y);}
 for(let j=0;j<range.length;j++){const bar=range[j],x=xOf(j),isUp=bar.close>=bar.open,col=isUp?'#1ece9a':'#fa697d';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=Math.max(1,Math.min(2,step*.15));ctx.beginPath();ctx.moveTo(x,yOf(bar.high));ctx.lineTo(x,yOf(bar.low));ctx.stroke();const y1=yOf(bar.open),y2=yOf(bar.close),bwidth=Math.max(1.1,Math.min(12,step*.65));ctx.fillRect(x-bwidth/2,Math.min(y1,y2),bwidth,Math.max(1,Math.abs(y2-y1)));
 const snap=snaps[from+j];if(snap?.side){const long=snap.side==='LONG',arrowY=long?Math.min(height-bottom-8,yOf(bar.low)+12):Math.max(top+8,yOf(bar.high)-12);ctx.fillStyle=long?'#8bf7d1':'#ffb0bc';ctx.beginPath();if(long){ctx.moveTo(x,arrowY-7);ctx.lineTo(x-5,arrowY+3);ctx.lineTo(x+5,arrowY+3);}else{ctx.moveTo(x,arrowY+7);ctx.lineTo(x-5,arrowY-3);ctx.lineTo(x+5,arrowY-3);}ctx.fill();}
 if(snap?.zoneLow!=null&&snap.zoneHigh!=null&&j>0){ctx.fillStyle=snap.state.includes('LONG')?'#20cda115':'#ff647515';ctx.fillRect(x-step/2,yOf(snap.zoneHigh),step,Math.max(1,yOf(snap.zoneLow)-yOf(snap.zoneHigh)));}
 }
 const labelEvery=Math.max(1,Math.ceil(range.length/6));ctx.fillStyle='#6e839b';ctx.font='10px system-ui';ctx.textAlign='center';for(let i=0;i<range.length;i+=labelEvery){const d=new Date(range[i].time),label=d.getUTCDate()+' '+d.toLocaleTimeString('tr-TR',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'});ctx.fillText(label,xOf(i),height-13);}
 // Price line uses last *confirmed* close, not an interim websocket trade.
 const latest=range.at(-1),closeY=yOf(latest.close);ctx.setLineDash([3,5]);ctx.strokeStyle='#73b6d280';ctx.beginPath();ctx.moveTo(left,closeY);ctx.lineTo(width-right,closeY);ctx.stroke();ctx.setLineDash([]);
 if(this.pointerX!=null){const selected=Math.max(0,Math.min(range.length-1,Math.floor((this.pointerX-left)/step))),bar=range[selected],x=xOf(selected);ctx.setLineDash([3,4]);ctx.strokeStyle='#b8cfe86b';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,height-bottom);ctx.stroke();ctx.setLineDash([]);this.tooltip.classList.remove('hidden');this.tooltip.textContent=new Date(bar.time).toISOString().replace('T',' ').slice(0,19)+' UTC · O '+bar.open+' H '+bar.high+' L '+bar.low+' C '+bar.close+' V '+bar.volume;}
 // Signals represent entries only; finished trades are listed separately in the history tab.
 }
}